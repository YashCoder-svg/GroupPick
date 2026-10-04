import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Place } from '../models/Place.js';
import { fetchPlacesFromOverpass } from './overpassService.js';
import { searchDestinations, POPULAR_INDIAN_DESTINATIONS } from './destinationsService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory geocode cache
const geocodeCache = new Map();

/**
 * Ensures fallback seed places for the 10 Indian cities are imported into MongoDB
 */
export const ensureSeedPlaces = async () => {
  try {
    await Place.createIndexes();
    const count = await Place.countDocuments();
    if (count > 0) {
      return count;
    }

    const fallbackPath = path.resolve(__dirname, '../data/fallbackPlaces.json');
    if (fs.existsSync(fallbackPath)) {
      const rawData = fs.readFileSync(fallbackPath, 'utf8');
      const places = JSON.parse(rawData);
      await Place.insertMany(places);
      console.log(`[Seed] Successfully seeded ${places.length} initial Indian places into MongoDB`);
      return places.length;
    }
  } catch (err) {
    console.error('[Seed Error] Failed to ensure seed places:', err.message);
  }
  return 0;
};

/**
 * Resolves coordinates for a destination name
 */
export const resolveCoordinates = async (cityName = 'Delhi') => {
  const normalized = cityName.toLowerCase().trim();
  if (geocodeCache.has(normalized)) {
    return geocodeCache.get(normalized);
  }

  // 1. Check popular destinations list
  const popular = POPULAR_INDIAN_DESTINATIONS.find(
    (d) => d.name.toLowerCase() === normalized
  );
  if (popular) {
    const coords = { lat: popular.lat, lng: popular.lng, name: popular.name, state: popular.state };
    geocodeCache.set(normalized, coords);
    return coords;
  }

  // 2. Query Photon geocoder
  try {
    const results = await searchDestinations(cityName, 1);
    if (results && results.length > 0) {
      const best = results[0];
      const coords = { lat: best.lat, lng: best.lng, name: best.name, state: best.state };
      geocodeCache.set(normalized, coords);
      return coords;
    }
  } catch (err) {
    console.warn(`[Resolve Coordinates] Error resolving '${cityName}': ${err.message}`);
  }

  // 3. Fallback to Delhi coordinates
  const fallback = { lat: 28.6139, lng: 77.209, name: 'Delhi', state: 'Delhi' };
  geocodeCache.set(normalized, fallback);
  return fallback;
};

/**
 * Fetch places for any destination in India.
 * Checks MongoDB 2dsphere cache (7-day TTL). If missing, queries Overpass API,
 * caches results in MongoDB, and falls back to seed data if Overpass is down.
 */
