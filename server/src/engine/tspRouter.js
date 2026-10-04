/**
 * Time-Window-Aware TSP Route Optimizer for Trip Pack
 * Uses Haversine distance, Nearest Neighbor initialization, and 2-Opt local search.
 */

// Haversine formula to compute great-circle distance in kilometers
export const haversineDistanceKm = (coord1, coord2) => {
  if (!coord1 || !coord2) return 1.0;
  const lat1 = coord1.lat ?? coord1[1];
  const lon1 = coord1.lng ?? coord1[0];
  const lat2 = coord2.lat ?? coord2[1];
  const lon2 = coord2.lng ?? coord2[0];

  if (typeof lat1 !== 'number' || typeof lon1 !== 'number' || typeof lat2 !== 'number' || typeof lon2 !== 'number') {
    return 1.0;
  }

  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Estimate transit travel time between two points in minutes
export const estimateTravelTimeMinutes = (coord1, coord2) => {
  const distKm = haversineDistanceKm(coord1, coord2);
  // Estimate ~3 minutes per km in city + 5 min fixed transfer buffer, min 5 mins
  return Math.max(5, Math.round(distKm * 3.5 + 5));
};

// Helper: parse "HH:MM" to minutes from midnight
export const timeToMinutes = (timeStr, defaultMin = 540) => {
  if (!timeStr || typeof timeStr !== 'string') return defaultMin;
  const parts = timeStr.split(':').map((p) => parseInt(p, 10));
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return defaultMin;
  return parts[0] * 60 + parts[1];
};

// Helper: format minutes from midnight to "HH:MM"
export const minutesToTime = (totalMin) => {
  const normalized = Math.max(0, Math.round(totalMin)) % 1440;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

/**
 * 2-Opt swap on an array of stop indices
 */
const twoOptSwap = (route, i, k) => {
  const newRoute = route.slice(0, i);
  const reversedSub = route.slice(i, k + 1).reverse();
  const remaining = route.slice(k + 1);
  return newRoute.concat(reversedSub).concat(remaining);
};

/**
 * Evaluate total travel time for a sequence of places
 */
const computeTotalTravelTime = (places) => {
  let totalTime = 0;
  for (let i = 0; i < places.length - 1; i++) {
    totalTime += estimateTravelTimeMinutes(places[i].location, places[i + 1].location);
  }
  return totalTime;
};

/**
 * Nearest-Neighbor + 2-Opt Time-Window-Aware TSP Optimizer
 */
export const optimizeDayRoute = ({ places = [], startTime = '09:30' }) => {
  if (!places || places.length === 0) {
    return {
      stops: [],
      totalTravelTimeMinutes: 0,
      totalDurationMinutes: 0,
    };
  }

  if (places.length === 1) {
    const p = places[0];
    const duration = p.recommendedDurationMinutes || 90;
    const startMin = timeToMinutes(startTime);
    const endMin = startMin + duration;

    return {
      stops: [
        {
          stopIndex: 1,
          placeId: p.id || p.osmId,
          name: p.name || p.title,
          category: p.category,
          address: p.address,
          arrivalTime: minutesToTime(startMin),
          departureTime: minutesToTime(endMin),
          durationMinutes: duration,
          travelTimeFromPreviousMinutes: 0,
          coordinates: p.location?.coordinates || [p.location?.lng, p.location?.lat],
        },
      ],
      totalTravelTimeMinutes: 0,
      totalDurationMinutes: duration,
    };
  }

  // 1. Nearest Neighbor construction with opening hours awareness
  const unvisited = [...places];
  const orderedPlaces = [];

  // Start with place that opens earliest or is first
  unvisited.sort((a, b) => {
    const openA = timeToMinutes(a.openingHours?.open, 540);
    const openB = timeToMinutes(b.openingHours?.open, 540);
    return openA - openB;
  });

  let currentPlace = unvisited.shift();
  orderedPlaces.push(currentPlace);

  while (unvisited.length > 0) {
    let bestIndex = 0;
    let minCost = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const candidate = unvisited[i];
      const travelTime = estimateTravelTimeMinutes(currentPlace.location, candidate.location);
      const openTime = timeToMinutes(candidate.openingHours?.open, 540);

      // Cost function balances distance and opening time readiness
      const cost = travelTime + Math.max(0, openTime - (timeToMinutes(startTime) + travelTime));

      if (cost < minCost) {
        minCost = cost;
        bestIndex = i;
      }
    }

    currentPlace = unvisited.splice(bestIndex, 1)[0];
    orderedPlaces.push(currentPlace);
  }

  // 2. 2-Opt local search improvement on ordered sequence
  let improved = true;
  let iteration = 0;
  let bestOrdered = [...orderedPlaces];
  let bestTravelTime = computeTotalTravelTime(bestOrdered);

  while (improved && iteration < 50) {
    improved = false;
    iteration++;

    for (let i = 1; i < bestOrdered.length - 1; i++) {
      for (let k = i + 1; k < bestOrdered.length; k++) {
        const candidateRoute = twoOptSwap(bestOrdered, i, k);
        const candidateTravelTime = computeTotalTravelTime(candidateRoute);

        if (candidateTravelTime < bestTravelTime) {
          bestOrdered = candidateRoute;
          bestTravelTime = candidateTravelTime;
          improved = true;
          break;
        }
      }
      if (improved) break;
    }
  }

  // 3. Assemble timed itinerary schedule
  let currentTimeMin = timeToMinutes(startTime);
  const stops = [];
  let totalTravelTime = 0;

  for (let idx = 0; idx < bestOrdered.length; idx++) {
    const p = bestOrdered[idx];
    const duration = p.recommendedDurationMinutes || 90;
    let travelTime = 0;

    if (idx > 0) {
      travelTime = estimateTravelTimeMinutes(bestOrdered[idx - 1].location, p.location);
      currentTimeMin += travelTime;
      totalTravelTime += travelTime;
    }

    // Check if arrived before opening hours
    const openTimeMin = timeToMinutes(p.openingHours?.open, 540);
    const closeTimeMin = timeToMinutes(p.openingHours?.close, 1380);

    if (currentTimeMin < openTimeMin) {
      currentTimeMin = openTimeMin; // Wait until opening
    }

    const arrivalTimeStr = minutesToTime(currentTimeMin);
    const departureTimeMin = Math.min(currentTimeMin + duration, closeTimeMin);
    const departureTimeStr = minutesToTime(departureTimeMin);

    currentTimeMin = departureTimeMin;

    stops.push({
      stopIndex: idx + 1,
      placeId: p.id || p.osmId,
      name: p.name || p.title,
      category: p.category,
      address: p.address,
      arrivalTime: arrivalTimeStr,
      departureTime: departureTimeStr,
      durationMinutes: duration,
      travelTimeFromPreviousMinutes: travelTime,
      coordinates: p.location?.coordinates || [p.location?.lng, p.location?.lat],
    });
  }

  const startMin = timeToMinutes(startTime);
  const totalDurationMinutes = currentTimeMin - startMin;

  return {
    stops,
    totalTravelTimeMinutes: totalTravelTime,
    totalDurationMinutes: Math.max(0, totalDurationMinutes),
  };
};
