/**
 * Aggregation Strategies Module
 * Implements Utilitarian, Maximin, Nash Social Welfare, and Borda Count.
 */

/**
 * Utilitarian: Sum of all member utilities (Classical Benthemite efficiency)
 */
export const utilitarianStrategy = (scores) => {
  if (scores.length === 0) return 0;
  return scores.reduce((sum, s) => sum + s, 0);
};

/**
 * Maximin: Maximize the utility of the least satisfied member (Rawlsian fairness)
 */
export const maximinStrategy = (scores) => {
  if (scores.length === 0) return 0;
  return Math.min(...scores);
};

/**
 * Nash Social Welfare: Maximize the geometric mean / product of utilities
 * Balances overall efficiency with equality, penalizing extreme disparities.
 * Uses log space: exp(sum(ln(s + 1)) / N)
 */
export const nashWelfareStrategy = (scores) => {
  if (scores.length === 0) return 0;
  const logSum = scores.reduce((sum, s) => sum + Math.log(Math.max(1, s) + 1), 0);
  const geometricMean = Math.exp(logSum / scores.length) - 1;
  return Math.round(geometricMean * 100) / 100;
};

/**
 * Borda Count: Positional scoring system for ranked inputs
 * Each member's candidate rankings contribute points: 1st gets (M - 1), 2nd gets (M - 2), etc.
 */
export const computeBordaScores = (matrix = []) => {
  if (matrix.length === 0) return [];
  const candidateCount = matrix.length;
  const bordaTotals = new Array(candidateCount).fill(0);

  // If there are members, rank candidates for each member
  const memberCount = matrix[0]?.memberScores?.length || 0;

  for (let mIdx = 0; mIdx < memberCount; mIdx++) {
    // Collect candidate index and member score
    const memberRanking = matrix.map((row, cIdx) => ({
      candidateIndex: cIdx,
      score: row.memberScores[mIdx]?.score ?? 0,
      rankBonus: row.memberScores[mIdx]?.breakdown?.rankBonus ?? 0,
    }));

    // Sort descending by score, breaking ties with rankBonus
    memberRanking.sort((a, b) => b.score - a.score || b.rankBonus - a.rankBonus);

    // Assign Borda points: (candidateCount - 1 - rank)
    memberRanking.forEach((item, rank) => {
      const points = Math.max(0, candidateCount - 1 - rank);
      bordaTotals[item.candidateIndex] += points;
    });
  }

  return bordaTotals;
};

/**
 * Aggregates all strategies for each candidate in the matrix
 */
export const aggregateMatrix = (matrix = [], strategy = 'utilitarian') => {
  if (matrix.length === 0) return [];

  const bordaScores = computeBordaScores(matrix);

  return matrix.map((row, idx) => {
    const scores = row.memberScores.map((ms) => ms.score);
    const utilitarianScore = utilitarianStrategy(scores);
    const minSatisfaction = maximinStrategy(scores);
    const nashScore = nashWelfareStrategy(scores);
    const bordaScore = bordaScores[idx] ?? 0;

    const averageSatisfaction = scores.length > 0 ? Math.round(utilitarianScore / scores.length) : 0;

    let strategyScore = utilitarianScore;
    if (strategy === 'maximin') strategyScore = minSatisfaction;
    else if (strategy === 'nash') strategyScore = nashScore;
    else if (strategy === 'borda') strategyScore = bordaScore;

    return {
      candidate: row.candidate,
      memberScores: row.memberScores,
      utilitarianScore,
      minSatisfaction,
      nashScore,
      bordaScore,
      averageSatisfaction,
      strategyScore,
    };
  });
};
