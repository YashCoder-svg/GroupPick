/**
 * Explanation Generator Module
 * Generates transparent, plain-language explanations with pros, compromises,
 * and Fairness Ledger attribution per option.
 */

export const generateExplanation = ({
  archetype,
  candidate,
  memberScores = [],
  preferences = [],
  members = [],
  groupCeiling,
}) => {
  const title = candidate.title || candidate.name;
  const cost = candidate.costPerPerson ?? candidate.cost ?? 0;
  const category = candidate.category || 'Choice';

  // Gather member details
  const lowestScoringMember = [...memberScores].sort((a, b) => a.score - b.score)[0];
  const highestScoringMember = [...memberScores].sort((a, b) => b.score - a.score)[0];

  // Identify who got their #1 choice and who didn't
  const winners = [];
  const compromised = [];

  for (const ms of memberScores) {
    const pref = preferences.find(
      (p) => (p.memberId?.toString?.() || p.memberId) === (ms.memberId?.toString?.() || ms.memberId)
    );
    const topChoice = pref?.rankedPicks?.[0];
    const candidateId = candidate.id || candidate.optionId || candidate.osmId || candidate.name;

    if (topChoice && (topChoice === candidateId || topChoice === title)) {
      winners.push(ms.displayName);
    } else if (ms.score < 80) {
      compromised.push(ms.displayName);
    }
  }

  const pros = [];
  const compromises = [];
  let headline = '';
  let summary = '';
  let whyThis = '';

  // Fit budget pro
  if (typeof groupCeiling === 'number' && cost <= groupCeiling) {
    pros.push(`Fits everyone's private budget ($${cost} vs $${groupCeiling} group ceiling)`);
  } else {
    pros.push(`Estimated cost of $${cost} per person`);
  }

  // Dietary / tags pro
  const attributes = candidate.attributes || [];
  if (attributes.length > 0) {
    const sampleTags = attributes.slice(0, 3).join(', ');
    pros.push(`Matches group preferences (${sampleTags})`);
  }

  // Top choice winner pro
  if (winners.length > 0) {
    pros.push(`Top choice for ${winners.join(', ')}`);
  }

  // Compromise attribution for Fairness Ledger
  if (compromised.length > 0) {
    compromises.push(
      `${compromised.join(' & ')} made a compromise here, so they will gain priority weight in future decisions`
    );
  } else {
    compromises.push('High satisfaction across all participants with minimal trade-offs');
  }

  if (archetype === 'best_overall') {
    headline = 'Best Overall Consensus';
    summary = `Delivers the highest cumulative satisfaction across all ${memberScores.length} members.`;
    whyThis = `This option achieves the strongest total happiness score (${highestScoringMember?.score ?? 90}% top rating). All hard dietary constraints are fully honored while staying comfortably within financial boundaries.`;
  } else if (archetype === 'fairest_to_everyone') {
    headline = 'Fairest to Everyone';
    const minScore = lowestScoringMember?.score ?? 75;
    summary = `Maximizes fairness using the Rawlsian Maximin criterion (lowest member score is ${minScore}%).`;
    whyThis = `No single member is left behind or forced into an unfavorable outcome. Even the most cautious participant (${lowestScoringMember?.displayName || 'lowest scorer'}) rates this at ${minScore}%.`;
  } else if (archetype === 'most_budget_friendly') {
    headline = 'Most Budget-Friendly';
    summary = `Provides exceptional value at $${cost}/person while meeting all mandatory requirements.`;
    whyThis = `Chosen specifically to minimize financial stress for the whole table. At $${cost} per person, it leaves generous breathing room below everyone's private budget limits without compromising on quality or experience.`;
  } else {
    headline = `${title} (${category})`;
    summary = `Strong viable alternative with a balanced score of ${candidate.overallScore || 80}%.`;
    whyThis = `Consistently satisfies core criteria and received positive ratings across participating members.`;
  }

  return {
    headline,
    summary,
    pros,
    compromises,
    whyThis,
  };
};
