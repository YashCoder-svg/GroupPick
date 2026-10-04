/**
 * Overpass API Service
 * Handles querying OpenStreetMap Overpass API for places around an Indian destination,
 * serialization queue with rate limiting, exponential backoff, endpoint rotation,
 * normalization, priceTier derivation, and near-identical name deduplication (<50m).
 */

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
];

let currentEndpointIndex = 0;

// Sequential queue state for Overpass requests
let queuePromise = Promise.resolve();
const MIN_REQUEST_INTERVAL_MS = 1200;
let lastRequestTimestamp = 0;

/**
 * Calculates Haversine distance between two coordinates in meters
 */
export const haversineDistanceMeters = (lon1, lat1, lon2, lat2) => {
  const R = 6371e3; // Earth radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Derives price tier and estimated INR cost based on tags and category
 * street food and dhaba -> 1, cafe -> 2, restaurant -> 2-3, hotel/resort -> 3-4
 */
export const derivePriceInfo = (category, tags = {}, packType = 'food') => {
  const catLower = (category || '').toLowerCase();
  const cuisine = (tags.cuisine || '').toLowerCase();
  const amenity = (tags.amenity || '').toLowerCase();
  const tourism = (tags.tourism || '').toLowerCase();

  // 1. Stays
  if (tourism === 'hotel' || catLower.includes('hotel') || catLower.includes('resort')) {
    const isLuxury =
      tags.stars >= 4 ||
      catLower.includes('resort') ||
      catLower.includes('palace') ||
      catLower.includes('luxury');
    return {
      priceTier: isLuxury ? 4 : 3,
      estimatedCostPerPerson: isLuxury ? 2800 : 1500,
    };
  }

  if (tourism === 'guest_house' || tourism === 'hostel' || catLower.includes('hostel')) {
    return {
      priceTier: 2,
      estimatedCostPerPerson: 650,
    };
  }

  // 2. Sights / Culture (Trip Pack)
  if (
    packType === 'trip' ||
    tourism === 'attraction' ||
    tourism === 'viewpoint' ||
    tourism === 'museum' ||
    tags.historic ||
    tags.leisure === 'park'
  ) {
    return {
      priceTier: 1,
      estimatedCostPerPerson: 50,
    };
  }

  // 3. Street food & Dhaba -> Tier 1 (Cost: ₹100-250)
  if (
    amenity === 'fast_food' ||
    catLower.includes('dhaba') ||
    catLower.includes('street food') ||
    catLower.includes('chaat') ||
    catLower.includes('sweet') ||
    cuisine.includes('street_food') ||
    cuisine.includes('dhaba') ||
    cuisine.includes('tea') ||
    cuisine.includes('snack')
  ) {
    return {
      priceTier: 1,
      estimatedCostPerPerson: 160,
    };
  }

  // 4. Cafe -> Tier 2 (Cost: ₹250-500)
  if (amenity === 'cafe' || catLower.includes('cafe') || catLower.includes('coffee') || catLower.includes('bakery')) {
    return {
      priceTier: 2,
      estimatedCostPerPerson: 380,
    };
  }

  // 5. Restaurant -> Tier 2 or 3
  if (amenity === 'restaurant' || catLower.includes('restaurant')) {
    const isUpscale =
      cuisine.includes('fine_dining') ||
      tags.bar === 'yes' ||
      tags.wine === 'yes' ||
      catLower.includes('fine dining') ||
      catLower.includes('lounge');

    return {
      priceTier: isUpscale ? 3 : 2,
      estimatedCostPerPerson: isUpscale ? 850 : 450,
    };
  }

  // Default fallback for food
  return {
    priceTier: 2,
    estimatedCostPerPerson: 350,
  };
};

/**
 * Normalizes an OSM Overpass element into our unified Place schema
 */
export const normalizeOverpassElement = (element, cityName = 'India', packType = 'food') => {
  const tags = element.tags || {};
  const name = tags.name || tags['name:en'] || tags['name:hi'];

  // Skip if place has no name
  if (!name || !name.trim()) {
    return null;
  }

  // Determine coordinates
  let lon = element.lon;
  let lat = element.lat;
  if (lon === undefined || lat === undefined) {
    if (element.center) {
      lon = element.center.lon;
      lat = element.center.lat;
    }
  }

  if (typeof lon !== 'number' || typeof lat !== 'number') {
    return null;
  }

  // Determine category
  let category = 'Local Spot';
  let resolvedPackType = packType;

  if (tags.amenity === 'restaurant') {
    category = tags.cuisine ? `${tags.cuisine.replace(/;/g, ', ')} Restaurant` : 'Restaurant';
    resolvedPackType = 'food';
  } else if (tags.amenity === 'cafe') {
    category = 'Cafe & Coffee';
    resolvedPackType = 'food';
  } else if (tags.amenity === 'fast_food') {
    category = 'Quick Bites & Fast Food';
    resolvedPackType = 'food';
  } else if (tags.amenity === 'food_court') {
    category = 'Food Court';
    resolvedPackType = 'food';
  } else if (tags.tourism === 'hotel') {
    category = 'Hotel Stay';
    resolvedPackType = 'trip';
  } else if (tags.tourism === 'guest_house') {
    category = 'Guest House Stay';
    resolvedPackType = 'trip';
  } else if (tags.tourism === 'hostel') {
    category = 'Hostel Stay';
    resolvedPackType = 'trip';
  } else if (tags.tourism === 'attraction') {
    category = 'Tourist Attraction';
    resolvedPackType = 'trip';
  } else if (tags.tourism === 'viewpoint') {
    category = 'Scenic Viewpoint';
    resolvedPackType = 'trip';
  } else if (tags.tourism === 'museum') {
    category = 'Museum & Heritage';
    resolvedPackType = 'trip';
  } else if (tags.historic) {
    category = 'Historic Site';
    resolvedPackType = 'trip';
  } else if (tags.leisure === 'park') {
    category = 'Park & Garden';
    resolvedPackType = 'trip';
  }

  // Build tags array
  const placeTags = [];
  if (tags.cuisine) {
    tags.cuisine.split(';').forEach((c) => placeTags.push(c.trim().toLowerCase()));
  }
  if (tags['diet:vegetarian'] === 'yes' || tags['diet:vegetarian'] === 'only') {
    placeTags.push('vegetarian');
    if (tags['diet:vegetarian'] === 'only') placeTags.push('pure-veg');
  }
  if (tags['diet:vegan'] === 'yes' || tags['diet:vegan'] === 'only') {
    placeTags.push('vegan');
  }
  if (tags['diet:halal'] === 'yes' || tags['diet:halal'] === 'only') {
    placeTags.push('halal');
  }
  if (tags.wheelchair === 'yes') {
    placeTags.push('wheelchair-accessible');
  }
  if (tags.outdoor_seating === 'yes') {
    placeTags.push('outdoor-seating');
  }
  if (tags.tourism === 'hotel' || tags.tourism === 'guest_house' || tags.tourism === 'hostel') {
    placeTags.push('stay', 'accommodation');
  } else if (resolvedPackType === 'trip') {
    placeTags.push('sights', 'sightseeing');
  }

  // Parse opening hours when known
  let openingHours = { open: '10:00', close: '22:00' };
  if (tags.opening_hours) {
    const match = tags.opening_hours.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
    if (match) {
      openingHours = { open: match[1], close: match[2] };
    }
  }

  // Derive price info
  const priceInfo = derivePriceInfo(category, tags, resolvedPackType);

  // Address
  const addressParts = [
    tags['addr:street'] || tags['addr:housename'] || tags['addr:suburb'],
    tags['addr:city'] || cityName,
    tags['addr:postcode'],
  ].filter(Boolean);
  const address = addressParts.length > 0 ? addressParts.join(', ') : `${name}, ${cityName}`;

  return {
    name: name.trim(),
    packType: resolvedPackType,
    city: cityName,
    destinationName: cityName,
    category,
    address,
    location: {
      type: 'Point',
      coordinates: [lon, lat],
    },
    priceTier: priceInfo.priceTier,
    priceSource: 'estimated',
    estimatedCostPerPerson: priceInfo.estimatedCostPerPerson,
    priceReports: [],
    rating: 4.5,
    reviewCount: 85,
    tags: placeTags,
    attributes: placeTags,
    openingHours,
    recommendedDurationMinutes: resolvedPackType === 'trip' ? 90 : 60,
    osmId: `${element.type}-${element.id}`,
    website: tags.website || tags['contact:website'] || '',
    phone: tags.phone || tags['contact:phone'] || '',
  };
};

/**
 * Deduplicates near-identical names within 50 meters
 */
export const deduplicatePlaces = (places) => {
  const result = [];

  for (const place of places) {
    const [lon1, lat1] = place.location.coordinates;
    const cleanName = place.name.toLowerCase().replace(/[^a-z0-9]/g, '');

    const isDuplicate = result.some((existing) => {
      const [lon2, lat2] = existing.location.coordinates;
      const distance = haversineDistanceMeters(lon1, lat1, lon2, lat2);

      if (distance <= 50) {
        const existingClean = existing.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (
          cleanName === existingClean ||
          cleanName.includes(existingClean) ||
          existingClean.includes(cleanName)
        ) {
          return true;
        }
      }
      return false;
    });

    if (!isDuplicate) {
      result.push(place);
    }
  }

  return result;
};

/**
 * Generates Overpass QL Query based on lat, lng, radius, and packType
 */
export const buildOverpassQuery = ({ lat, lng, radius = 5000, packType = 'food' }) => {
  const r = Math.min(Math.max(radius, 1000), 20000); // 1km - 20km

  if (packType === 'food') {
    return `[out:json][timeout:25];
(
  nwr["amenity"~"restaurant|cafe|fast_food|food_court"](around:${r},${lat},${lng});
);
out center 45;`;
  }

  if (packType === 'trip') {
    return `[out:json][timeout:25];
(
  nwr["tourism"~"hotel|guest_house|hostel|attraction|viewpoint|museum"](around:${r},${lat},${lng});
  nwr["historic"](around:${r},${lat},${lng});
  nwr["leisure"="park"](around:${r},${lat},${lng});
);
out center 45;`;
  }

  // 'both'
  return `[out:json][timeout:25];
(
  nwr["amenity"~"restaurant|cafe|fast_food|food_court"](around:${r},${lat},${lng});
  nwr["tourism"~"hotel|guest_house|hostel|attraction|viewpoint|museum"](around:${r},${lat},${lng});
  nwr["historic"](around:${r},${lat},${lng});
  nwr["leisure"="park"](around:${r},${lat},${lng});
);
out center 60;`;
};

/**
 * Executes an Overpass query with serialization queue, retries, exponential backoff,
 * and endpoint rotation
 */
const executeOverpassQuery = async (query) => {
  const maxRetries = process.env.NODE_ENV === 'test' ? 1 : 3;
  const timeoutMs = process.env.NODE_ENV === 'test' ? 1500 : 10000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const endpoint = OVERPASS_ENDPOINTS[currentEndpointIndex];

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'User-Agent': 'GroupPick/1.0 (contact@grouppick.local; decision-platform)',
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        return data?.elements || [];
      }

      console.warn(
        `[Overpass API] Endpoint ${endpoint} returned status ${res.status}. Attempt ${attempt} of ${maxRetries}.`
      );
    } catch (err) {
      console.warn(
        `[Overpass API] Attempt ${attempt} failed on ${endpoint}: ${err.message}`
      );
    }

    // Rotate endpoint
    currentEndpointIndex = (currentEndpointIndex + 1) % OVERPASS_ENDPOINTS.length;

    // Exponential backoff
    const delay = Math.pow(2, attempt) * 400;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  return [];
};

