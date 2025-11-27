const mongoose = require('mongoose');

/**
 * MonthlyConsumption Model
 * 
 * Stores aggregated monthly power consumption data for fast retrieval.
 * This ensures historical data remains available even when devices go offline.
 */
const monthlyConsumptionSchema = new mongoose.Schema({
  deviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    required: true,
    index: true
  },
  
  deviceName: {
    type: String,
    required: true
  },
  
  classroom: {
    type: String,
    default: 'unassigned',
    index: true
  },
  
  // Year and month
  year: {
    type: Number,
    required: true,
    index: true
  },
  
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12,
    index: true
  },
  
  // Consumption data
  energyConsumptionKwh: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  
  costINR: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  
  electricityRateINR: {
    type: Number,
    required: true,
    default: 7.5
  },
  
  runtimeHours: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  
  avgPowerWatts: {
    type: Number,
    default: 0,
    min: 0
  },
  
  peakPowerWatts: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Daily breakdown
  dailyBreakdown: [{
    day: Number,
    energyKwh: Number,
    costINR: Number,
    runtimeHours: Number
  }],
  
  deviceOnlineHours: {
    type: Number,
    default: 0,
    min: 0
  },
  
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  
  isFinal: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Compound indexes
monthlyConsumptionSchema.index({ deviceId: 1, year: 1, month: 1 }, { unique: true });
monthlyConsumptionSchema.index({ year: 1, month: 1, classroom: 1 });

// Static method to upsert monthly consumption
monthlyConsumptionSchema.statics.upsertMonthlyConsumption = async function(data) {
  return await this.findOneAndUpdate(
    { deviceId: data.deviceId, year: data.year, month: data.month },
    { $set: data },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

module.exports = mongoose.model('MonthlyConsumption', monthlyConsumptionSchema);
