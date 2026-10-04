/**
 * Candidate generation module
 * Generates initial candidates from Food, Trip, or Custom packs.
 */

export const generateCandidates = async ({ group, places = [] }) => {
  const packId = group.packId;

  if (packId === 'custom') {
    const customList = group.packConfig?.customOptions || [];
    return customList.map((opt, index) => {
      const cost = typeof opt.cost === 'number' ? opt.cost : 0;
      return {
        id: opt.id || `custom-opt-${index + 1}`,
        optionId: opt.id || `custom-opt-${index + 1}`,
        name: opt.name,
        title: opt.name,
        description: opt.description || '',
        category: opt.category || 'Custom Choice',
        cost,
        costPerPerson: cost,
        priceTier: cost > 1500 ? 4 : cost > 600 ? 3 : cost > 250 ? 2 : 1,
        priceSource: 'reported',
        attributes: Array.isArray(opt.tags) ? opt.tags : [],
        tags: Array.isArray(opt.tags) ? opt.tags : [],
        location: null,
        openingHours: opt.openingHours || null,
        recommendedDurationMinutes: 60,
        optionType: 'custom',
      };
    });
  }

  // Food or Trip pack places
  return places.map((p) => {
    const raw = typeof p.toObject === 'function' ? p.toObject() : p;
    const resolvedId = raw.id || raw.osmId || raw._id?.toString() || raw.name;
    const cost = raw.estimatedCostPerPerson ?? raw.costPerPerson ?? raw.cost ?? 350;
    const priceTier = raw.priceTier || (cost > 1500 ? 4 : cost > 600 ? 3 : cost > 250 ? 2 : 1);
    const tags = raw.tags && raw.tags.length > 0 ? raw.tags : raw.attributes || [];

    return {
      id: resolvedId,
      optionId: resolvedId,
      placeId: raw._id?.toString() || null,
      name: raw.name,
      title: raw.name,
      description: raw.description || `${raw.category} in ${raw.city || raw.destinationName || 'India'}`,
      category: raw.category,
      city: raw.city || raw.destinationName || 'India',
      destinationName: raw.destinationName || raw.city || 'India',
      address: raw.address,
      cost,
      costPerPerson: cost,
      priceTier,
      priceSource: raw.priceSource || 'estimated',
      priceReports: raw.priceReports || [],
      rating: raw.rating || 4.5,
      reviewCount: raw.reviewCount || 100,
      attributes: tags,
      tags,
      location: raw.location
        ? {
            lat: raw.location.coordinates?.[1],
            lng: raw.location.coordinates?.[0],
            address: raw.address,
          }
        : null,
      openingHours: raw.openingHours || { open: '10:00', close: '22:00' },
      recommendedDurationMinutes: raw.recommendedDurationMinutes || 90,
      optionType: packId === 'trip' ? 'itinerary' : 'place',
    };
  });
};
