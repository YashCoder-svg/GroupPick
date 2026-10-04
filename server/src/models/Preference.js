import mongoose from 'mongoose';

const PreferenceSchema = new mongoose.Schema(
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
      unique: true,
      index: true,
    },
    // PRIVATE: must never be returned to other members
    budget: {
      type: Number,
      required: [true, 'Budget is required'],
      min: [0, 'Budget cannot be negative'],
    },
    hardLimits: {
      type: [String],
      default: [],
    },
    softWishes: {
      type: [String],
      default: [],
    },
    rankedPicks: {
      type: [String],
      default: [],
    },
    customNotes: {
      type: String,
      maxlength: [280, 'Notes cannot exceed 280 characters'],
      default: '',
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

PreferenceSchema.index({ groupId: 1, memberId: 1 }, { unique: true });

export const Preference = mongoose.model('Preference', PreferenceSchema);
export default Preference;
