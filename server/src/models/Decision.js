import mongoose from 'mongoose';

const MemberSatisfactionSchema = new mongoose.Schema(
  {
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      required: true,
    },
    displayName: {
      type: String,
      required: true,
    },
    score: {
      type: Number,
      min: 0,
      max: 100,
      required: true,
    },
    weightApplied: {
      type: Number,
      default: 1.0,
    },
    breakdown: {
      hardConstraintPassed: { type: Boolean, default: true },
      softWishesMatched: [String],
      budgetFitScore: Number,
      rankBonus: Number,
      explanation: String,
    },
  },
  { _id: false }
);

const RouteStopSchema = new mongoose.Schema(
  {
    stopIndex: Number,
    placeId: String,
    name: String,
    category: String,
    address: String,
    arrivalTime: String,
    departureTime: String,
    durationMinutes: Number,
    travelTimeFromPreviousMinutes: Number,
    coordinates: [Number],
  },
  { _id: false }
);

const OptionResultSchema = new mongoose.Schema(
  {
    optionId: { type: String, required: true },
    optionType: { type: String, enum: ['place', 'custom', 'itinerary'], default: 'place' },
    title: { type: String, required: true },
    description: String,
    category: String,
    priceTier: Number,
    costPerPerson: Number,
    photoUrl: String,
    location: {
      lat: Number,
      lng: Number,
      address: String,
    },
    attributes: [String],
    archetype: {
      type: String,
      enum: ['best_overall', 'fairest_to_everyone', 'most_budget_friendly'],
      required: true,
    },
    overallScore: { type: Number, required: true },
    minSatisfaction: { type: Number, required: true },
    utilitarianScore: Number,
    nashScore: Number,
    bordaScore: Number,
    memberSatisfactions: [MemberSatisfactionSchema],
    explanation: {
      headline: String,
      summary: String,
      pros: [String],
      compromises: [String],
      whyThis: String,
    },
    route: {
      stops: [RouteStopSchema],
      totalTravelTimeMinutes: Number,
      totalDurationMinutes: Number,
    },
  },
  { _id: false }
);

const DecisionSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
      index: true,
    },
    packId: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['draft', 'confirmed'],
      default: 'draft',
    },
    confirmedOptionId: {
      type: String,
      default: null,
    },
    strategyUsed: {
      type: String,
      enum: ['utilitarian', 'maximin', 'nash', 'borda'],
      default: 'utilitarian',
    },
    options: {
      type: [OptionResultSchema],
      validate: [val => val.length <= 3, 'Options cannot exceed 3'],
    },
    aggregateBudgetFeasibleRange: {
      min: Number,
      max: Number,
      groupCeiling: Number,
    },
    inputsSnapshot: {
      memberCount: Number,
      respondedCount: Number,
      filterStats: {
        initialCandidatesCount: Number,
        feasibleCount: Number,
        eliminatedByBudget: Number,
        eliminatedByDietOrHardLimits: Number,
      },
      relaxedConstraintsSuggestion: String,
    },
    confirmedAt: Date,
  },
  {
    timestamps: true,
  }
);

export const Decision = mongoose.model('Decision', DecisionSchema);
export default Decision;
