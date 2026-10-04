/**
 * Destination Search Service
 * Integrates with Photon Geocoder (Komoot / OSM) restricted to India,
 * with local caching, rate-limited Nominatim single lookup fallback,
 * and built-in offline Indian destinations.
 */

// Popular Indian destinations with verified coordinates & bounding boxes
export const POPULAR_INDIAN_DESTINATIONS = [
  {
    name: 'Goa',
    state: 'Goa',
    country: 'India',
    lat: 15.2993,
    lng: 74.124,
    bbox: [73.68, 14.89, 74.34, 15.8],
    displayName: 'Goa, India',
  },
  {
    name: 'Jaipur',
    state: 'Rajasthan',
    country: 'India',
    lat: 26.9124,
    lng: 75.7873,
    bbox: [75.68, 26.78, 75.92, 27.02],
    displayName: 'Jaipur, Rajasthan, India',
  },
  {
    name: 'Manali',
    state: 'Himachal Pradesh',
    country: 'India',
    lat: 32.2396,
    lng: 77.1887,
    bbox: [77.15, 32.2, 77.22, 32.28],
    displayName: 'Manali, Himachal Pradesh, India',
  },
  {
    name: 'Delhi',
    state: 'Delhi',
    country: 'India',
    lat: 28.6139,
    lng: 77.209,
    bbox: [76.84, 28.4, 77.34, 28.88],
    displayName: 'Delhi, India',
  },
  {
    name: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    lat: 18.922,
    lng: 72.8347,
    bbox: [72.77, 18.89, 73.0, 19.27],
    displayName: 'Mumbai, Maharashtra, India',
  },
  {
    name: 'Bengaluru',
    state: 'Karnataka',
    country: 'India',
    lat: 12.9716,
    lng: 77.5946,
    bbox: [77.46, 12.83, 77.74, 13.14],
    displayName: 'Bengaluru, Karnataka, India',
  },
  {
    name: 'Rishikesh',
    state: 'Uttarakhand',
    country: 'India',
    lat: 30.0869,
    lng: 78.2676,
    bbox: [78.22, 30.05, 78.33, 30.14],
    displayName: 'Rishikesh, Uttarakhand, India',
  },
  {
    name: 'Udaipur',
    state: 'Rajasthan',
    country: 'India',
    lat: 24.5854,
    lng: 73.7125,
    bbox: [73.65, 24.54, 73.76, 24.63],
    displayName: 'Udaipur, Rajasthan, India',
  },
  {
    name: 'Pushkar',
    state: 'Rajasthan',
    country: 'India',
    lat: 26.4876,
    lng: 74.5578,
    bbox: [74.52, 26.46, 74.59, 26.52],
    displayName: 'Pushkar, Rajasthan, India',
  },
  {
    name: 'Mount Abu',
    state: 'Rajasthan',
    country: 'India',
    lat: 24.5926,
    lng: 72.7156,
    bbox: [72.67, 24.56, 72.76, 24.63],
    displayName: 'Mount Abu, Rajasthan, India',
  },
  {
    name: 'Hampi',
    state: 'Karnataka',
    country: 'India',
    lat: 15.335,
    lng: 76.46,
    bbox: [76.42, 15.3, 76.5, 15.37],
    displayName: 'Hampi, Karnataka, India',
  },
  {
    name: 'Kochi',
    state: 'Kerala',
    country: 'India',
    lat: 9.9312,
    lng: 76.2673,
    bbox: [76.2, 9.87, 76.35, 10.02],
    displayName: 'Kochi, Kerala, India',
  },
  {
    name: 'Hyderabad',
    state: 'Telangana',
    country: 'India',
    lat: 17.385,
    lng: 78.4867,
    bbox: [78.25, 17.2, 78.6, 17.55],
    displayName: 'Hyderabad, Telangana, India',
  },
  {
    name: 'Chennai',
    state: 'Tamil Nadu',
    country: 'India',
    lat: 13.0827,
    lng: 80.2707,
    bbox: [80.12, 12.92, 80.33, 13.24],
    displayName: 'Chennai, Tamil Nadu, India',
  },
  {
    name: 'Kolkata',
    state: 'West Bengal',
    country: 'India',
    lat: 22.5726,
    lng: 88.3639,
    bbox: [88.24, 22.45, 88.46, 22.68],
    displayName: 'Kolkata, West Bengal, India',
  },
  {
    name: 'Varanasi',
    state: 'Uttar Pradesh',
    country: 'India',
    lat: 25.3176,
    lng: 82.9739,
    bbox: [82.9, 25.25, 83.05, 25.38],
    displayName: 'Varanasi, Uttar Pradesh, India',
  },
];

