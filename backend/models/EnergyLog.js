const mongoose = require('mongoose');

const energyLogSchema = new mongoose.Schema({
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
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
    index: true
  },
  consumption: {
    type: Number,
    required: true,
    min: 0,
    // Energy consumption in kWh
  },
  cost: {
    type: Number,
    required: true,
    min: 0,
    // Cost in currency (e.g., ₹)
  },
  activeSwitches: {
    type: Number,
    default: 0,
    min: 0
  },
  totalSwitches: {
    type: Number,
    default: 0,
    min: 0
  },
  classroom: {
    type: String,
    trim: true,
    index: true
  },
  location: {
    type: String,
    trim: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    // Can store additional info like:
    // - hourOfDay
    // - dayOfWeek
    // - isWeekend
    // - temperature
    // - generated (for sample data)
  }
}, {
  timestamps: true
});

// Compound index for efficient querying by device and time range
energyLogSchema.index({ deviceId: 1, timestamp: -1 });
energyLogSchema.index({ classroom: 1, timestamp: -1 });
energyLogSchema.index({ timestamp: -1 }); // For recent queries

// Virtual for energy efficiency calculation
energyLogSchema.virtual('efficiency').get(function() {
  if (this.totalSwitches === 0) return 0;
  return (this.activeSwitches / this.totalSwitches) * 100;
});

// Static method to get energy stats for a device
energyLogSchema.statics.getDeviceStats = async function(deviceId, days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const stats = await this.aggregate([
    {
      $match: {
        deviceId: mongoose.Types.ObjectId(deviceId),
        timestamp: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        totalConsumption: { $sum: '$consumption' },
        totalCost: { $sum: '$cost' },
        avgConsumption: { $avg: '$consumption' },
        maxConsumption: { $max: '$consumption' },
        minConsumption: { $min: '$consumption' },
        dataPoints: { $sum: 1 }
      }
    }
  ]);

  return stats[0] || {
    totalConsumption: 0,
    totalCost: 0,
    avgConsumption: 0,
    maxConsumption: 0,
    minConsumption: 0,
    dataPoints: 0
  };
};

// Static method to get hourly consumption for a device
energyLogSchema.statics.getHourlyConsumption = async function(deviceId, days = 1) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const logs = await this.find({
    deviceId: deviceId,
    timestamp: { $gte: startDate }
  })
  .sort({ timestamp: 1 })
  .select('timestamp consumption cost activeSwitches')
  .lean();

  return logs;
};

module.exports = mongoose.model('EnergyLog', energyLogSchema);
