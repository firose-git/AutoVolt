const mongoose = require('mongoose');

/**
 * DailyConsumption Model
 * 
 * Stores aggregated daily power consumption data for fast retrieval.
 * This ensures historical data remains available even when devices go offline.
 * 
 * Data is calculated from ActivityLog and stored permanently.
 */
const dailyConsumptionSchema = new mongoose.Schema({
  // Device reference
  deviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    required: true,
    index: true
  },
  
  // Device metadata (denormalized for fast queries)
  deviceName: {
    type: String,
    required: true
  },
  
  classroom: {
    type: String,
    default: 'unassigned',
    index: true
  },
  
  // Date (YYYY-MM-DD format)
  date: {
    type: Date,
    required: true,
    index: true
  },
  
  // Consumption data
  energyConsumptionKwh: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  
  // Cost in INR (calculated at time of aggregation)
  costINR: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  
  // Electricity rate used for this calculation
  electricityRateINR: {
    type: Number,
    required: true,
    default: 7.5
  },
  
  // Runtime in hours
  runtimeHours: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  
  // Average power consumption in watts
  avgPowerWatts: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Peak power consumption in watts
  peakPowerWatts: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Switch statistics
  switchStats: [{
    switchId: String,
    switchName: String,
    onTimeHours: Number,
    energyKwh: Number
  }],
  
  // Device was online for how many hours this day
  deviceOnlineHours: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Metadata
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  
  // Flag to indicate if this is final (day has ended) or still updating
  isFinal: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Compound index for fast queries
dailyConsumptionSchema.index({ deviceId: 1, date: 1 }, { unique: true });
dailyConsumptionSchema.index({ date: 1, classroom: 1 });
dailyConsumptionSchema.index({ date: 1 });

// Static method to get consumption for a date range
dailyConsumptionSchema.statics.getConsumptionByDateRange = async function(startDate, endDate, deviceId = null) {
  const query = {
    date: { $gte: startDate, $lte: endDate }
  };
  
  if (deviceId) {
    query.deviceId = deviceId;
  }
  
  return await this.find(query).sort({ date: 1 }).lean();
};

// Static method to get total consumption for a classroom
dailyConsumptionSchema.statics.getClassroomConsumption = async function(classroom, startDate, endDate) {
  const result = await this.aggregate([
    {
      $match: {
        classroom: classroom,
        date: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalEnergyKwh: { $sum: '$energyConsumptionKwh' },
        totalCostINR: { $sum: '$costINR' },
        totalRuntimeHours: { $sum: '$runtimeHours' },
        avgPower: { $avg: '$avgPowerWatts' }
      }
    }
  ]);
  
  return result.length > 0 ? result[0] : {
    totalEnergyKwh: 0,
    totalCostINR: 0,
    totalRuntimeHours: 0,
    avgPower: 0
  };
};

// Static method to upsert daily consumption
dailyConsumptionSchema.statics.upsertDailyConsumption = async function(data) {
  return await this.findOneAndUpdate(
    { deviceId: data.deviceId, date: data.date },
    { $set: data },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

module.exports = mongoose.model('DailyConsumption', dailyConsumptionSchema);