// In-memory cache for search queries
const destinationCache = new Map();

// Rate limiter for single Nominatim lookup (max 1 req/sec)
let lastNominatimRequestTime = 0;
const NOMINATIM_MIN_INTERVAL = 1100; // ms

/**
 * Search destinations in India using Photon geocoder
 * @param {string} query - Destination query string
 * @param {number} limit - Maximum number of results
 * @returns {Promise<Array>} List of destination objects
 */
export const searchDestinations = async (query = '', limit = 8) => {
  const q = String(query).trim();
  if (!q || q.length < 2) {
    return [];
  }

  const cacheKey = q.toLowerCase();
  if (destinationCache.has(cacheKey)) {
    return destinationCache.get(cacheKey);
  }

  // Check matching predefined popular cities first for instant offline responsiveness
  const localMatches = POPULAR_INDIAN_DESTINATIONS.filter(
    (d) =>
      d.name.toLowerCase().includes(cacheKey) ||
      d.state.toLowerCase().includes(cacheKey)
  ).slice(0, limit);

  try {
    const controller = new AbortController();
    const timeoutMs = process.env.NODE_ENV === 'test' ? 1500 : 4000;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    // Photon geocoder with India bounding box (68.1, 6.7, 97.4, 37.1)
    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(
      q
    )}&bbox=68.1,6.7,97.4,37.1&limit=${limit * 2}`;

    const res = await fetch(photonUrl, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const features = data?.features || [];

      // Filter to India results and format
      const results = [];
      const seenNames = new Set();

      for (const feat of features) {
        const props = feat.properties || {};
        const isIndia =
          props.countrycode === 'IN' ||
          props.country === 'India' ||
          props.country === 'IND';

        if (!isIndia) continue;

        const name = props.name || props.city || props.town || props.village;
        if (!name) continue;

        const state = props.state || props.county || '';
        const uniqueKey = `${name.toLowerCase()}-${state.toLowerCase()}`;
        if (seenNames.has(uniqueKey)) continue;
        seenNames.add(uniqueKey);

        const lng = feat.geometry?.coordinates?.[0];
        const lat = feat.geometry?.coordinates?.[1];

        if (typeof lat !== 'number' || typeof lng !== 'number') continue;

        const displayName = [name, state, 'India'].filter(Boolean).join(', ');

        results.push({
          name,
          state,
          country: 'India',
          lat,
          lng,
          bbox: props.extent || [lng - 0.05, lat - 0.05, lng + 0.05, lat + 0.05],
          displayName,
          osmType: props.osm_type,
          osmKey: props.osm_key,
          osmValue: props.osm_value,
        });

        if (results.length >= limit) break;
      }

      if (results.length > 0) {
        destinationCache.set(cacheKey, results);
        return results;
      }
    }
  } catch (err) {
    console.warn(`[Photon Geocoder] Warning fetching '${q}': ${err.message}`);
  }

  // Fallback to local matches if Photon fails or returns empty
  if (localMatches.length > 0) {
    destinationCache.set(cacheKey, localMatches);
    return localMatches;
  }

  return [];
};

/**
 * Single Nominatim lookup on submit if needed
 * Strictly rate-limited to max 1 req/sec with compliant User-Agent
 */
export const lookupNominatimDestination = async (query = '') => {
  const q = String(query).trim();
  if (!q) return null;

  // Enforce 1 request per second
  const now = Date.now();
  const timeSinceLast = now - lastNominatimRequestTime;
  if (timeSinceLast < NOMINATIM_MIN_INTERVAL) {
    await new Promise((resolve) => setTimeout(resolve, NOMINATIM_MIN_INTERVAL - timeSinceLast));
  }
  lastNominatimRequestTime = Date.now();

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      q + ', India'
    )}&countrycodes=in&limit=1`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'GroupPick/1.0 (contact@grouppick.local; decision-platform)',
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0) {
        const item = data[0];
        const lat = parseFloat(item.lat);
        const lng = parseFloat(item.lon);
        const parts = (item.display_name || '').split(',').map((p) => p.trim());
        const name = parts[0] || q;
        const state = parts.length > 2 ? parts[parts.length - 2] : 'India';

        return {
          name,
          state,
          country: 'India',
          lat,
          lng,
          bbox: item.boundingbox ? item.boundingbox.map(Number) : [lng - 0.05, lat - 0.05, lng + 0.05, lat + 0.05],
          displayName: item.display_name,
        };
      }
    }
  } catch (err) {
    console.warn(`[Nominatim Lookup] Error: ${err.message}`);
  }

  return null;
};
