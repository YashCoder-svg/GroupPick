/**
 * Hard-Constraint Filtering Module
 * Any member's hard limit removes an option completely.
 * Edge cases: zero feasible options -> generate relaxation suggestion.
 */

// Normalized map of synonymous dietary and attribute tags
const TAG_ALIASES = {
  vegan: ['vegan', 'plant-based', 'vegan-friendly'],
  vegetarian: ['vegetarian', 'vegan', 'plant-based', 'vegetarian-friendly'],
  halal: ['halal', 'halal-friendly', 'halal-certified'],
  kosher: ['kosher', 'kosher-friendly', 'kosher-certified', 'kosher-style'],
  'gluten-free': ['gluten-free', 'celiac-safe'],
  wheelchair: ['wheelchair', 'accessible', 'step-free'],
  'no-alcohol': ['no-alcohol', 'alcohol-free', 'dry'],
  indoor: ['indoor', 'museum', 'covered'],
  'free-entry': ['free', 'free-entry', 'public-park'],
};

/**
 * Checks if a candidate satisfies a specific hard constraint tag
 */
export const candidateSatisfiesConstraint = (candidate, constraint) => {
  const normalizedConstraint = constraint.toLowerCase().trim();
  const candidateTags = (candidate.attributes || []).map((t) => t.toLowerCase().trim());
  const category = (candidate.category || '').toLowerCase();
  const name = (candidate.name || candidate.title || '').toLowerCase();

  // Alias lookup
  const validTags = TAG_ALIASES[normalizedConstraint] || [normalizedConstraint];

  // Check if any alias exists in tags, category, or name
  for (const tag of validTags) {
    if (candidateTags.includes(tag)) return true;
    if (category.includes(tag)) return true;
    if (name.includes(tag)) return true;
  }

  // Special case: strict-budget constraint
  if (normalizedConstraint === 'strict-budget' || normalizedConstraint === 'budget-strict') {
    return true; // Budget is checked explicitly per member
  }

  return false;
};

/**
 * Filter candidates against all responding members' hard limits and private budgets
 */
export const filterHardConstraints = ({ candidates = [], members = [], preferences = [] }) => {
  const filterStats = {
    initialCandidatesCount: candidates.length,
    feasibleCount: 0,
    eliminatedByBudget: 0,
    eliminatedByDietOrHardLimits: 0,
    reasonsByCandidate: {},
    constraintEliminationCounts: {},
  };

  if (candidates.length === 0) {
    return {
      feasibleCandidates: [],
      filterStats,
      relaxedConstraintsSuggestion: 'No candidates available to filter.',
    };
  }

  // Responding members only
  const validPreferences = preferences.filter(
    (p) => typeof p.budget === 'number' && !isNaN(p.budget)
  );

  // If no members answered yet, all candidates pass through
  if (validPreferences.length === 0) {
    return {
      feasibleCandidates: candidates,
      filterStats: {
        ...filterStats,
        feasibleCount: candidates.length,
      },
      relaxedConstraintsSuggestion: null,
    };
  }

  const feasibleCandidates = [];

  for (const candidate of candidates) {
    let passed = true;
    const eliminationReasons = [];

    for (const pref of validPreferences) {
      // 1. Budget hard limit check
      // A candidate whose cost per person exceeds any member's private budget is strictly eliminated
      const candidateCost = candidate.costPerPerson ?? candidate.cost ?? 0;
      if (candidateCost > pref.budget) {
        passed = false;
        const diff = candidateCost - pref.budget;
        eliminationReasons.push(`Exceeds budget limit by $${diff}`);
        filterStats.eliminatedByBudget++;

        const key = `budget:+$${diff}`;
        filterStats.constraintEliminationCounts[key] = (filterStats.constraintEliminationCounts[key] || 0) + 1;
        break; // Fail immediately on budget violation
      }

      // 2. Attribute / dietary hard limits check
      const hardLimits = pref.hardLimits || [];
      for (const limit of hardLimits) {
        if (!limit || limit === 'strict-budget') continue;
        if (!candidateSatisfiesConstraint(candidate, limit)) {
          passed = false;
          eliminationReasons.push(`Missing mandatory requirement: '${limit}'`);
          filterStats.eliminatedByDietOrHardLimits++;

          filterStats.constraintEliminationCounts[limit] =
            (filterStats.constraintEliminationCounts[limit] || 0) + 1;
          break;
        }
      }

      if (!passed) break;
    }

    if (passed) {
      feasibleCandidates.push(candidate);
    } else {
      filterStats.reasonsByCandidate[candidate.id || candidate.name] = eliminationReasons;
    }
  }

  filterStats.feasibleCount = feasibleCandidates.length;

  // Handle edge case: ZERO feasible candidates
  let relaxedConstraintsSuggestion = null;
  if (feasibleCandidates.length === 0 && candidates.length > 0) {
    // Find the biggest bottleneck
    const sortedConstraints = Object.entries(filterStats.constraintEliminationCounts).sort(
      (a, b) => b[1] - a[1]
    );

    const lowestBudget = Math.min(...validPreferences.map((p) => p.budget));
    const lowestCandidateCost = Math.min(...candidates.map((c) => c.costPerPerson ?? c.cost ?? 20));

    if (lowestCandidateCost > lowestBudget) {
      const budgetDiff = lowestCandidateCost - lowestBudget;
      relaxedConstraintsSuggestion = `No options fit all current constraints. Raising the group budget ceiling from $${lowestBudget} to $${lowestCandidateCost} (+${budgetDiff}) would unlock candidate options.`;
    } else if (sortedConstraints.length > 0) {
      const [topConstraint, count] = sortedConstraints[0];
      relaxedConstraintsSuggestion = `No options satisfy every constraint simultaneously. Relaxing the strict '${topConstraint}' requirement would instantly unlock ${count} options.`;
    } else {
      relaxedConstraintsSuggestion =
        'No options matched all member requirements. Consider softening specific dietary restrictions or expanding the geographic range.';
    }
  }

  return {
    feasibleCandidates,
    filterStats,
    relaxedConstraintsSuggestion,
  };
};
