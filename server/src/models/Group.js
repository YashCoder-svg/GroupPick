import mongoose from 'mongoose';

const GroupSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Group title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    packId: {
      type: String,
      required: true,
      enum: ['food', 'trip', 'custom'],
      default: 'food',
    },
    destination: {
      name: { type: String, trim: true, default: 'Delhi' },
      state: { type: String, trim: true, default: 'Delhi' },
      lat: { type: Number, default: 28.6139 },
      lng: { type: Number, default: 77.209 },
      bbox: { type: [Number], default: [] },
    },
    packConfig: {
      city: {
        type: String,
        default: 'Delhi',
      },
      centerLocation: {
        lat: Number,
        lng: Number,
      },
      date: {
        type: String,
      },
      timeRange: {
        start: { type: String, default: '18:00' },
        end: { type: String, default: '23:00' },
      },
      maxBudgetCap: {
        type: Number,
      },
      customOptions: [
        {
          id: { type: String, required: true },
          name: { type: String, required: true },
          description: String,
          category: String,
          cost: { type: Number, default: 0 },
          tags: [String],
          openingHours: {
            open: String,
            close: String,
          },
        },
      ],
    },
    organizerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    organizerToken: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['collecting', 'decided', 'confirmed'],
      default: 'collecting',
    },
    strategy: {
      type: String,
      enum: ['utilitarian', 'maximin', 'nash', 'borda'],
      default: 'utilitarian',
    },
    latestDecisionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Decision',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index to quickly look up groups by organizer
GroupSchema.index({ organizerId: 1, createdAt: -1 });

export const Group = mongoose.model('Group', GroupSchema);
export default Group;
