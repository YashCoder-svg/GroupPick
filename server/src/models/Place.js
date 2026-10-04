import mongoose from 'mongoose';

const PriceReportSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true,
    min: [1, 'Reported price must be greater than zero'],
  },
  reportedBy: {
    type: String,
    default: 'anonymous',
  },
  reportedAt: {
    type: Date,
    default: Date.now,
  },
});

const PlaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    packType: {
      type: String,
      enum: ['food', 'trip', 'both'],
      default: 'food',
      index: true,
    },
    city: {
      type: String,
      required: true,
      index: true,
    },
    destinationName: {
      type: String,
      index: true,
    },
    category: {
      type: String,
      required: true,
      index: true,
    },
    address: {
      type: String,
      default: '',
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
        required: true,
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    priceTier: {
      type: Number,
      enum: [1, 2, 3, 4],
      default: 2,
    },
    priceSource: {
      type: String,
      enum: ['estimated', 'reported'],
      default: 'estimated',
      index: true,
    },
    priceReports: [PriceReportSchema],
    estimatedCostPerPerson: {
      type: Number,
      required: true,
      default: 350, // Realistic INR default
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: 4.5,
    },
    reviewCount: {
      type: Number,
      default: 120,
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    attributes: {
      type: [String],
      default: [],
      index: true,
    },
    openingHours: {
      open: { type: String, default: '10:00' },
      close: { type: String, default: '22:00' },
    },
    recommendedDurationMinutes: {
      type: Number,
      default: 90,
    },
    osmId: {
      type: String,
      index: true,
    },
    photoUrl: {
      type: String,
      default: '',
    },
    website: {
      type: String,
      default: '',
    },
    phone: {
      type: String,
      default: '',
    },
    cachedAt: {
      type: Date,
      default: Date.now,
      expires: 604800, // 7 days TTL (60 * 60 * 24 * 7)
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Mandatory 2dsphere geospatial index
PlaceSchema.index({ location: '2dsphere' });
PlaceSchema.index({ city: 1, packType: 1, priceTier: 1 });
PlaceSchema.index({ destinationName: 1, packType: 1 });

/**
 * Recalculate price tier and source based on reports
 */
PlaceSchema.methods.recordPriceReport = async function (amount, reportedBy = 'anonymous') {
  this.priceReports.push({ amount, reportedBy, reportedAt: new Date() });

  // Use reported prices instead of estimates once there are 3+ reports (median)
  if (this.priceReports.length >= 3) {
    const amounts = this.priceReports.map((r) => r.amount).sort((a, b) => a - b);
    const mid = Math.floor(amounts.length / 2);
    const median = amounts.length % 2 !== 0 ? amounts[mid] : Math.round((amounts[mid - 1] + amounts[mid]) / 2);

    this.estimatedCostPerPerson = median;
    this.priceSource = 'reported';

    // Derive tier from median price
    if (median <= 250) {
      this.priceTier = 1;
    } else if (median <= 600) {
      this.priceTier = 2;
    } else if (median <= 1500) {
      this.priceTier = 3;
    } else {
      this.priceTier = 4;
    }
  }

  return this.save();
};

export const Place = mongoose.model('Place', PlaceSchema);
export default Place;
