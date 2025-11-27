const mongoose = require('mongoose');

/**
 * PowerReading Model
 * 
 * Stores individual power consumption readings from ESP32 devices.
 * Supports offline data buffering and sync when devices reconnect.
 * 
 * Key features:
 * - Records voltage, current, power, and cumulative energy
 * - Timestamps for chronological ordering
 * - Status tracking (online/offline)
 * - Cost calculation with configurable price
 * - Unique constraint to prevent duplicate syncs
 */
const powerReadingSchema = new mongoose.Schema({
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

  // Reading timestamp - must be precise for offline sync
  timestamp: {
    type: Date,
    required: true,
    index: true
  },

  // Electrical measurements
  voltage: {
    type: Number,
    required: true,
    min: 0,
    // Voltage in Volts (V)
  },

  current: {
    type: Number,
    required: true,
    min: 0,
    // Current in Amperes (A)
  },

  power: {
    type: Number,
    required: true,
    min: 0,
    // Power in Watts (W) = Voltage × Current
  },

  // Energy consumption
  energy: {
    type: Number,
    required: true,
    min: 0,
    // Incremental energy in Wh (Watt-hours) for this reading interval
  },

  totalEnergy: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
    // Cumulative energy in kWh since device was installed/reset
  },

  // Device state
  status: {
    type: String,
    enum: ['online', 'offline'],
    required: true,
    default: 'online',
    // Indicates if this reading was recorded while device was online or buffered offline
  },

  // Active switches info
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

  // Cost calculation
  pricePerUnit: {
    type: Number,
    required: true,
    default: 7.5,
    min: 0,
    // Price per kWh in ₹
  },

  cost: {
    type: Number,
    required: true,
    min: 0,
    // Cost in ₹ = (energy / 1000) × pricePerUnit
  },

  // Calibration factor for power consumption adjustment
  consumptionFactor: {
    type: Number,
    default: 1.0,
    min: 0,
    // Multiplier to adjust power readings (e.g., 0.9 for 10% reduction)
  },

  // Sync metadata
  syncedAt: {
    type: Date,
    default: Date.now,
    // When this reading was received by the backend
  },

  // Unique identifier to prevent duplicate syncs
  readingId: {
    type: String,
    unique: true,
    sparse: true,
    // Format: {deviceId}_{timestamp_epoch}
  },

  // Additional metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    // Can store extra info like temperature, humidity, etc.
  }
}, {
  timestamps: true // Adds createdAt and updatedAt
});

// Compound indexes for efficient querying
powerReadingSchema.index({ deviceId: 1, timestamp: -1 }); // Device history
powerReadingSchema.index({ classroom: 1, timestamp: -1 }); // Classroom analytics
powerReadingSchema.index({ timestamp: -1 }); // Recent readings
powerReadingSchema.index({ deviceId: 1, timestamp: 1 }, { unique: true }); // Prevent duplicate timestamps per device
powerReadingSchema.index({ status: 1, timestamp: -1 }); // Filter by online/offline

// Pre-save hook to calculate derived values
powerReadingSchema.pre('save', function(next) {
  // Calculate power if not provided
  if (!this.power && this.voltage && this.current) {
    this.power = this.voltage * this.current;
  }

  // Apply consumption factor
  if (this.consumptionFactor && this.consumptionFactor !== 1.0) {
    this.power *= this.consumptionFactor;
    this.energy *= this.consumptionFactor;
  }

  // Calculate cost from energy (convert Wh to kWh)
  if (this.energy && this.pricePerUnit) {
    this.cost = (this.energy / 1000) * this.pricePerUnit;
  }

  // Generate readingId if not present
  if (!this.readingId) {
    this.readingId = `${this.deviceId}_${this.timestamp.getTime()}`;
  }

  next();
});

// Static method to get readings for a date range
powerReadingSchema.statics.getReadingsByDateRange = async function(startDate, endDate, deviceId = null, options = {}) {
  const query = {
    timestamp: { $gte: startDate, $lte: endDate }
  };

  if (deviceId) {
    query.deviceId = deviceId;
  }

  if (options.status) {
    query.status = options.status;
  }

  if (options.classroom) {
    query.classroom = options.classroom;
  }

  return await this.find(query)
    .sort({ timestamp: options.sortDesc ? -1 : 1 })
    .limit(options.limit || 0)
    .lean();
};

