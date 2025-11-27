const mongoose = require('mongoose');

/**
 * Energy Consumption Tracking Model
 * Stores aggregated energy consumption data by ESP32 device, classroom, and switch type
 * Incremental updates - new data is ADDED to existing data, never overwritten
 */
const energyConsumptionSchema = new mongoose.Schema({
  // Device identification
  deviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    required: true,
    index: true
  },
  deviceName: String,
  macAddress: {
    type: String,
    required: true,
    index: true
  },
  
  // Location tracking
  classroom: {
    type: String,
    index: true
  },
  location: String,
  
  // Time period
  date: {
    type: Date,
    required: true,
    index: true
  },
  year: {
    type: Number,
    required: true,
    index: true
  },
  month: {
    type: Number,
    required: true,
    index: true
  },
  day: {
    type: Number,
    required: true
  },
  
  // Consumption data by switch type
  consumptionByType: {
    light: {
      energyKwh: { type: Number, default: 0 },
      runtimeHours: { type: Number, default: 0 },
      cost: { type: Number, default: 0 },
      switchCount: { type: Number, default: 0 }
    },
    fan: {
      energyKwh: { type: Number, default: 0 },
      runtimeHours: { type: Number, default: 0 },
      cost: { type: Number, default: 0 },
      switchCount: { type: Number, default: 0 }
    },
    ac: {
      energyKwh: { type: Number, default: 0 },
      runtimeHours: { type: Number, default: 0 },
      cost: { type: Number, default: 0 },
      switchCount: { type: Number, default: 0 }
    },
    projector: {
      energyKwh: { type: Number, default: 0 },
      runtimeHours: { type: Number, default: 0 },
      cost: { type: Number, default: 0 },
      switchCount: { type: Number, default: 0 }
    },
    outlet: {
      energyKwh: { type: Number, default: 0 },
      runtimeHours: { type: Number, default: 0 },
      cost: { type: Number, default: 0 },
      switchCount: { type: Number, default: 0 }
    },
    other: {
      energyKwh: { type: Number, default: 0 },
      runtimeHours: { type: Number, default: 0 },
      cost: { type: Number, default: 0 },
      switchCount: { type: Number, default: 0 }
    }
  },
  
  // Total consumption for this day/device
  totalEnergyKwh: {
    type: Number,
    default: 0,
    index: true
  },
  totalRuntimeHours: {
    type: Number,
    default: 0
  },
  totalCost: {
    type: Number,
    default: 0
  },
  
  // Settings used for calculation
  electricityRate: {
    type: Number,
    required: true
  },
  
  // Device online status tracking
  wasOnline: {
    type: Boolean,
    default: true
  },
  onlineDuration: {
    type: Number, // Minutes device was online during this period
    default: 0
  },
  
  // Metadata
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  calculationSource: {
    type: String,
    enum: ['realtime', 'aggregation', 'manual'],
    default: 'realtime'
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
energyConsumptionSchema.index({ deviceId: 1, date: -1 });
energyConsumptionSchema.index({ macAddress: 1, date: -1 });
energyConsumptionSchema.index({ classroom: 1, date: -1 });
energyConsumptionSchema.index({ year: 1, month: 1, day: 1 });
energyConsumptionSchema.index({ classroom: 1, year: 1, month: 1 });

// Static method to increment consumption (INCREMENTAL - adds to existing)
energyConsumptionSchema.statics.incrementConsumption = async function(data) {
  const {
    deviceId,
    deviceName,
    macAddress,
    classroom,
    location,
    date,
    switchType,
    energyKwh,
    runtimeHours,
    cost,
    electricityRate,
    wasOnline = true
  } = data;
  
  const dateObj = new Date(date);
  const year = dateObj.getFullYear();
  const month = dateObj.getMonth() + 1;
  const day = dateObj.getDate();
  
  // Normalize switch type
  const normalizedType = ['light', 'fan', 'ac', 'projector', 'outlet'].includes(switchType) 
    ? switchType 
    : 'other';
  
  // Find or create document for this device/date
  const record = await this.findOneAndUpdate(
    {
      deviceId,
      date: new Date(year, month - 1, day, 0, 0, 0)
    },
    {
      $setOnInsert: {
        deviceName,
        macAddress,
        classroom,
        location,
        year,
        month,
        day,
        electricityRate
      },
      $set: {
        lastUpdated: new Date(),
        wasOnline
      },
      // INCREMENTAL: Add to existing values
      $inc: {
        [`consumptionByType.${normalizedType}.energyKwh`]: energyKwh || 0,
        [`consumptionByType.${normalizedType}.runtimeHours`]: runtimeHours || 0,
        [`consumptionByType.${normalizedType}.cost`]: cost || 0,
        [`consumptionByType.${normalizedType}.switchCount`]: 1,
        totalEnergyKwh: energyKwh || 0,
        totalRuntimeHours: runtimeHours || 0,
        totalCost: cost || 0
      }
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true
    }
  );
  
  return record;
};

// Static method to get consumption by classroom
energyConsumptionSchema.statics.getClassroomConsumption = async function(classroom, startDate, endDate) {
  const results = await this.aggregate([
    {
      $match: {
        classroom,
        date: { $gte: new Date(startDate), $lte: new Date(endDate) }
      }
    },
    {
      $group: {
        _id: '$classroom',
        totalEnergy: { $sum: '$totalEnergyKwh' },
        totalCost: { $sum: '$totalCost' },
        totalRuntime: { $sum: '$totalRuntimeHours' },
        byType: {
          $push: {
            light: '$consumptionByType.light',
            fan: '$consumptionByType.fan',
            ac: '$consumptionByType.ac',
            projector: '$consumptionByType.projector',
            outlet: '$consumptionByType.outlet',
            other: '$consumptionByType.other'
          }
        }
      }
    }
  ]);
  
  return results[0] || {
    _id: classroom,
    totalEnergy: 0,
    totalCost: 0,
    totalRuntime: 0,
    byType: []
  };
};

// Static method to get consumption by ESP32 device
energyConsumptionSchema.statics.getDeviceConsumption = async function(deviceId, startDate, endDate) {
  const results = await this.find({
    deviceId,
    date: { $gte: new Date(startDate), $lte: new Date(endDate) }
  }).sort({ date: 1 });
  
  return results;
};

module.exports = mongoose.model('EnergyConsumption', energyConsumptionSchema);
