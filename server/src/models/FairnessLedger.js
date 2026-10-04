import mongoose from 'mongoose';

const HistoryEntrySchema = new mongoose.Schema(
  {
    decisionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Decision',
      required: true,
    },
    topChoiceId: {
      type: String,
      default: null,
    },
    winningOptionId: {
      type: String,
      required: true,
    },
    won: {
      type: Boolean,
      required: true,
    },
    weightBefore: {
      type: Number,
      required: true,
    },
    weightAfter: {
      type: Number,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const FairnessLedgerSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
      index: true,
    },
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      required: true,
      index: true,
    },
    displayName: {
      type: String,
      default: '',
    },
    timesTopChoiceWon: {
      type: Number,
      default: 0,
      min: 0,
    },
    timesTopChoiceLost: {
      type: Number,
      default: 0,
      min: 0,
    },
    currentWeight: {
      type: Number,
      default: 1.0,
      min: 0.8,
      max: 1.3,
    },
    history: {
      type: [HistoryEntrySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

FairnessLedgerSchema.index({ groupId: 1, memberId: 1 }, { unique: true });

export const FairnessLedger = mongoose.model('FairnessLedger', FairnessLedgerSchema);
export default FairnessLedger;
