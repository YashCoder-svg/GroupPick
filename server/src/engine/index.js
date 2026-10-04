/**
 * GroupPick Decision Engine
 * Pure functional pipeline for multi-criteria consensus, fairness weighting,
 * Pareto frontier optimization, and explainable social choice.
 */

import { generateCandidates } from './candidates.js';
import { filterHardConstraints } from './hardConstraints.js';
import { buildSatisfactionMatrix } from './satisfaction.js';
import { applyFairnessWeights } from './fairness.js';
import { aggregateMatrix } from './aggregation.js';
import { selectThreeArchetypes } from './pareto.js';
import { generateExplanation } from './explanation.js';
import { optimizeDayRoute } from './tspRouter.js';
import { Place } from '../models/Place.js';
import { searchPlaces } from '../services/placesService.js';

export {
  generateCandidates,
  filterHardConstraints,
  buildSatisfactionMatrix,
  applyFairnessWeights,
  aggregateMatrix,
  selectThreeArchetypes,
  generateExplanation,
  optimizeDayRoute,
};

/**
 * Runs the complete decision pipeline
 */
export const runDecisionPipeline = async ({
  group,
  members = [],
  preferences = [],
  fairnessLedgers = [],
  strategy = 'utilitarian',
}) => {
  // 1. Candidate Generation
  let rawPlaces = [];
  if (group.packId !== 'custom') {
    const destination = group.destination || {};
    const destinationName = destination.name || group.packConfig?.city || 'Delhi';
    rawPlaces = await searchPlaces({
      destinationName,
      city: destinationName,
      lat: destination.lat,
      lng: destination.lng,
      packType: group.packId === 'trip' ? 'trip' : 'food',
      radius: 5000,
      limit: 30,
    });
  }

  const allCandidates = await generateCandidates({ group, places: rawPlaces });

  // 2. Aggregate Budget Metrics
  const budgets = preferences
    .map((p) => p.budget)
    .filter((b) => typeof b === 'number' && !isNaN(b));

  const minBudget = budgets.length > 0 ? Math.min(...budgets) : 0;
  const maxBudget = budgets.length > 0 ? Math.max(...budgets) : 100;
  const groupCeiling = minBudget;

  // 3. Hard-Constraint Filtering
  const { feasibleCandidates, filterStats, relaxedConstraintsSuggestion } =
    filterHardConstraints({
      candidates: allCandidates,
      members,
      preferences,
    });

  // Edge case: If 0 feasible candidates, use relaxed set and provide clear relaxation suggestions
  let candidatePool = feasibleCandidates;
  let isRelaxedFallback = false;

  if (candidatePool.length === 0 && allCandidates.length > 0) {
    isRelaxedFallback = true;
    // Sort all candidates by lowest cost to provide most affordable alternatives
    candidatePool = [...allCandidates].sort(
      (a, b) => (a.costPerPerson ?? a.cost ?? 0) - (b.costPerPerson ?? b.cost ?? 0)
    ).slice(0, 3);
  }

  // 4. Satisfaction Matrix
  const rawMatrix = buildSatisfactionMatrix({
    members,
    preferences,
    candidates: candidatePool,
  });

  // 5. Fairness Weighting
  const weightedMatrix = applyFairnessWeights({
    matrix: rawMatrix,
    fairnessLedgers,
    members,
  });

  // 6. Aggregation via selected strategy
  const aggregatedCandidates = aggregateMatrix(weightedMatrix, strategy);

  // 7. Pareto Frontier and 3 Archetypes Selection
  const selectedArchetypes = selectThreeArchetypes(aggregatedCandidates, strategy);

  // 8. Trip Route Optimization (for Trip pack) & Explanations
  const finalOptions = selectedArchetypes.map((item, index) => {
    const candidate = item.candidate;
    const archetype = item.archetype || (index === 0 ? 'best_overall' : index === 1 ? 'fairest_to_everyone' : 'most_budget_friendly');

    const explanation = generateExplanation({
      archetype,
      candidate,
      memberScores: item.memberScores,
      preferences,
      members,
      groupCeiling,
    });

    if (isRelaxedFallback) {
      explanation.compromises.unshift(
        relaxedConstraintsSuggestion || 'Relaxed strict constraints to find viable options'
      );
    }

    let route = null;
    if (group.packId === 'trip') {
      // Build a 2-3 stop route around this anchor landmark
      const otherPlaces = allCandidates.filter((c) => c.id !== candidate.id).slice(0, 2);
      const itineraryStops = [candidate, ...otherPlaces];
      route = optimizeDayRoute({ places: itineraryStops });
    }

    return {
      optionId: candidate.id || candidate.optionId || `opt-${index + 1}`,
      optionType: candidate.optionType || 'place',
      title: candidate.title || candidate.name,
      description: candidate.description || '',
      category: candidate.category || 'General',
      priceTier: candidate.priceTier || 2,
      costPerPerson: candidate.costPerPerson ?? candidate.cost ?? 25,
      photoUrl: candidate.photoUrl || '',
      location: candidate.location || null,
      attributes: candidate.attributes || [],
      archetype,
      overallScore: item.averageSatisfaction,
      minSatisfaction: item.minSatisfaction,
      utilitarianScore: item.utilitarianScore,
      nashScore: item.nashScore,
      bordaScore: item.bordaScore,
      memberSatisfactions: item.memberScores.map((ms) => ({
        memberId: ms.memberId,
        displayName: ms.displayName,
        score: ms.score,
        weightApplied: ms.weightApplied,
        breakdown: ms.breakdown,
      })),
      explanation,
      route,
    };
  });

  return {
    options: finalOptions,
    aggregateBudgetFeasibleRange: {
      min: minBudget,
      max: maxBudget,
      groupCeiling,
    },
    inputsSnapshot: {
      memberCount: members.length,
      respondedCount: preferences.length,
      filterStats,
      relaxedConstraintsSuggestion,
    },
  };
};
