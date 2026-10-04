import {
  generateCandidates,
  filterHardConstraints,
  buildSatisfactionMatrix,
  applyFairnessWeights,
  aggregateMatrix,
  selectThreeArchetypes,
  generateExplanation,
  optimizeDayRoute,
  runDecisionPipeline,
} from '../index.js';
import { dominates, computeParetoFrontier } from '../pareto.js';
import { haversineDistanceKm, timeToMinutes, minutesToTime } from '../tspRouter.js';

describe('Phase 2: Decision Engine Pure Unit Tests', () => {
  const mockMembers = [
    { _id: 'm1', displayName: 'Asha' },
    { _id: 'm2', displayName: 'Ravi' },
    { _id: 'm3', displayName: 'Maya' },
  ];

  const mockPlaces = [
    {
      id: 'p1',
      name: 'Vegan Haven',
      category: 'Pure Veg & Vegan',
      city: 'Delhi',
      costPerPerson: 25,
      attributes: ['vegan', 'organic', 'cozy'],
      rating: 4.8,
      location: { lat: 28.6139, lng: 77.209 },
      openingHours: { open: '11:00', close: '22:00' },
      recommendedDurationMinutes: 60,
    },
    {
      id: 'p2',
      name: 'Steakhouse Bistro',
      category: 'Bistro Dining',
      city: 'Delhi',
      costPerPerson: 55,
      attributes: ['meat', 'wine', 'outdoor-seating'],
      rating: 4.6,
      location: { lat: 28.62, lng: 77.21 },
      openingHours: { open: '18:00', close: '23:00' },
      recommendedDurationMinutes: 90,
    },
    {
      id: 'p3',
      name: 'Street Falafel Corner',
      category: 'Street Food Dhaba',
      city: 'Delhi',
      costPerPerson: 12,
      attributes: ['vegan', 'halal', 'vegetarian', 'budget-friendly'],
      rating: 4.5,
      location: { lat: 28.63, lng: 77.22 },
      openingHours: { open: '10:00', close: '23:00' },
      recommendedDurationMinutes: 40,
    },
  ];

  describe('1. Candidate Generation', () => {
    test('Generates candidates from Custom pack', async () => {
      const customGroup = {
        packId: 'custom',
        packConfig: {
          customOptions: [
            { id: 'c1', name: 'Inception Movie Night', cost: 10, tags: ['indoor', 'sci-fi'] },
            { id: 'c2', name: 'Escape Room Adventure', cost: 35, tags: ['puzzle', 'interactive'] },
          ],
        },
      };

      const candidates = await generateCandidates({ group: customGroup });
      expect(candidates).toHaveLength(2);
      expect(candidates[0].name).toBe('Inception Movie Night');
      expect(candidates[0].optionType).toBe('custom');
      expect(candidates[1].cost).toBe(35);
    });

    test('Generates candidates from places', async () => {
      const foodGroup = { packId: 'food' };
      const candidates = await generateCandidates({ group: foodGroup, places: mockPlaces });
      expect(candidates).toHaveLength(3);
      expect(candidates[0].id).toBe('p1');
      expect(candidates[0].costPerPerson).toBe(25);
    });
  });

  describe('2. Hard-Constraint Filtering & Edge Cases', () => {
    test('Eliminates candidates exceeding any member private budget', () => {
      const preferences = [
        { memberId: 'm1', budget: 40, hardLimits: [] },
        { memberId: 'm2', budget: 30, hardLimits: [] }, // Ravi's budget is $30
      ];

      const candidates = [
        { id: 'c1', name: 'Cheap Eats', costPerPerson: 20 },
        { id: 'c2', name: 'Pricey Bistro', costPerPerson: 35 }, // Exceeds Ravi's budget
      ];

      const { feasibleCandidates, filterStats } = filterHardConstraints({
        candidates,
        members: mockMembers.slice(0, 2),
        preferences,
      });

      expect(feasibleCandidates).toHaveLength(1);
      expect(feasibleCandidates[0].id).toBe('c1');
      expect(filterStats.eliminatedByBudget).toBe(1);
    });

    test('Eliminates candidates missing mandatory dietary limit', () => {
      const preferences = [
        { memberId: 'm1', budget: 50, hardLimits: ['vegan'] }, // Asha requires vegan
      ];

      const { feasibleCandidates } = filterHardConstraints({
        candidates: mockPlaces,
        members: mockMembers.slice(0, 1),
        preferences,
      });

      // Steakhouse Bistro lacks vegan attribute, so it should be eliminated
      expect(feasibleCandidates.some((c) => c.name === 'Steakhouse Bistro')).toBe(false);
      expect(feasibleCandidates.some((c) => c.name === 'Vegan Haven')).toBe(true);
      expect(feasibleCandidates.some((c) => c.name === 'Street Falafel Corner')).toBe(true);
    });

    test('Edge case: Zero feasible candidates generates relaxation suggestion', () => {
      const preferences = [
        { memberId: 'm1', budget: 10, hardLimits: ['vegan'] }, // Budget is only $10
      ];

      // Cheapest vegan option is $12 (Street Falafel Corner)
      const { feasibleCandidates, relaxedConstraintsSuggestion } = filterHardConstraints({
        candidates: mockPlaces,
        members: mockMembers.slice(0, 1),
        preferences,
      });

      expect(feasibleCandidates).toHaveLength(0);
      expect(relaxedConstraintsSuggestion).toBeDefined();
      expect(relaxedConstraintsSuggestion).toContain('Raising the group budget ceiling');
    });
  });

  describe('3. Satisfaction Matrix', () => {
    test('Computes scores between 0 and 100 with wish and rank bonuses', () => {
      const preferences = [
        {
          memberId: 'm1',
          budget: 50,
          softWishes: ['organic', 'cozy'],
          rankedPicks: ['p1'],
        },
      ];

      const matrix = buildSatisfactionMatrix({
        members: mockMembers.slice(0, 1),
        preferences,
        candidates: [mockPlaces[0]],
      });

      expect(matrix).toHaveLength(1);
      const scoreObj = matrix[0].memberScores[0];
      expect(scoreObj.score).toBeGreaterThanOrEqual(0);
      expect(scoreObj.score).toBeLessThanOrEqual(100);
      expect(scoreObj.breakdown.rankBonus).toBe(15); // #1 ranked pick
      expect(scoreObj.breakdown.softWishesMatched).toContain('organic');
    });
  });

  describe('4. Fairness Weighting', () => {
    test('Applies bounded weights and normalizes group average to 1.0', () => {
      const matrix = [
        {
          candidate: mockPlaces[0],
          memberScores: [
            { memberId: 'm1', score: 80 },
            { memberId: 'm2', score: 80 },
          ],
        },
      ];

      const fairnessLedgers = [
        { memberId: 'm1', currentWeight: 0.9 }, // Won recently
        { memberId: 'm2', currentWeight: 1.3 }, // Lost recently -> priority
      ];

      const weighted = applyFairnessWeights({
        matrix,
        fairnessLedgers,
        members: mockMembers.slice(0, 2),
      });

      const scores = weighted[0].memberScores;
      // Member 2 with higher weight should receive higher weighted score than Member 1
      expect(scores[1].score).toBeGreaterThan(scores[0].score);
      expect(scores[1].weightApplied).toBeGreaterThan(scores[0].weightApplied);
    });
  });

  describe('5. Aggregation Strategies', () => {
    test('Calculates Utilitarian, Maximin, Nash welfare, and Borda scores', () => {
      const mockMatrix = [
        {
          candidate: { id: 'c1', name: 'Option Balanced' },
          memberScores: [{ score: 80 }, { score: 80 }, { score: 80 }],
        },
        {
          candidate: { id: 'c2', name: 'Option Polarizing' },
          memberScores: [{ score: 100 }, { score: 100 }, { score: 40 }],
        },
      ];

      const aggregated = aggregateMatrix(mockMatrix, 'utilitarian');

      // c1: sum = 240, min = 80
      // c2: sum = 240, min = 40
      expect(aggregated[0].utilitarianScore).toBe(240);
      expect(aggregated[1].utilitarianScore).toBe(240);
      expect(aggregated[0].minSatisfaction).toBe(80);
      expect(aggregated[1].minSatisfaction).toBe(40);

      // Nash Welfare: c1 (80*80*80)^(1/3) = 80 vs c2 (100*100*40)^(1/3) ~ 73.6
      // c1 should have higher Nash welfare because it avoids extreme dissatisfaction
      expect(aggregated[0].nashScore).toBeGreaterThan(aggregated[1].nashScore);
    });
  });

  describe('6. Pareto Frontier & 3 Archetype Selection', () => {
    test('Dominates function correctly identifies Pareto dominance', () => {
      const strong = {
        candidate: { costPerPerson: 20 },
        utilitarianScore: 270,
        minSatisfaction: 85,
      };

      const weak = {
        candidate: { costPerPerson: 25 }, // more expensive
        utilitarianScore: 250, // lower total
        minSatisfaction: 80, // lower min
      };

      expect(dominates(strong, weak)).toBe(true);
      expect(dominates(weak, strong)).toBe(false);
    });

    test('Selects 3 distinct archetypes: best_overall, fairest_to_everyone, most_budget_friendly', () => {
      const aggregated = [
        {
          candidate: { id: 'opt1', name: 'Luxury Best Overall', costPerPerson: 40 },
          strategyScore: 290,
          utilitarianScore: 290,
          minSatisfaction: 82,
          averageSatisfaction: 96,
          nashScore: 92,
        },
        {
          candidate: { id: 'opt2', name: 'Egalitarian Maximin Champ', costPerPerson: 30 },
          strategyScore: 270,
          utilitarianScore: 270,
          minSatisfaction: 90, // Highest minimum satisfaction!
          averageSatisfaction: 90,
          nashScore: 90,
        },
        {
          candidate: { id: 'opt3', name: 'Budget Champ', costPerPerson: 10 }, // Lowest cost!
          strategyScore: 250,
          utilitarianScore: 250,
          minSatisfaction: 75,
          averageSatisfaction: 83,
          nashScore: 80,
        },
      ];

      const archetypes = selectThreeArchetypes(aggregated, 'utilitarian');
      expect(archetypes).toHaveLength(3);

      const types = archetypes.map((a) => a.archetype);
      expect(types).toContain('best_overall');
      expect(types).toContain('fairest_to_everyone');
      expect(types).toContain('most_budget_friendly');

      expect(archetypes.find((a) => a.archetype === 'best_overall').candidate.id).toBe('opt1');
      expect(archetypes.find((a) => a.archetype === 'fairest_to_everyone').candidate.id).toBe('opt2');
      expect(archetypes.find((a) => a.archetype === 'most_budget_friendly').candidate.id).toBe('opt3');
    });

    test('Handles edge case of single candidate', () => {
      const single = [
        {
          candidate: { id: 'solo', name: 'Only Pick', costPerPerson: 15 },
          strategyScore: 240,
          utilitarianScore: 240,
          minSatisfaction: 80,
          averageSatisfaction: 80,
        },
      ];

      const result = selectThreeArchetypes(single);
      expect(result).toHaveLength(1);
      expect(result[0].archetype).toBe('best_overall');
    });
  });

  describe('7. Trip Pack TSP Route Optimizer', () => {
    test('Computes distance and orders places into itinerary', () => {
      const placesToRoute = [
        {
          id: 't1',
          name: 'Louvre',
          location: { lat: 48.8606, lng: 2.3376 },
          openingHours: { open: '09:00', close: '18:00' },
          recommendedDurationMinutes: 120,
        },
        {
          id: 't2',
          name: 'Eiffel Tower',
          location: { lat: 48.8584, lng: 2.2945 },
          openingHours: { open: '09:30', close: '23:00' },
          recommendedDurationMinutes: 90,
        },
      ];

      const route = optimizeDayRoute({ places: placesToRoute, startTime: '10:00' });
      expect(route.stops).toHaveLength(2);
      expect(route.stops[0].arrivalTime).toBe('10:00');
      expect(route.stops[0].departureTime).toBe('12:00');
      expect(route.stops[1].travelTimeFromPreviousMinutes).toBeGreaterThan(0);
      expect(route.totalDurationMinutes).toBeGreaterThan(120);
    });

    test('Haversine distance helper calculates positive distance', () => {
      const dist = haversineDistanceKm({ lat: 28.6139, lng: 77.209 }, { lat: 18.922, lng: 72.8347 });
      expect(dist).toBeGreaterThan(1000); // Delhi to Mumbai is ~1150 km
    });
  });

  describe('8. Full Decision Pipeline End-to-End & Privacy Guarantee', () => {
    test('Runs full pipeline for custom pack and produces 3 explained options', async () => {
      const group = {
        packId: 'custom',
        packConfig: {
          customOptions: [
            { id: 'opt-boardgame', name: 'Board Game Cafe', cost: 15, tags: ['casual', 'indoor'] },
            { id: 'opt-escape', name: 'Escape Room', cost: 30, tags: ['indoor', 'puzzle'] },
            { id: 'opt-vr', name: 'VR Arcade', cost: 25, tags: ['indoor', 'tech'] },
            { id: 'opt-karaoke', name: 'Karaoke Lounge', cost: 20, tags: ['music', 'drinks', 'indoor'] },
          ],
        },
        strategy: 'utilitarian',
      };

      const preferences = [
        { memberId: 'm1', budget: 35, hardLimits: ['indoor'], softWishes: ['puzzle'], rankedPicks: ['opt-escape'] },
        { memberId: 'm2', budget: 25, hardLimits: ['indoor'], softWishes: ['casual'], rankedPicks: ['opt-boardgame'] },
        { memberId: 'm3', budget: 30, hardLimits: ['indoor'], softWishes: ['tech'], rankedPicks: ['opt-vr'] },
      ];

      const fairnessLedgers = [
        { memberId: 'm1', currentWeight: 1.0 },
        { memberId: 'm2', currentWeight: 1.2 }, // Ravi gets higher weight
        { memberId: 'm3', currentWeight: 1.0 },
      ];

      const result = await runDecisionPipeline({
        group,
        members: mockMembers,
        preferences,
        fairnessLedgers,
        strategy: 'utilitarian',
      });

      expect(result.options).toHaveLength(3);
      expect(result.aggregateBudgetFeasibleRange.groupCeiling).toBe(25); // Ravi's $25 was the group ceiling

      // Verify privacy: option explanations should NOT mention Ravi's private budget number
      for (const opt of result.options) {
        expect(opt.explanation.whyThis).toBeDefined();
        expect(opt.explanation.pros.length).toBeGreaterThan(0);
        expect(opt.explanation.whyThis).not.toContain("Ravi's budget is $25");
        expect(opt.explanation.whyThis).not.toContain("Asha's budget is $35");
      }

      // Check per-member satisfactions
      const firstOpt = result.options[0];
      expect(firstOpt.memberSatisfactions).toHaveLength(3);
      for (const ms of firstOpt.memberSatisfactions) {
        expect(ms.score).toBeGreaterThanOrEqual(0);
        expect(ms.score).toBeLessThanOrEqual(100);
      }
    });
  });
});
