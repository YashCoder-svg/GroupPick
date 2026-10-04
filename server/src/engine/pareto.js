/**
 * Pareto Frontier and Archetype Selection Module
 * Evaluates candidates over (total satisfaction, minimum satisfaction, cost).
 * Selects 3 distinct Pareto options: 'best_overall', 'fairest_to_everyone', 'most_budget_friendly'.
 */

/**
 * Checks if candidate B strictly dominates candidate A in Pareto terms:
 * B is at least as good in TotalSat, MinSat, and Cost (lower is better),
 * and strictly better in at least one objective.
 */
export const dominates = (b, a) => {
  const bCost = b.candidate.costPerPerson ?? b.candidate.cost ?? 0;
  const aCost = a.candidate.costPerPerson ?? a.candidate.cost ?? 0;

  const bTotal = b.utilitarianScore;
  const aTotal = a.utilitarianScore;

  const bMin = b.minSatisfaction;
  const aMin = a.minSatisfaction;

  const atLeastAsGood = bTotal >= aTotal && bMin >= aMin && bCost <= aCost;
  const strictlyBetter = bTotal > aTotal || bMin > aMin || bCost < aCost;

  return atLeastAsGood && strictlyBetter;
};

/**
 * Computes the non-dominated Pareto frontier
 */
export const computeParetoFrontier = (candidatesWithScores = []) => {
  if (candidatesWithScores.length <= 1) {
    return candidatesWithScores;
  }

  const frontier = [];

  for (let i = 0; i < candidatesWithScores.length; i++) {
    const current = candidatesWithScores[i];
    let isDominated = false;

    for (let j = 0; j < candidatesWithScores.length; j++) {
      if (i === j) continue;
      const other = candidatesWithScores[j];
      if (dominates(other, current)) {
        isDominated = true;
        break;
      }
    }

    if (!isDominated) {
      frontier.push(current);
    }
  }

  // If strict Pareto frontier filtered too aggressively, fall back to entire sorted set
  return frontier.length > 0 ? frontier : candidatesWithScores;
};

/**
 * Selects the 3 distinct archetypes from the Pareto frontier
 */
export const selectThreeArchetypes = (aggregatedCandidates = [], strategy = 'utilitarian') => {
  if (aggregatedCandidates.length === 0) {
    return [];
  }

  const frontier = computeParetoFrontier(aggregatedCandidates);
  const pool = frontier.length >= 3 ? frontier : aggregatedCandidates;

  const selected = [];
  const chosenIds = new Set();

  const getId = (item) =>
    item.candidate.id || item.candidate.optionId || item.candidate.osmId || item.candidate.name;

  // 1. "Best overall": highest strategyScore / utilitarianScore
  const sortedByUtility = [...pool].sort((a, b) => {
    return b.strategyScore - a.strategyScore || b.utilitarianScore - a.utilitarianScore;
  });

  const bestOverall = sortedByUtility[0];
  selected.push({
    ...bestOverall,
    archetype: 'best_overall',
  });
  chosenIds.add(getId(bestOverall));

  // If only 1 candidate exists
  if (pool.length === 1 || aggregatedCandidates.length === 1) {
    return selected;
  }

  // 2. "Fairest to everyone": highest minSatisfaction (Rawlsian champion)
  // Search pool first, then all candidates if needed to find distinct option
  const remainingForFairness = [...pool, ...aggregatedCandidates]
    .filter((c) => !chosenIds.has(getId(c)))
    .sort((a, b) => {
      // Prioritize highest minimum satisfaction, break ties with total utility
      return b.minSatisfaction - a.minSatisfaction || b.utilitarianScore - a.utilitarianScore;
    });

  if (remainingForFairness.length > 0) {
    const fairest = remainingForFairness[0];
    selected.push({
      ...fairest,
      archetype: 'fairest_to_everyone',
    });
    chosenIds.add(getId(fairest));
  }

  // If only 2 candidates exist
  if (chosenIds.size >= aggregatedCandidates.length) {
    return selected;
  }

  // 3. "Most budget-friendly": lowest cost among candidates maintaining decent satisfaction
  const remainingForBudget = [...pool, ...aggregatedCandidates]
    .filter((c) => !chosenIds.has(getId(c)))
    .sort((a, b) => {
      const aCost = a.candidate.costPerPerson ?? a.candidate.cost ?? 0;
      const bCost = b.candidate.costPerPerson ?? b.candidate.cost ?? 0;
      // Primary: lowest cost; Secondary: higher average satisfaction
      return aCost - bCost || b.averageSatisfaction - a.averageSatisfaction;
    });

  if (remainingForBudget.length > 0) {
    const budgetChamp = remainingForBudget[0];
    selected.push({
      ...budgetChamp,
      archetype: 'most_budget_friendly',
    });
    chosenIds.add(getId(budgetChamp));
  }

  return selected;
};
