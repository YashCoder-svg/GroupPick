import mongoose from 'mongoose';

const MemberSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
      index: true,
    },
    guestToken: {
      type: String,
      required: true,
      index: true,
    },
    displayName: {
      type: String,
      required: [true, 'Display name is required'],
      trim: true,
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    avatarColor: {
      type: String,
      default: '#3B82F6',
    },
    isOrganizer: {
      type: Boolean,
      default: false,
    },
    hasResponded: {
      type: Boolean,
      default: false,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure uniqueness of guest token per group
MemberSchema.index({ groupId: 1, guestToken: 1 }, { unique: true });

export const Member = mongoose.model('Member', MemberSchema);
export default Member;
