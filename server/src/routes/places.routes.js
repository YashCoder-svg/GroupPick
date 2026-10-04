import express from 'express';
import {
  getPlacesForDestination,
  searchPlaces,
  reportPlacePrice,
  geocodeCity,
} from '../services/placesService.js';
import { Group } from '../models/Group.js';

const router = express.Router();

/**
 * GET /api/places
 * Primary places endpoint for any Indian destination
 * Query params: destinationId, destination, lat, lng, radius (default 5000m), packType ('food'|'trip'|'both'), query, limit
 */
router.get('/', async (req, res, next) => {
  try {
    const {
      destinationId,
      destination = '',
      city = '',
      lat,
      lng,
      radius = 5000,
      packType = 'food',
      query = '',
      limit = 30,
    } = req.query;

    let targetLat = lat ? parseFloat(lat) : null;
    let targetLng = lng ? parseFloat(lng) : null;
    let targetName = destination || city || '';

    // If destinationId passed (can be a Group ID or Code), extract destination info
    if (destinationId) {
      const group =
        (await Group.findOne({ code: String(destinationId).toUpperCase() })) ||
        (destinationId.match(/^[0-9a-fA-F]{24}$/) ? await Group.findById(destinationId) : null);

      if (group) {
        if (group.destination) {
          targetName = targetName || group.destination.name;
          targetLat = targetLat !== null ? targetLat : group.destination.lat;
          targetLng = targetLng !== null ? targetLng : group.destination.lng;
        } else if (group.packConfig?.city) {
          targetName = targetName || group.packConfig.city;
        }
      }
    }

    const result = await getPlacesForDestination({
      destinationName: targetName,
      lat: targetLat,
      lng: targetLng,
      radius: parseInt(radius, 10) || 5000,
      packType: String(packType),
      query: String(query),
      limit: parseInt(limit, 10) || 30,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/places/search
 * Backward-compatible search endpoint returning direct array of places
 */
router.get('/search', async (req, res, next) => {
  try {
    const {
      city = 'Delhi',
      destination = '',
      lat,
      lng,
      packType = 'food',
      query = '',
      radius = 5000,
      limit = 30,
    } = req.query;

    const places = await searchPlaces({
      city: String(destination || city),
      destinationName: String(destination || city),
      lat: lat ? parseFloat(lat) : null,
      lng: lng ? parseFloat(lng) : null,
      packType: String(packType),
      query: String(query),
      radius: parseInt(radius, 10) || 5000,
      limit: parseInt(limit, 10) || 30,
    });

    res.json(places);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/places/:id/report-price
 * Report actual price paid per person in INR
 */
router.post('/:id/report-price', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, reportedBy } = req.body;

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Valid price amount in INR is required' });
    }

    const place = await reportPlacePrice({
      placeId: id,
      amount: parseFloat(amount),
      reportedBy: reportedBy || 'anonymous',
    });

    res.json({
      message: 'Actual price report recorded successfully',
      place,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/places/geocode
 * Geocode city or address for India
 */
router.get('/geocode', async (req, res, next) => {
  try {
    const { q = 'Delhi' } = req.query;
    const location = await geocodeCity(String(q));
    res.json(location);
  } catch (err) {
    next(err);
  }
});

export default router;