export const getPlacesForDestination = async ({
  destinationName = '',
  lat = null,
  lng = null,
  radius = 5000,
  packType = 'food',
  query = '',
  limit = 30,
}) => {
  await ensureSeedPlaces();

  let targetLat = typeof lat === 'number' ? lat : null;
  let targetLng = typeof lng === 'number' ? lng : null;
  let resolvedName = destinationName ? destinationName.trim() : 'Delhi';

  if (targetLat === null || targetLng === null) {
    const coords = await resolveCoordinates(resolvedName);
    targetLat = coords.lat;
    targetLng = coords.lng;
    if (!destinationName) resolvedName = coords.name;
  }

  const radiusMeters = Math.min(Math.max(parseInt(radius, 10) || 5000, 1000), 25000);

  // 1. Query MongoDB 2dsphere Cache
  const geoFilter = {
    location: {
      $nearSphere: {
        $geometry: {
          type: 'Point',
          coordinates: [targetLng, targetLat],
        },
        $maxDistance: radiusMeters,
      },
    },
  };

  if (packType && packType !== 'both') {
    geoFilter.$or = [{ packType }, { packType: 'both' }];
  }

  if (query && query.trim().length > 0) {
    const qRegex = new RegExp(query.trim(), 'i');
    geoFilter.$and = [
      {
        $or: [{ name: qRegex }, { category: qRegex }, { tags: qRegex }, { attributes: qRegex }],
      },
    ];
  }

  let cachedPlaces = [];
  try {
    cachedPlaces = await Place.find(geoFilter).limit(limit);
  } catch (dbErr) {
    console.warn(`[PlacesCache] Geo query warning: ${dbErr.message}`);
  }

  // If geo returned few or no places, check destinationName / city regex match
  if (cachedPlaces.length === 0 && resolvedName) {
    const nameFilter = {
      $or: [
        { destinationName: new RegExp(`^${resolvedName}$`, 'i') },
        { city: new RegExp(`^${resolvedName}$`, 'i') },
      ],
    };
    if (packType && packType !== 'both') {
      nameFilter.$and = [{ $or: [{ packType }, { packType: 'both' }] }];
    }
    const namePlaces = await Place.find(nameFilter).limit(limit);
    if (namePlaces.length > cachedPlaces.length) {
      cachedPlaces = namePlaces;
    }
  }

  // 2. Cache Hit! (served from cache, log it)
  if (cachedPlaces.length > 0) {
    console.log(
      `[PlacesCache] Cache hit for destination: ${resolvedName} (${targetLat.toFixed(4)}, ${targetLng.toFixed(4)}) - Found ${cachedPlaces.length} places`
    );
    return {
      places: cachedPlaces,
      source: 'cache',
      radius: radiusMeters,
      count: cachedPlaces.length,
      destination: { name: resolvedName, lat: targetLat, lng: targetLng },
      suggestion:
        cachedPlaces.length < 5
          ? 'Fewer than 5 places found. Widen the search radius to 15 km or add your own options using Custom Pack.'
          : null,
    };
  }

  // 3. Cache Miss: Fetch from Overpass API
  console.log(
    `[PlacesCache] Cache miss for destination: ${resolvedName}. Fetching from Overpass API (radius: ${radiusMeters}m)...`
  );

  let overpassPlaces = [];
  try {
    overpassPlaces = await fetchPlacesFromOverpass({
      lat: targetLat,
      lng: targetLng,
      radius: radiusMeters,
      packType,
      cityName: resolvedName,
    });
  } catch (err) {
    console.warn(`[Overpass Fetch] Warning: ${err.message}`);
  }

  if (overpassPlaces && overpassPlaces.length > 0) {
    console.log(`[Overpass] Fetched ${overpassPlaces.length} places. Caching in MongoDB with 7-day TTL...`);
    const inserted = [];
    for (const p of overpassPlaces) {
      try {
        const placeDoc = await Place.findOneAndUpdate(
          {
            $or: [
              { osmId: p.osmId },
              { name: p.name, 'location.coordinates': p.location.coordinates },
            ],
          },
          {
            ...p,
            destinationName: resolvedName,
            cachedAt: new Date(),
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        inserted.push(placeDoc);
      } catch (err) {
        // Continue if single place duplicate key
      }
    }

    if (inserted.length > 0) {
      return {
        places: inserted,
        source: 'overpass',
        radius: radiusMeters,
        count: inserted.length,
        destination: { name: resolvedName, lat: targetLat, lng: targetLng },
      };
    }
  }

  // 4. Overpass returned < 5 or is offline: Check offline fallback data
  console.log(`[PlacesFallback] Checking fallback dataset for ${resolvedName}...`);
  const fallbackPath = path.resolve(__dirname, '../data/fallbackPlaces.json');
  if (fs.existsSync(fallbackPath)) {
    const allFallback = JSON.parse(fs.readFileSync(fallbackPath, 'utf8'));
    const matched = allFallback.filter(
      (p) =>
        (p.city.toLowerCase() === resolvedName.toLowerCase() ||
          p.name.toLowerCase().includes(resolvedName.toLowerCase())) &&
        (packType === 'both' || p.packType === packType || p.packType === 'both')
    );

    if (matched.length > 0) {
      return {
        places: matched,
        source: 'fallback',
        radius: radiusMeters,
        count: matched.length,
        destination: { name: resolvedName, lat: targetLat, lng: targetLng },
      };
    }
  }

  // 5. Sparse results: Return whatever was found with friendly suggestion
  return {
    places: cachedPlaces,
    source: 'sparse',
    radius: radiusMeters,
    count: cachedPlaces.length,
    destination: { name: resolvedName, lat: targetLat, lng: targetLng },
    suggestion:
      cachedPlaces.length < 5
        ? 'Fewer than 5 places found. Widen the search radius to 15 km or add your own options using Custom Pack.'
        : null,
  };
};

/**
 * Legacy search compatibility wrapper for engine & existing endpoints
 */
export const searchPlaces = async ({
  city = 'Delhi',
  destinationName = '',
  lat = null,
  lng = null,
  packType = 'food',
  query = '',
  radius = 5000,
  limit = 30,
}) => {
  const result = await getPlacesForDestination({
    destinationName: destinationName || city,
    lat,
    lng,
    radius,
    packType,
    query,
    limit,
  });

  return result.places || [];
};

/**
 * Report an actual price paid by a user for a place
 */
export const reportPlacePrice = async ({ placeId, amount, reportedBy = 'anonymous' }) => {
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    throw new Error('Valid price amount in INR is required');
  }

  const place = await Place.findById(placeId);
  if (!place) {
    throw new Error('Place not found');
  }

  await place.recordPriceReport(numAmount, reportedBy);
  return place;
};

/**
 * City geocoding helper (maintained for compatibility)
 */
export const geocodeCity = async (cityName = 'Delhi') => {
  const coords = await resolveCoordinates(cityName);
  return {
    lat: coords.lat,
    lng: coords.lng,
    displayName: `${coords.name}, ${coords.state || 'India'}`,
  };
};
