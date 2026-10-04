import express from 'express';
import { searchDestinations, lookupNominatimDestination, POPULAR_INDIAN_DESTINATIONS } from '../services/destinationsService.js';

const router = express.Router();

/**
 * GET /api/destinations/search
 * Search-as-you-type Indian destinations via Photon geocoder
 */
router.get('/search', async (req, res, next) => {
  try {
    const { q = '', limit = 8 } = req.query;
    if (!q || String(q).trim().length < 2) {
      return res.json([]);
    }
    const results = await searchDestinations(String(q), parseInt(limit, 10) || 8);
    res.json(results);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/destinations/popular
 * Returns the popular Indian destinations chips
 */
router.get('/popular', (req, res) => {
  res.json(POPULAR_INDIAN_DESTINATIONS.slice(0, 8));
});

/**
 * GET /api/destinations/lookup
 * Single lookup on submit via Nominatim if needed
 */
router.get('/lookup', async (req, res, next) => {
  try {
    const { q = '' } = req.query;
    const result = await lookupNominatimDestination(String(q));
    if (!result) {
      return res.status(404).json({ error: 'Destination not found in India' });
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
