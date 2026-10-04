import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Group } from '../models/Group.js';
import { Member } from '../models/Member.js';
import { Preference } from '../models/Preference.js';
import { Place } from '../models/Place.js';
import { Decision } from '../models/Decision.js';
import { FairnessLedger } from '../models/FairnessLedger.js';
import { ensureSeedPlaces } from '../services/placesService.js';
import { runDecisionPipeline } from '../engine/index.js';

export const runSeed = async () => {
  console.log('[Seed] Starting database seed process for Indian destinations...');
  await connectDB();

  // Clear existing collections
  await Preference.deleteMany({});
  await Decision.deleteMany({});
  await FairnessLedger.deleteMany({});
  await Member.deleteMany({});
  await Group.deleteMany({});
  await User.deleteMany({});
  await Place.deleteMany({});

  // 1. Seed fallback places for the 10 Indian cities
  const placesCount = await ensureSeedPlaces();
  console.log(`[Seed] Places seeded: ${placesCount}`);

  // 2. Create demo organizer account
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('password123', salt);
  const demoOrganizer = await User.create({
    name: 'Sarah Sharma',
    email: 'organizer@grouppick.com',
    passwordHash,
  });
  console.log('[Seed] Created demo organizer: organizer@grouppick.com (password: password123)');

  // 3. Demo Group 1: Delhi Friday Flatmates Dinner (Food Pack)
  const foodGroup = await Group.create({
    code: 'GP-DELHI',
    title: 'Friday Flatmates Dinner (Delhi)',
    packId: 'food',
    destination: {
      name: 'Delhi',
      state: 'Delhi',
      lat: 28.6139,
      lng: 77.209,
      bbox: [76.84, 28.4, 77.34, 28.88],
    },
    packConfig: {
      city: 'Delhi',
      centerLocation: { lat: 28.6139, lng: 77.209 },
      date: '2026-10-10',
    },
    strategy: 'utilitarian',
    organizerId: demoOrganizer._id,
    organizerToken: 'org-token-delhi-demo-12345',
    status: 'decided',
  });

  const memberAarav = await Member.create({
    groupId: foodGroup._id,
    guestToken: 'token-aarav-host',
    displayName: 'Aarav (Host)',
    isOrganizer: true,
    hasResponded: true,
    avatarColor: '#F2542D',
  });

  const memberPriya = await Member.create({
    groupId: foodGroup._id,
    guestToken: 'token-priya-guest',
    displayName: 'Priya',
    isOrganizer: false,
    hasResponded: true,
    avatarColor: '#12403A',
  });

  const memberRohan = await Member.create({
    groupId: foodGroup._id,
    guestToken: 'token-rohan-guest',
    displayName: 'Rohan',
    isOrganizer: false,
    hasResponded: true,
    avatarColor: '#D97706',
  });

  const memberAnanya = await Member.create({
    groupId: foodGroup._id,
    guestToken: 'token-ananya-guest',
    displayName: 'Ananya',
    isOrganizer: false,
    hasResponded: true,
    avatarColor: '#2563EB',
  });

  const foodMembers = [memberAarav, memberPriya, memberRohan, memberAnanya];

  // Preferences with realistic INR budgets:
  // Priya: Vegetarian, budget ₹400
  // Rohan: Halal, budget ₹350 (group ceiling!)
  // Ananya: Organic & cozy, budget ₹800
  // Aarav: Budget ₹600
  const foodPreferences = [
    await Preference.create({
      groupId: foodGroup._id,
      memberId: memberAarav._id,
      budget: 600,
      hardLimits: [],
      softWishes: ['kebabs', 'dinner'],
      rankedPicks: ['seed-delhi-food-1'],
    }),
    await Preference.create({
      groupId: foodGroup._id,
      memberId: memberPriya._id,
      budget: 400,
      hardLimits: ['vegetarian'],
      softWishes: ['pure-veg', 'dosa'],
      rankedPicks: ['seed-delhi-food-2'],
    }),
    await Preference.create({
      groupId: foodGroup._id,
      memberId: memberRohan._id,
      budget: 350,
      hardLimits: ['halal'],
      softWishes: ['mughlai', 'quick-bite'],
      rankedPicks: ['seed-delhi-food-1', 'seed-delhi-food-3'],
    }),
    await Preference.create({
      groupId: foodGroup._id,
      memberId: memberAnanya._id,
      budget: 800,
      hardLimits: [],
      softWishes: ['historic', 'fine-dining'],
      rankedPicks: ['seed-delhi-food-1'],
    }),
  ];

  // Initial Fairness Ledgers
  const foodLedgers = [
    await FairnessLedger.create({
      groupId: foodGroup._id,
      memberId: memberAarav._id,
      displayName: 'Aarav (Host)',
      timesTopChoiceWon: 1,
      timesTopChoiceLost: 1,
      currentWeight: 1.0,
      history: [],
    }),
    await FairnessLedger.create({
      groupId: foodGroup._id,
      memberId: memberPriya._id,
      displayName: 'Priya',
      timesTopChoiceWon: 0,
      timesTopChoiceLost: 2,
      currentWeight: 1.15, // Priya compromised recently -> priority weight!
      history: [],
    }),
    await FairnessLedger.create({
      groupId: foodGroup._id,
      memberId: memberRohan._id,
      displayName: 'Rohan',
      timesTopChoiceWon: 1,
      timesTopChoiceLost: 0,
      currentWeight: 0.95,
      history: [],
    }),
    await FairnessLedger.create({
      groupId: foodGroup._id,
      memberId: memberAnanya._id,
      displayName: 'Ananya',
      timesTopChoiceWon: 0,
      timesTopChoiceLost: 1,
      currentWeight: 1.05,
      history: [],
    }),
  ];

  // Compute decision for Food Group
  const foodDecisionResult = await runDecisionPipeline({
    group: foodGroup,
    members: foodMembers,
    preferences: foodPreferences,
    fairnessLedgers: foodLedgers,
    strategy: 'utilitarian',
  });

  const foodDecision = await Decision.create({
    groupId: foodGroup._id,
    packId: 'food',
    status: 'draft',
    strategyUsed: 'utilitarian',
    options: foodDecisionResult.options,
    aggregateBudgetFeasibleRange: foodDecisionResult.aggregateBudgetFeasibleRange,
    inputsSnapshot: foodDecisionResult.inputsSnapshot,
  });

  foodGroup.latestDecisionId = foodDecision._id;
  await foodGroup.save();
  console.log(`[Seed] Seeded Delhi Food Group with code: GP-DELHI`);

  // 4. Demo Group 2: Goa Coastal Adventure & Stays (Trip Pack)
  const tripGroup = await Group.create({
    code: 'GP-GOA',
    title: 'Goa Coastal Stays & Sunset Sights',
    packId: 'trip',
    destination: {
      name: 'Goa',
      state: 'Goa',
      lat: 15.2993,
      lng: 74.124,
      bbox: [73.68, 14.89, 74.34, 15.8],
    },
    packConfig: {
      city: 'Goa',
      centerLocation: { lat: 15.2993, lng: 74.124 },
      date: '2026-10-15',
    },
    strategy: 'nash',
    organizerId: demoOrganizer._id,
    organizerToken: 'org-token-goa-demo-67890',
    status: 'decided',
  });

  const memberVikram = await Member.create({
    groupId: tripGroup._id,
    guestToken: 'token-vikram-host',
    displayName: 'Vikram (Host)',
    isOrganizer: true,
    hasResponded: true,
    avatarColor: '#F2542D',
  });

  const memberSneha = await Member.create({
    groupId: tripGroup._id,
    guestToken: 'token-sneha-guest',
    displayName: 'Sneha',
    isOrganizer: false,
    hasResponded: true,
    avatarColor: '#12403A',
  });

  const memberKabir = await Member.create({
    groupId: tripGroup._id,
    guestToken: 'token-kabir-guest',
    displayName: 'Kabir',
    isOrganizer: false,
    hasResponded: true,
    avatarColor: '#D97706',
  });

  const tripMembers = [memberVikram, memberSneha, memberKabir];

  const tripPreferences = [
    await Preference.create({
      groupId: tripGroup._id,
      memberId: memberVikram._id,
      budget: 1500,
      hardLimits: [],
      softWishes: ['ocean-view', 'historic'],
      rankedPicks: ['seed-goa-trip-1'],
    }),
    await Preference.create({
      groupId: tripGroup._id,
      memberId: memberSneha._id,
      budget: 2000,
      hardLimits: [],
      softWishes: ['beachfront', 'sunset'],
      rankedPicks: ['seed-goa-trip-2'],
    }),
    await Preference.create({
      groupId: tripGroup._id,
      memberId: memberKabir._id,
      budget: 1200,
      hardLimits: [],
      softWishes: ['viewpoint', 'peaceful'],
      rankedPicks: ['seed-goa-trip-1'],
    }),
  ];

  const tripLedgers = [
    await FairnessLedger.create({
      groupId: tripGroup._id,
      memberId: memberVikram._id,
      displayName: 'Vikram (Host)',
      timesTopChoiceWon: 0,
      timesTopChoiceLost: 1,
      currentWeight: 1.1,
      history: [],
    }),
    await FairnessLedger.create({
      groupId: tripGroup._id,
      memberId: memberSneha._id,
      displayName: 'Sneha',
      timesTopChoiceWon: 1,
      timesTopChoiceLost: 0,
      currentWeight: 0.9,
      history: [],
    }),
    await FairnessLedger.create({
      groupId: tripGroup._id,
      memberId: memberKabir._id,
      displayName: 'Kabir',
      timesTopChoiceWon: 0,
      timesTopChoiceLost: 0,
      currentWeight: 1.0,
      history: [],
    }),
  ];

  const tripDecisionResult = await runDecisionPipeline({
    group: tripGroup,
    members: tripMembers,
    preferences: tripPreferences,
    fairnessLedgers: tripLedgers,
    strategy: 'nash',
  });

  const tripDecision = await Decision.create({
    groupId: tripGroup._id,
    packId: 'trip',
    status: 'draft',
    strategyUsed: 'nash',
    options: tripDecisionResult.options,
    aggregateBudgetFeasibleRange: tripDecisionResult.aggregateBudgetFeasibleRange,
    inputsSnapshot: tripDecisionResult.inputsSnapshot,
  });

  tripGroup.latestDecisionId = tripDecision._id;
  await tripGroup.save();
  console.log(`[Seed] Seeded Goa Trip Group with code: GP-GOA`);

  console.log('[Seed] Database seeding completed successfully for Indian destinations!');
};

// Auto-run if executed directly via node
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  runSeed()
    .then(() => {
      console.log('[Seed] Done.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Seed] Error during seeding:', err);
      process.exit(1);
    });
}
