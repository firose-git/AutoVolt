const mongoose = require('mongoose');

/**
 * DeviceActivityLog Model
 * 
 * Tracks when ESP32 devices go online/offline for uptime analytics.
 * 
 * Use cases:
 * - Show last 5 online/offline events
 * - Calculate total uptime/downtime
 * - Identify connectivity issues
 * - Generate uptime reports
 */
const deviceActivityLogSchema = new mongoose.Schema({
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

  macAddress: {
    type: String,
    required: true,
    index: true
  },

  classroom: {
    type: String,
    default: 'unassigned',
    index: true
  },

  // Activity type
  activityType: {
    type: String,
    enum: ['online', 'offline', 'error', 'restart', 'reconnect'],
    required: true,
    index: true
  },

  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },

  // Duration calculation (for offline events)
  // How long was the device offline before coming back online
  offlineDurationMinutes: {
    type: Number,
    min: 0
  },

  // How long was the device online before going offline
  onlineDurationMinutes: {
    type: Number,
    min: 0
  },

  // Reference to the previous activity event
  previousActivityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DeviceActivityLog'
  },

  // Additional context
  reason: {
    type: String
    // e.g., "Network timeout", "Manual restart", "Power loss", "Scheduled maintenance"
  },

  metadata: {
    type: mongoose.Schema.Types.Mixed
    // Can store extra info like IP address, firmware version, signal strength
  }
}, {
  timestamps: true
});

// Compound indexes for efficient querying
deviceActivityLogSchema.index({ deviceId: 1, timestamp: -1 });
deviceActivityLogSchema.index({ macAddress: 1, timestamp: -1 });
deviceActivityLogSchema.index({ activityType: 1, timestamp: -1 });
deviceActivityLogSchema.index({ classroom: 1, timestamp: -1 });

// Pre-save hook to calculate duration
deviceActivityLogSchema.pre('save', async function(next) {
  if (this.isNew) {
    // Find the previous activity for this device
    const previousActivity = await this.constructor.findOne({
      deviceId: this.deviceId
    }).sort({ timestamp: -1 });

    if (previousActivity) {
      this.previousActivityId = previousActivity._id;

      // Calculate duration
      const durationMs = this.timestamp - previousActivity.timestamp;
      const durationMinutes = durationMs / (1000 * 60);

      if (previousActivity.activityType === 'online' && this.activityType === 'offline') {
        // Device was online, now going offline
        this.onlineDurationMinutes = durationMinutes;
      } else if (previousActivity.activityType === 'offline' && this.activityType === 'online') {
        // Device was offline, now coming online
        this.offlineDurationMinutes = durationMinutes;
      }
    }
  }

  next();
});

// Static method to get recent activity for a device
deviceActivityLogSchema.statics.getRecentActivity = async function(deviceId, limit = 5) {
  return await this.find({ deviceId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
};

// Static method to get uptime statistics
deviceActivityLogSchema.statics.getUptimeStats = async function(deviceId, startDate, endDate) {
  const activities = await this.find({
    deviceId,
    timestamp: { $gte: startDate, $lte: endDate }
  }).sort({ timestamp: 1 });

  let totalOnlineMinutes = 0;
  let totalOfflineMinutes = 0;
  let onlineCount = 0;
  let offlineCount = 0;

  for (const activity of activities) {
    if (activity.activityType === 'offline' && activity.onlineDurationMinutes) {
      totalOnlineMinutes += activity.onlineDurationMinutes;
      offlineCount++;
    } else if (activity.activityType === 'online' && activity.offlineDurationMinutes) {
      totalOfflineMinutes += activity.offlineDurationMinutes;
      onlineCount++;
    }
  }

  const totalMinutes = totalOnlineMinutes + totalOfflineMinutes;
  const uptimePercentage = totalMinutes > 0 ? (totalOnlineMinutes / totalMinutes) * 100 : 0;

  return {
    totalOnlineHours: totalOnlineMinutes / 60,
    totalOfflineHours: totalOfflineMinutes / 60,
    uptimePercentage: uptimePercentage.toFixed(2),
    onlineEvents: onlineCount,
    offlineEvents: offlineCount,
    averageOnlineHours: onlineCount > 0 ? totalOnlineMinutes / 60 / onlineCount : 0,
    averageOfflineHours: offlineCount > 0 ? totalOfflineMinutes / 60 / offlineCount : 0
  };
};

// Static method to get daily uptime breakdown
deviceActivityLogSchema.statics.getDailyUptime = async function(deviceId, startDate, endDate) {
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
        onlineMinutes: {
          $sum: {
            $cond: [
              { $eq: ['$activityType', 'offline'] },
              { $ifNull: ['$onlineDurationMinutes', 0] },
              0
            ]
          }
        },
        offlineMinutes: {
          $sum: {
            $cond: [
              { $eq: ['$activityType', 'online'] },
              { $ifNull: ['$offlineDurationMinutes', 0] },
              0
            ]
          }
        },
        onlineCount: {
          $sum: { $cond: [{ $eq: ['$activityType', 'online'] }, 1, 0] }
        },
        offlineCount: {
          $sum: { $cond: [{ $eq: ['$activityType', 'offline'] }, 1, 0] }
        }
      }
    },
    {
      $project: {
        _id: 0,
        date: 1,
        onlineHours: { $divide: ['$onlineMinutes', 60] },
        offlineHours: { $divide: ['$offlineMinutes', 60] },
        uptimePercentage: {
          $cond: [
            { $eq: [{ $add: ['$onlineMinutes', '$offlineMinutes'] }, 0] },
            0,
            {
              $multiply: [
                { $divide: ['$onlineMinutes', { $add: ['$onlineMinutes', '$offlineMinutes'] }] },
                100
              ]
            }
          ]
        },
        onlineCount: 1,
        offlineCount: 1
      }
    },
    {
      $sort: { date: 1 }
    }
  ]);
};

// Static method to get current device status
deviceActivityLogSchema.statics.getCurrentStatus = async function(deviceId) {
  const latestActivity = await this.findOne({ deviceId })
    .sort({ timestamp: -1 });

  if (!latestActivity) {
    return {
      status: 'unknown',
      lastSeen: null,
      duration: null
    };
  }

  const now = new Date();
  const durationMs = now - latestActivity.timestamp;
  const durationMinutes = durationMs / (1000 * 60);

  return {
    status: latestActivity.activityType,
    lastSeen: latestActivity.timestamp,
    durationMinutes,
    durationHours: durationMinutes / 60,
    lastActivity: latestActivity
  };
};

// Static method to log device activity
deviceActivityLogSchema.statics.logActivity = async function(deviceId, activityType, options = {}) {
  const Device = mongoose.model('Device');
  const device = await Device.findById(deviceId);

  if (!device) {
    throw new Error('Device not found');
  }

  return await this.create({
    deviceId: device._id,
    deviceName: device.name,
    macAddress: device.macAddress,
    classroom: device.classroom || 'unassigned',
    activityType,
    timestamp: options.timestamp || new Date(),
    reason: options.reason,
    metadata: options.metadata
  });
};

module.exports = mongoose.model('DeviceActivityLog', deviceActivityLogSchema);
