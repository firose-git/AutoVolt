const mongoose = require('mongoose');

/**
 * SwitchStateLog Model
 * 
 * Tracks when individual switches turn ON/OFF for accurate runtime-based energy calculation.
 * This is more accurate than periodic power readings because it captures exact ON/OFF times.
 * 
 * Energy Calculation:
 * Energy (kWh) = (Power Rating × Runtime in hours) / 1000
 * 
 * Example: A 40W bulb ON for 3 hours = (40 × 3) / 1000 = 0.12 kWh
 */
const switchStateLogSchema = new mongoose.Schema({
  // Device reference
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

  // Switch identification
  switchId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
    // Reference to the switch within the device.switches array
  },

  switchName: {
    type: String,
    required: true
  },

  switchType: {
    type: String,
    enum: ['relay', 'light', 'fan', 'outlet', 'projector', 'ac'],
    required: true
  },

  gpio: {
    type: Number,
    required: true
  },

  // State change information
  state: {
    type: Boolean,
    required: true,
    index: true
    // true = ON, false = OFF
  },

  timestamp: {
    type: Date,
    required: true,
    index: true,
    default: Date.now
  },

  // Power rating of the switch (in Watts)
  powerRating: {
    type: Number,
    required: true,
    min: 0,
    default: 0
    // Default power consumption when ON (e.g., 40W for a bulb, 75W for a fan)
  },

  // Runtime calculation (only for OFF events)
  runtimeMinutes: {
    type: Number,
    min: 0
    // How long the switch was ON (calculated when turning OFF)
  },

  energyConsumed: {
    type: Number,
    min: 0,
    default: 0
    // Energy in Wh for this ON session (calculated when turning OFF)
  },

  cost: {
    type: Number,
    min: 0,
    default: 0
    // Cost in ₹ for this ON session
  },

  // Reference to the corresponding ON event (for OFF events)
  onEventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SwitchStateLog'
    // Links OFF event to its corresponding ON event
  },

  // Settings at the time of state change
  pricePerUnit: {
    type: Number,
    required: true,
    default: 7.5
    // Price per kWh in ₹
  },

  consumptionFactor: {
    type: Number,
    default: 1.0,
    min: 0
    // Calibration factor
  },

  // Source of state change
  source: {
    type: String,
    enum: ['manual', 'schedule', 'pir', 'app', 'voice', 'button', 'api'],
    default: 'manual'
  },

  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Compound indexes for efficient querying
switchStateLogSchema.index({ deviceId: 1, timestamp: -1 });
switchStateLogSchema.index({ switchId: 1, timestamp: -1 });
switchStateLogSchema.index({ deviceId: 1, switchId: 1, state: 1, timestamp: -1 }); // Find last ON event
switchStateLogSchema.index({ classroom: 1, timestamp: -1 });
switchStateLogSchema.index({ timestamp: -1 });
switchStateLogSchema.index({ state: 1, timestamp: -1 }); // ON/OFF analytics

// Pre-save hook to calculate energy and cost for OFF events
switchStateLogSchema.pre('save', async function(next) {
  if (!this.state) {
    // This is an OFF event - find the corresponding ON event
    const onEvent = await this.constructor.findOne({
      deviceId: this.deviceId,
      switchId: this.switchId,
      state: true,
      timestamp: { $lt: this.timestamp },
      onEventId: null // Not yet paired with an OFF event
    }).sort({ timestamp: -1 });

    if (onEvent) {
      // Calculate runtime
      const runtimeMs = this.timestamp - onEvent.timestamp;
      this.runtimeMinutes = runtimeMs / (1000 * 60);
      const runtimeHours = runtimeMs / (1000 * 60 * 60);

      // Calculate energy consumed (Wh)
      const powerRating = this.powerRating || onEvent.powerRating;
      this.energyConsumed = powerRating * runtimeHours * this.consumptionFactor;

      // Calculate cost
      this.cost = (this.energyConsumed / 1000) * this.pricePerUnit;

      // Link to ON event
      this.onEventId = onEvent._id;

      // Update ON event with OFF reference
      onEvent.metadata = onEvent.metadata || {};
      onEvent.metadata.offEventId = this._id;
      await onEvent.save();
    }
  }

  next();
});

