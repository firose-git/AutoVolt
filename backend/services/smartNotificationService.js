const mongoose = require('mongoose');
const Device = require('../models/Device');
// Removed circular import: const telegramService = require('./telegramService');

// Schema for tracking device offline notifications
const deviceOfflineTrackerSchema = new mongoose.Schema({
  deviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    required: true,
    unique: true
  },
  deviceName: {
    type: String,
    required: true
  },
  classroom: {
    type: String,
    default: ''
  },
  location: {
    type: String,
    default: ''
  },
  macAddress: {
    type: String,
    required: true
  },
  firstOfflineAt: {
    type: Date,
    required: true
  },
  lastNotificationSent: {
    type: Date,
    default: null
  },
  notificationCount: {
    type: Number,
    default: 0
  },
  isCurrentlyOffline: {
    type: Boolean,
    default: true
  },
  backOnlineAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes
deviceOfflineTrackerSchema.index({ deviceId: 1 }, { unique: true });
deviceOfflineTrackerSchema.index({ isCurrentlyOffline: 1, lastNotificationSent: 1 });

const DeviceOfflineTracker = mongoose.model('DeviceOfflineTracker', deviceOfflineTrackerSchema);

class SmartNotificationService {
  constructor() {
    this.telegramService = null;
    this.notificationInterval = 30 * 60 * 1000; // 30 minutes
    this.checkInterval = 5 * 60 * 1000; // 5 minutes
    this.intervalId = null;
    this.isRunning = false;
  }

  // Set telegram service dependency
  setTelegramService(telegramService) {
    this.telegramService = telegramService;
  }

  // Start the smart notification service
  async start() {
    if (this.isRunning) return;

    this.isRunning = true;
    console.log('[SMART-NOTIFICATIONS] Starting smart notification service');

    // Run initial check
    await this.checkAndNotifyOfflineDevices();

    // Set up recurring checks
    this.intervalId = setInterval(async () => {
      await this.checkAndNotifyOfflineDevices();
    }, this.checkInterval);

    console.log(`[SMART-NOTIFICATIONS] Service started - checking every ${this.checkInterval / 1000} seconds`);
  }

  // Stop the service
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('[SMART-NOTIFICATIONS] Smart notification service stopped');
  }

  // Main function to check offline devices and send notifications
  async checkAndNotifyOfflineDevices() {
    try {
      console.log('[SMART-NOTIFICATIONS] Checking for offline devices...');

      // Get all currently offline devices with retry logic
      let offlineDevices = [];
      let retries = 3;
      
      while (retries > 0) {
        try {
          offlineDevices = await Device.find({
            status: 'offline',
            lastSeen: { $lt: new Date(Date.now() - 5 * 60 * 1000) } // Offline for more than 5 minutes
          }).sort({ lastSeen: 1 });
          break; // Success, exit retry loop
        } catch (error) {
          retries--;
          if (retries === 0) {
            throw error; // Re-throw if all retries failed
          }
          console.log(`[SMART-NOTIFICATIONS] Database query failed, retrying... (${retries} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
        }
      }

      console.log(`[SMART-NOTIFICATIONS] Found ${offlineDevices.length} offline devices`);

      for (const device of offlineDevices) {
        await this.processOfflineDevice(device);
      }

      // Clean up trackers for devices that are back online
      await this.cleanupOnlineDevices();

    } catch (error) {
      console.error('[SMART-NOTIFICATIONS] Error in checkAndNotifyOfflineDevices:', error);
    }
  }

  // Process individual offline device
  async processOfflineDevice(device) {
    try {
      // Check if we already have a tracker for this device
      let tracker = await DeviceOfflineTracker.findOne({ deviceId: device._id });

      const now = new Date();

      if (!tracker) {
        // New offline device - create tracker and send initial notification
        console.log(`[SMART-NOTIFICATIONS] New offline device detected: ${device.name}`);

        tracker = new DeviceOfflineTracker({
          deviceId: device._id,
          deviceName: device.name,
          classroom: device.classroom || '',
          location: device.location || '',
          macAddress: device.macAddress,
          firstOfflineAt: device.lastSeen || now,
          lastNotificationSent: null,
          notificationCount: 0,
          isCurrentlyOffline: true
        });

        await tracker.save();

        // Send initial notification
        await this.sendOfflineNotification(tracker, true);

      } else if (tracker.isCurrentlyOffline) {
        // Existing offline device - check if we need to send repeat notification
        const timeSinceLastNotification = tracker.lastNotificationSent ?
          now - tracker.lastNotificationSent : Infinity;

        if (timeSinceLastNotification >= this.notificationInterval) {
          console.log(`[SMART-NOTIFICATIONS] Sending repeat notification for offline device: ${device.name}`);
          await this.sendOfflineNotification(tracker, false);
        }
      }

    } catch (error) {
      console.error(`[SMART-NOTIFICATIONS] Error processing offline device ${device.name}:`, error);
    }
  }

  // Send offline notification
  async sendOfflineNotification(tracker, isInitial) {
    try {
      const now = new Date();
      const offlineDuration = Math.floor((now - tracker.firstOfflineAt) / (1000 * 60)); // minutes

      // Create detailed alert message
      const alertData = {
        alertname: 'DeviceOffline',
        summary: `Device Offline: ${tracker.deviceName}`,
        description: this.buildOfflineDescription(tracker, offlineDuration, isInitial),
        severity: 'warning',
        instance: tracker.macAddress,
        deviceName: tracker.deviceName,
        classroom: tracker.classroom,
        location: tracker.location,
        offlineDuration: offlineDuration,
        firstOfflineAt: tracker.firstOfflineAt,
        isInitialNotification: isInitial
      };

      // Send alert to all subscribers
      const results = await this.telegramService.sendAlert('deviceOffline', alertData);

      // Update tracker
      tracker.lastNotificationSent = now;
      tracker.notificationCount += 1;
      await tracker.save();

      console.log(`[SMART-NOTIFICATIONS] Sent ${isInitial ? 'initial' : 'repeat'} offline notification for ${tracker.deviceName} (${results.length} recipients)`);

    } catch (error) {
      console.error(`[SMART-NOTIFICATIONS] Error sending offline notification for ${tracker.deviceName}:`, error);
    }
  }

  // Build detailed offline description
  buildOfflineDescription(tracker, offlineDuration, isInitial) {
    let description = `🚨 **Device Offline Alert**\n\n`;

    description += `**Device:** ${tracker.deviceName}\n`;
    if (tracker.classroom) {
      description += `**Classroom:** ${tracker.classroom}\n`;
    }
    if (tracker.location) {
      description += `**Location:** ${tracker.location}\n`;
    }
    description += `**MAC Address:** ${tracker.macAddress}\n`;
    description += `**Status:** Offline\n`;
    description += `**Offline Duration:** ${offlineDuration} minutes\n`;
    description += `**First Offline:** ${tracker.firstOfflineAt.toLocaleString()}\n\n`;

    if (isInitial) {
      description += `⚠️ This device has just gone offline. Please check:\n`;
      description += `- Power supply and connections\n`;
      description += `- Network connectivity\n`;
      description += `- Device physical condition\n\n`;
    } else {
      description += `⏰ This device is still offline. Follow-up required:\n`;
      description += `- Investigate the cause of offline status\n`;
      description += `- Consider device replacement if needed\n`;
      description += `- Check network infrastructure\n\n`;
    }

    description += `**Notification:** ${isInitial ? 'Initial' : 'Follow-up'} alert\n`;
    description += `**Time:** ${new Date().toLocaleString()}`;

    return description;
  }

  // Clean up trackers for devices that are back online
  async cleanupOnlineDevices() {
    try {
      // Find trackers for devices that are now online
      const onlineDevices = await Device.find({ status: 'online' }).select('_id');
      const onlineDeviceIds = onlineDevices.map(d => d._id);

      const trackersToUpdate = await DeviceOfflineTracker.find({
        deviceId: { $in: onlineDeviceIds },
        isCurrentlyOffline: true
      });

      if (trackersToUpdate.length > 0) {
        console.log(`[SMART-NOTIFICATIONS] Cleaning up ${trackersToUpdate.length} trackers for devices back online`);

        for (const tracker of trackersToUpdate) {
          tracker.isCurrentlyOffline = false;
          tracker.backOnlineAt = new Date();
          await tracker.save();

          // Send back online notification
          await this.sendBackOnlineNotification(tracker);
        }
      }

    } catch (error) {
      console.error('[SMART-NOTIFICATIONS] Error cleaning up online devices:', error);
    }
  }

  // Send back online notification
  async sendBackOnlineNotification(tracker) {
    try {
      const offlineDuration = Math.floor((tracker.backOnlineAt - tracker.firstOfflineAt) / (1000 * 60)); // minutes

      const alertData = {
        alertname: 'DeviceBackOnline',
        summary: `Device Back Online: ${tracker.deviceName}`,
        description: this.buildBackOnlineDescription(tracker, offlineDuration),
        severity: 'info',
        instance: tracker.macAddress,
        deviceName: tracker.deviceName,
        classroom: tracker.classroom,
        location: tracker.location,
        offlineDuration: offlineDuration,
        backOnlineAt: tracker.backOnlineAt
      };

      // Send alert to subscribers
      await this.telegramService.sendAlert('deviceBackOnline', alertData);

      console.log(`[SMART-NOTIFICATIONS] Sent back online notification for ${tracker.deviceName}`);

    } catch (error) {
      console.error(`[SMART-NOTIFICATIONS] Error sending back online notification for ${tracker.deviceName}:`, error);
    }
  }

  // Build back online description
  buildBackOnlineDescription(tracker, offlineDuration) {
    let description = `✅ **Device Back Online**\n\n`;

    description += `**Device:** ${tracker.deviceName}\n`;
    if (tracker.classroom) {
      description += `**Classroom:** ${tracker.classroom}\n`;
    }
    if (tracker.location) {
      description += `**Location:** ${tracker.location}\n`;
    }
    description += `**MAC Address:** ${tracker.macAddress}\n`;
    description += `**Status:** Online\n`;
    description += `**Total Offline Time:** ${offlineDuration} minutes\n`;
    description += `**Back Online:** ${tracker.backOnlineAt.toLocaleString()}\n\n`;

    description += `🎉 Device connectivity has been restored!\n\n`;
    description += `**Time:** ${new Date().toLocaleString()}`;

    return description;
  }

  // Get service status
  getStatus() {
    return {
      isRunning: this.isRunning,
      notificationInterval: this.notificationInterval,
      checkInterval: this.checkInterval,
      nextCheck: this.intervalId ? new Date(Date.now() + this.checkInterval) : null
    };
  }

  // Manual trigger for testing
  async triggerOfflineCheck() {
    console.log('[SMART-NOTIFICATIONS] Manual trigger for offline check');
    await this.checkAndNotifyOfflineDevices();
    return { success: true, message: 'Offline device check completed' };
  }
}

module.exports = new SmartNotificationService();