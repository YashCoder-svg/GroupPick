/**
 * Fairness Weighting Module
 * Applies dynamic weights bounded between 0.8 and 1.3, normalized across group members.
 */

export const applyFairnessWeights = ({ matrix = [], fairnessLedgers = [], members = [] }) => {
  if (members.length === 0 || matrix.length === 0) {
    return matrix;
  }

  // Create lookup map for ledger weights
  const ledgerMap = new Map();
  for (const ledger of fairnessLedgers) {
    const key = ledger.memberId?.toString?.() || ledger.memberId;
    ledgerMap.set(key, ledger.currentWeight ?? 1.0);
  }

  // Extract raw weights, bounded strictly to [0.8, 1.3]
  const rawWeights = members.map((member) => {
    const key = member._id?.toString?.() || member._id;
    const raw = ledgerMap.get(key) ?? 1.0;
    return Math.min(1.3, Math.max(0.8, raw));
  });

  // Normalize weights so the mean weight equals 1.0
  const totalWeight = rawWeights.reduce((sum, w) => sum + w, 0);
  const meanWeight = totalWeight / members.length;
  const normalizedWeights = rawWeights.map((w) =>
    meanWeight > 0 ? Math.round((w / meanWeight) * 1000) / 1000 : 1.0
  );

  // Apply to matrix
  return matrix.map((row) => {
    const weightedMemberScores = row.memberScores.map((ms, index) => {
      const weight = normalizedWeights[index] ?? 1.0;
      const weightedScore = Math.min(100, Math.max(0, Math.round(ms.score * weight)));

      return {
        ...ms,
        score: weightedScore,
        rawScore: ms.score,
        weightApplied: weight,
      };
    });

    return {
      candidate: row.candidate,
      memberScores: weightedMemberScores,
    };
  });
};