/**
 * Public method to query places from Overpass API serialized through a queue
 */
export const fetchPlacesFromOverpass = async ({
  lat,
  lng,
  radius = 5000,
  packType = 'food',
  cityName = 'India',
}) => {
  // Enqueue to serialize Overpass calls with minimum interval
  return new Promise((resolve, reject) => {
    queuePromise = queuePromise
      .then(async () => {
        const now = Date.now();
        const elapsed = now - lastRequestTimestamp;
        if (elapsed < MIN_REQUEST_INTERVAL_MS) {
          await new Promise((r) => setTimeout(r, MIN_REQUEST_INTERVAL_MS - elapsed));
        }
        lastRequestTimestamp = Date.now();

        const query = buildOverpassQuery({ lat, lng, radius, packType });
        const rawElements = await executeOverpassQuery(query);

        // Normalize each element
        const normalized = [];
        for (const el of rawElements) {
          const item = normalizeOverpassElement(el, cityName, packType);
          if (item) {
            normalized.push(item);
          }
        }

        // Deduplicate near-identical names within 50m
        const deduplicated = deduplicatePlaces(normalized);
        resolve(deduplicated);
      })
      .catch((err) => {
        console.error('[Overpass Queue Error]', err);
        resolve([]); // Resolve empty array on queue failure so fallback can kick in
      });
  });
};