// Static method to get total consumption for a device
powerReadingSchema.statics.getTotalConsumption = async function(deviceId, startDate, endDate) {
  const result = await this.aggregate([
    {
      $match: {
        deviceId: new mongoose.Types.ObjectId(deviceId),
        timestamp: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalEnergy: { $sum: '$energy' }, // in Wh
        totalCost: { $sum: '$cost' },
        avgPower: { $avg: '$power' },
        maxPower: { $max: '$power' },
        minPower: { $min: '$power' },
        readingCount: { $sum: 1 }
      }
    }
  ]);

  if (result.length === 0) {
    return {
      totalEnergyKwh: 0,
      totalCost: 0,
      avgPower: 0,
      maxPower: 0,
      minPower: 0,
      readingCount: 0
    };
  }

  return {
    totalEnergyKwh: result[0].totalEnergy / 1000, // Convert Wh to kWh
    totalCost: result[0].totalCost,
    avgPower: result[0].avgPower,
    maxPower: result[0].maxPower,
    minPower: result[0].minPower,
    readingCount: result[0].readingCount
  };
};

// Static method to get daily aggregation
powerReadingSchema.statics.getDailyAggregation = async function(deviceId, startDate, endDate) {
  return await this.aggregate([
    {
      $match: {
        deviceId: new mongoose.Types.ObjectId(deviceId),
        timestamp: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$timestamp' },
          month: { $month: '$timestamp' },
          day: { $dayOfMonth: '$timestamp' }
        },
        date: { $first: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } } },
        totalEnergy: { $sum: '$energy' },
        totalCost: { $sum: '$cost' },
        avgPower: { $avg: '$power' },
        maxPower: { $max: '$power' },
        readingCount: { $sum: 1 }
      }
    },
    {
      $project: {
        _id: 0,
        date: 1,
        totalEnergyKwh: { $divide: ['$totalEnergy', 1000] },
        totalCost: 1,
        avgPower: 1,
        maxPower: 1,
        readingCount: 1
      }
    },
    {
      $sort: { date: 1 }
    }
  ]);
};

// Static method to get monthly aggregation
powerReadingSchema.statics.getMonthlyAggregation = async function(deviceId, startDate, endDate) {
  return await this.aggregate([
    {
      $match: {
        deviceId: new mongoose.Types.ObjectId(deviceId),
        timestamp: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$timestamp' },
          month: { $month: '$timestamp' }
        },
        year: { $first: { $year: '$timestamp' } },
        month: { $first: { $month: '$timestamp' } },
        totalEnergy: { $sum: '$energy' },
        totalCost: { $sum: '$cost' },
        avgPower: { $avg: '$power' },
        maxPower: { $max: '$power' },
        readingCount: { $sum: 1 }
      }
    },
    {
      $project: {
        _id: 0,
        year: 1,
        month: 1,
        totalEnergyKwh: { $divide: ['$totalEnergy', 1000] },
        totalCost: 1,
        avgPower: 1,
        maxPower: 1,
        readingCount: 1
      }
    },
    {
      $sort: { year: 1, month: 1 }
    }
  ]);
};

// Static method to bulk insert readings (for offline sync)
powerReadingSchema.statics.bulkInsertReadings = async function(readings) {
  // Use insertMany with ordered=false to continue on duplicates
  try {
    const result = await this.insertMany(readings, { ordered: false });
    return {
      success: true,
      inserted: result.length,
      duplicates: 0
    };
  } catch (error) {
    if (error.code === 11000) {
      // Duplicate key error
      const inserted = error.result?.nInserted || 0;
      const duplicates = readings.length - inserted;
      return {
        success: true,
        inserted,
        duplicates
      };
    }
    throw error;
  }
};

module.exports = mongoose.model('PowerReading', powerReadingSchema);