// Static method to get active switches (currently ON)
switchStateLogSchema.statics.getActiveSwitches = async function(deviceId) {
  // Find all switches that are currently ON (no corresponding OFF event)
  const activeLogs = await this.aggregate([
    {
      $match: {
        deviceId: new mongoose.Types.ObjectId(deviceId),
        state: true,
        'metadata.offEventId': { $exists: false }
      }
    },
    {
      $sort: { timestamp: -1 }
    },
    {
      $group: {
        _id: '$switchId',
        latestLog: { $first: '$$ROOT' }
      }
    }
  ]);

  return activeLogs.map(log => log.latestLog);
};

// Static method to calculate runtime-based consumption for a date range
switchStateLogSchema.statics.getRuntimeConsumption = async function(deviceId, startDate, endDate) {
  const result = await this.aggregate([
    {
      $match: {
        deviceId: new mongoose.Types.ObjectId(deviceId),
        state: false, // Only OFF events have energy data
        timestamp: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalEnergy: { $sum: '$energyConsumed' }, // in Wh
        totalCost: { $sum: '$cost' },
        totalRuntimeMinutes: { $sum: '$runtimeMinutes' },
        sessionCount: { $sum: 1 }
      }
    }
  ]);

  if (result.length === 0) {
    return {
      totalEnergyKwh: 0,
      totalCost: 0,
      totalRuntimeHours: 0,
      sessionCount: 0
    };
  }

  return {
    totalEnergyKwh: result[0].totalEnergy / 1000,
    totalCost: result[0].totalCost,
    totalRuntimeHours: result[0].totalRuntimeMinutes / 60,
    sessionCount: result[0].sessionCount
  };
};

// Static method to get per-switch runtime consumption
switchStateLogSchema.statics.getPerSwitchConsumption = async function(deviceId, startDate, endDate) {
  return await this.aggregate([
    {
      $match: {
        deviceId: new mongoose.Types.ObjectId(deviceId),
        state: false,
        timestamp: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          switchId: '$switchId',
          switchName: '$switchName'
        },
        totalEnergy: { $sum: '$energyConsumed' },
        totalCost: { $sum: '$cost' },
        totalRuntimeMinutes: { $sum: '$runtimeMinutes' },
        sessionCount: { $sum: 1 },
        avgPower: { $avg: '$powerRating' }
      }
    },
    {
      $project: {
        _id: 0,
        switchId: '$_id.switchId',
        switchName: '$_id.switchName',
        energyKwh: { $divide: ['$totalEnergy', 1000] },
        cost: '$totalCost',
        runtimeHours: { $divide: ['$totalRuntimeMinutes', 60] },
        sessionCount: '$sessionCount',
        avgPower: '$avgPower'
      }
    },
    {
      $sort: { energyKwh: -1 }
    }
  ]);
};

// Static method to get daily runtime consumption
switchStateLogSchema.statics.getDailyRuntimeConsumption = async function(deviceId, startDate, endDate) {
  return await this.aggregate([
    {
      $match: {
        deviceId: new mongoose.Types.ObjectId(deviceId),
        state: false,
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
        totalEnergy: { $sum: '$energyConsumed' },
        totalCost: { $sum: '$cost' },
        totalRuntimeMinutes: { $sum: '$runtimeMinutes' },
        sessionCount: { $sum: 1 }
      }
    },
    {
      $project: {
        _id: 0,
        date: 1,
        energyKwh: { $divide: ['$totalEnergy', 1000] },
        cost: '$totalCost',
        runtimeHours: { $divide: ['$totalRuntimeMinutes', 60] },
        sessionCount: '$sessionCount'
      }
    },
    {
      $sort: { date: 1 }
    }
  ]);
};

// Static method to calculate energy for currently active switches
switchStateLogSchema.statics.calculateActiveEnergy = async function(deviceId, pricePerUnit = 7.5) {
  const activeSwitches = await this.getActiveSwitches(deviceId);
  
  let totalActiveEnergy = 0;
  let totalActiveCost = 0;

  for (const log of activeSwitches) {
    const runtimeMs = Date.now() - log.timestamp;
    const runtimeHours = runtimeMs / (1000 * 60 * 60);
    const energy = log.powerRating * runtimeHours * (log.consumptionFactor || 1.0);
    const cost = (energy / 1000) * pricePerUnit;

    totalActiveEnergy += energy;
    totalActiveCost += cost;
  }

  return {
    activeEnergyWh: totalActiveEnergy,
    activeEnergyKwh: totalActiveEnergy / 1000,
    activeCost: totalActiveCost,
    activeSwitchCount: activeSwitches.length
  };
};

module.exports = mongoose.model('SwitchStateLog', switchStateLogSchema);
