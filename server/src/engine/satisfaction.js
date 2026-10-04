/**
 * Satisfaction Matrix Computation Module
 * Computes a normalized 0-100 satisfaction score for every member x candidate option.
 */

export const computeMemberSatisfaction = ({ member, preference, candidate }) => {
  const memberBudget = preference?.budget ?? 50;
  const softWishes = preference?.softWishes || [];
  const rankedPicks = preference?.rankedPicks || [];
  const candidateCost = candidate.costPerPerson ?? candidate.cost ?? 25;
  const candidateTags = (candidate.attributes || []).map((t) => t.toLowerCase().trim());
  const candidateCategory = (candidate.category || '').toLowerCase();
  const candidateName = (candidate.name || candidate.title || '').toLowerCase();
  const candidateId = candidate.id || candidate.optionId || candidate.osmId;

  // 1. Base score (baseline for passing hard limits)
  let score = 40;

  // 2. Budget Fit (0 to 25 points)
  let budgetFitScore = 0;
  if (candidateCost <= memberBudget) {
    const ratio = candidateCost / Math.max(memberBudget, 1);
    // Ideal ratio is 40%-80% of budget (neither ridiculously cheap nor stretching the wallet)
    if (ratio >= 0.4 && ratio <= 0.85) {
      budgetFitScore = 25;
    } else if (ratio < 0.4) {
      budgetFitScore = 22; // Great budget saver
    } else {
      budgetFitScore = 18; // Close to the limit
    }
  } else {
    // If over budget (in relaxed edge cases)
    const excess = candidateCost - memberBudget;
    budgetFitScore = Math.max(0, 15 - excess * 2);
  }
  score += budgetFitScore;

  // 3. Soft Wishes Matching (0 to 25 points)
  const matchedWishes = [];
  if (softWishes.length > 0) {
    for (const wish of softWishes) {
      const normalizedWish = wish.toLowerCase().trim();
      const isMatched =
        candidateTags.some((t) => t.includes(normalizedWish) || normalizedWish.includes(t)) ||
        candidateCategory.includes(normalizedWish) ||
        candidateName.includes(normalizedWish);

      if (isMatched) {
        matchedWishes.push(wish);
      }
    }
    const matchFraction = matchedWishes.length / softWishes.length;
    score += Math.round(matchFraction * 25);
  } else {
    // If member specified no soft wishes, grant standard neutral bonus
    score += 15;
  }

  // 4. Personal Ranked Picks Bonus (0 to 15 points)
  let rankBonus = 0;
  if (rankedPicks.length > 0 && candidateId) {
    const rankIndex = rankedPicks.findIndex(
      (p) => p === candidateId || p === candidate.name || p === candidate.title
    );
    if (rankIndex === 0) {
      rankBonus = 15; // #1 top choice!
    } else if (rankIndex === 1) {
      rankBonus = 10; // #2 choice
    } else if (rankIndex === 2) {
      rankBonus = 6; // #3 choice
    } else if (rankIndex !== -1) {
      rankBonus = 3;
    }
  }
  score += rankBonus;

  // 5. Quality / Rating Bonus (0 to 10 points)
  const rating = candidate.rating || 4.5;
  const ratingBonus = Math.min(10, Math.round((rating / 5) * 10));
  score += ratingBonus;

  // Clamp score strictly between 0 and 100
  const finalScore = Math.min(100, Math.max(0, Math.round(score)));

  // Generate personalized breakdown explanation
  let personalExplanation = '';
  if (rankBonus === 15) {
    personalExplanation = `This was your #1 top choice!`;
  } else if (matchedWishes.length > 0) {
    personalExplanation = `Satisfies your wishes for ${matchedWishes.join(', ')} and fits budget ($${candidateCost} vs max $${memberBudget}).`;
  } else if (candidateCost <= memberBudget) {
    personalExplanation = `Comfortably within your private budget ($${candidateCost}).`;
  } else {
    personalExplanation = `Viable consensus pick matching group constraints.`;
  }

  return {
    memberId: member._id,
    displayName: member.displayName,
    score: finalScore,
    breakdown: {
      hardConstraintPassed: true,
      softWishesMatched: matchedWishes,
      budgetFitScore,
      rankBonus,
      ratingBonus,
      explanation: personalExplanation,
    },
  };
};

/**
 * Builds the complete satisfaction matrix for all members x candidate options
 */
export const buildSatisfactionMatrix = ({ members = [], preferences = [], candidates = [] }) => {
  const prefMap = new Map();
  for (const p of preferences) {
    const key = p.memberId?.toString?.() || p.memberId;
    prefMap.set(key, p);
  }

  const matrix = []; // rows = candidates, columns = members

  for (const candidate of candidates) {
    const memberScores = members.map((member) => {
      const memberIdStr = member._id?.toString?.() || member._id;
      const pref = prefMap.get(memberIdStr) || { budget: 40, softWishes: [], hardLimits: [] };
      return computeMemberSatisfaction({ member, preference: pref, candidate });
    });

    matrix.push({
      candidate,
      memberScores,
    });
  }

  return matrix;
};
