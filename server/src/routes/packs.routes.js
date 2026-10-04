import express from 'express';

const router = express.Router();

export const DECISION_PACKS = [
  {
    id: 'food',
    name: 'Food & Dining Pack',
    tagline: 'Where should we eat tonight?',
    description: 'Effortlessly balance diets (pure veg, vegan, halal, Jain-friendly), budgets, and cuisines across any place in India.',
    icon: 'UtensilsCrossed',
    requiresExternalApi: true,
    destinationScope: 'Any place in India',
    defaultHardLimits: [
      { id: 'pure-veg', label: 'Pure Vegetarian Only', description: 'Strictly vegetarian dining establishments' },
      { id: 'vegetarian', label: 'Vegetarian Friendly', description: 'Must have good vegetarian options' },
      { id: 'vegan', label: 'Strictly Vegan', description: 'Eliminate places without dedicated vegan options' },
      { id: 'halal', label: 'Halal Certified', description: 'Only halal-compliant dining' },
      { id: 'wheelchair', label: 'Wheelchair Accessible', description: 'Must have step-free entrance & seating' },
      { id: 'outdoor-seating', label: 'Outdoor / Rooftop', description: 'Rooftop or garden open-air dining' },
    ],
    defaultSoftWishes: [
      { id: 'dhaba', label: 'Dhaba / Local Flavor', description: 'Authentic local dhabas and regional specials' },
      { id: 'street-food', label: 'Street Food & Chaat', description: 'Iconic street eats and fast bites' },
      { id: 'cafe', label: 'Cozy Cafe / Coffee', description: 'Specialty brew, dessert, relaxed ambiance' },
      { id: 'fine-dining', label: 'Heritage / Fine Dining', description: 'Upscale royal or fine dining' },
      { id: 'quiet', label: 'Quiet & Intimate', description: 'Easy conversation, low ambient volume' },
      { id: 'lively', label: 'Bustling & Energetic', description: 'Vibrant atmosphere and music' },
      { id: 'quick-bite', label: 'Fast Casual / Quick', description: 'Under 45 minutes dining experience' },
      { id: 'highly-rated', label: 'Top Rated (4.5+)', description: 'Consistently exceptional reviews' },
    ],
  },
  {
    id: 'trip',
    name: 'Trip & Day Route Pack',
    tagline: 'Plan our perfect day together',
    description: 'Vote on stays, heritage forts, viewpoints, and museums, then let the engine assemble an optimized time-window-aware day route across any destination in India.',
    icon: 'Compass',
    requiresExternalApi: true,
    destinationScope: 'Any place in India',
    defaultHardLimits: [
      { id: 'wheelchair', label: 'Wheelchair Accessible', description: 'Full accessibility at all stops' },
      { id: 'indoor', label: 'Rain-Proof (Indoor Only)', description: 'Must be indoors if weather is bad' },
      { id: 'free-entry', label: 'Free Entry Only', description: 'Filter out paid ticketed attractions' },
      { id: 'max-walk-moderate', label: 'Low Walking Distance', description: 'Prioritize closely clustered spots' },
    ],
    defaultSoftWishes: [
      { id: 'must-see', label: 'Iconic Must-See', description: 'Famous world-class landmarks' },
      { id: 'nature', label: 'Parks & Greenery', description: 'Scenic gardens and quiet nature' },
      { id: 'art', label: 'Fine Arts & Architecture', description: 'Galleries, gothic architecture, sculpture' },
      { id: 'photo-spot', label: 'Photogenic Views', description: 'Panoramic vistas and scenic overlooks' },
      { id: 'culture', label: 'Historic & Cultural', description: 'Heritage sites and rich history' },
      { id: 'interactive', label: 'Interactive / Immersive', description: 'Hands-on or digital art displays' },
    ],
  },
  {
    id: 'custom',
    name: 'Custom Options Pack',
    tagline: 'Decide anything: movies, gifts, board games, or pitches',
    description: 'Add your own candidate choices with costs and tags. Completely standalone without needing external APIs.',
    icon: 'Sparkles',
    requiresExternalApi: false,
    supportedCities: [],
    defaultHardLimits: [
      { id: 'strict-budget', label: 'Strict Budget Cap', description: 'Strictly disqualify any option over budget' },
      { id: 'family-friendly', label: 'All Ages / Family Friendly', description: 'Suitable for everyone' },
    ],
    defaultSoftWishes: [
      { id: 'quick', label: 'Short Duration', description: 'Takes under 1 hour' },
      { id: 'innovative', label: 'Unique / Novel', description: 'Something fresh we have not tried before' },
      { id: 'crowd-pleaser', label: 'Safe Consensus Pick', description: 'High probability of broad agreement' },
    ],
  },
];

router.get('/', (req, res) => {
  res.json(DECISION_PACKS);
});

router.get('/:id', (req, res) => {
  const pack = DECISION_PACKS.find((p) => p.id === req.params.id);
  if (!pack) {
    return res.status(404).json({ error: `Pack '${req.params.id}' not found` });
  }
  res.json(pack);
});

export default router;
