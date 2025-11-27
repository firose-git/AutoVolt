const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const DeviceActivityLog = require('../models/DeviceActivityLog');
const SwitchStateLog = require('../models/SwitchStateLog');
const Device = require('../models/Device');

// Apply authentication to all routes
router.use(auth);

/**
 * Get device activity history (last N online/offline events)
 * GET /api/device-analytics/:deviceId/activity?limit=5
 */
router.get('/:deviceId/activity', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const limit = parseInt(req.query.limit) || 5;

    const activities = await DeviceActivityLog.getRecentActivity(deviceId, limit);

    res.json({
      deviceId,
      activities: activities.map(a => ({
        activityType: a.activityType,
        timestamp: a.timestamp,
        onlineDurationMinutes: a.onlineDurationMinutes,
        offlineDurationMinutes: a.offlineDurationMinutes,
        onlineDurationHours: a.onlineDurationMinutes ? (a.onlineDurationMinutes / 60).toFixed(2) : null,
        offlineDurationHours: a.offlineDurationMinutes ? (a.offlineDurationMinutes / 60).toFixed(2) : null,
        reason: a.reason
      }))
    });
  } catch (error) {
    console.error('Error getting device activity:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

/**
 * Get device uptime statistics
 * GET /api/device-analytics/:deviceId/uptime?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */
router.get('/:deviceId/uptime', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const stats = await DeviceActivityLog.getUptimeStats(deviceId, start, end);

    res.json({
      deviceId,
      period: { startDate, endDate },
      uptime: stats
    });
  } catch (error) {
    console.error('Error getting uptime stats:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

/**
 * Get daily uptime breakdown
 * GET /api/device-analytics/:deviceId/daily-uptime?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */
router.get('/:deviceId/daily-uptime', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const dailyUptime = await DeviceActivityLog.getDailyUptime(deviceId, start, end);

    res.json({
      deviceId,
      period: { startDate, endDate },
      dailyUptime
    });
  } catch (error) {
    console.error('Error getting daily uptime:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

/**
 * Get current device status
 * GET /api/device-analytics/:deviceId/status
 */
router.get('/:deviceId/status', async (req, res) => {
  try {
    const { deviceId } = req.params;

    const status = await DeviceActivityLog.getCurrentStatus(deviceId);

    res.json({
      deviceId,
      currentStatus: status
    });
  } catch (error) {
    console.error('Error getting device status:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

/**
 * Get switch runtime history (when switches were turned on/off and for how long)
 * GET /api/device-analytics/:deviceId/switch-history?limit=10
 */
router.get('/:deviceId/switch-history', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    // Get recent switch state changes (only OFF events, which have runtime data)
    const switchHistory = await SwitchStateLog.find({
      deviceId,
      state: false // OFF events have energy and runtime data
    })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    res.json({
      deviceId,
      switchHistory: switchHistory.map(s => ({
        switchName: s.switchName,
        switchType: s.switchType,
        turnedOn: s.onEventId ? 'Yes' : 'Unknown',
        turnedOff: s.timestamp,
        runtimeMinutes: s.runtimeMinutes,
        runtimeHours: s.runtimeMinutes ? (s.runtimeMinutes / 60).toFixed(2) : null,
        energyConsumed: s.energyConsumed,
        energyKwh: s.energyConsumed ? (s.energyConsumed / 1000).toFixed(3) : null,
        cost: s.cost,
        powerRating: s.powerRating,
        source: s.source
      }))
    });
  } catch (error) {
    console.error('Error getting switch history:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

/**
 * Get per-switch usage summary
 * GET /api/device-analytics/:deviceId/switch-usage?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */
router.get('/:deviceId/switch-usage', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const switchUsage = await SwitchStateLog.getPerSwitchConsumption(deviceId, start, end);

    res.json({
      deviceId,
      period: { startDate, endDate },
      switchUsage
    });
  } catch (error) {
    console.error('Error getting switch usage:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

/**
 * Get currently active switches
 * GET /api/device-analytics/:deviceId/active-switches
 */
router.get('/:deviceId/active-switches', async (req, res) => {
  try {
    const { deviceId } = req.params;

    const activeSwitches = await SwitchStateLog.getActiveSwitches(deviceId);

    const now = new Date();
    const switchesWithRuntime = activeSwitches.map(sw => {
      const runtimeMs = now - sw.timestamp;
      const runtimeMinutes = runtimeMs / (1000 * 60);
      const runtimeHours = runtimeMinutes / 60;
      const energySoFar = sw.powerRating * runtimeHours * (sw.consumptionFactor || 1.0);

      return {
        switchName: sw.switchName,
        switchType: sw.switchType,
        turnedOnAt: sw.timestamp,
        currentRuntimeMinutes: runtimeMinutes.toFixed(2),
        currentRuntimeHours: runtimeHours.toFixed(2),
        powerRating: sw.powerRating,
        energyConsumedSoFar: energySoFar.toFixed(2),
        energyKwhSoFar: (energySoFar / 1000).toFixed(3),
        costSoFar: ((energySoFar / 1000) * sw.pricePerUnit).toFixed(2)
      };
    });

    res.json({
      deviceId,
      activeSwitchCount: activeSwitches.length,
      activeSwitches: switchesWithRuntime
    });
  } catch (error) {
    console.error('Error getting active switches:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

/**
 * Get comprehensive device analytics (combines everything)
 * GET /api/device-analytics/:deviceId/summary?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */
router.get('/:deviceId/summary', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Get device info
    const device = await Device.findById(deviceId);
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Get all analytics
    const [
      recentActivity,
      uptimeStats,
      switchUsage,
      activeSwitches,
      currentStatus
    ] = await Promise.all([
      DeviceActivityLog.getRecentActivity(deviceId, 5),
      DeviceActivityLog.getUptimeStats(deviceId, start, end),
      SwitchStateLog.getPerSwitchConsumption(deviceId, start, end),
      SwitchStateLog.getActiveSwitches(deviceId),
      DeviceActivityLog.getCurrentStatus(deviceId)
    ]);

    // Calculate current runtime for active switches
    const now = new Date();
    const activeSwitchesWithRuntime = activeSwitches.map(sw => {
      const runtimeHours = (now - sw.timestamp) / (1000 * 60 * 60);
      const energy = sw.powerRating * runtimeHours;
      return {
        switchName: sw.switchName,
        switchType: sw.switchType,
        turnedOnAt: sw.timestamp,
        currentRuntimeHours: runtimeHours.toFixed(2),
        powerRating: sw.powerRating,
        energyKwhSoFar: (energy / 1000).toFixed(3)
      };
    });

    res.json({
      device: {
        id: device._id,
        name: device.name,
        macAddress: device.macAddress,
        classroom: device.classroom,
        currentStatus: device.status
      },
      period: { startDate, endDate },
      currentStatus,
      uptime: uptimeStats,
      recentActivity: recentActivity.map(a => ({
        activityType: a.activityType,
        timestamp: a.timestamp,
        durationHours: a.onlineDurationMinutes 
          ? (a.onlineDurationMinutes / 60).toFixed(2)
          : a.offlineDurationMinutes 
            ? (a.offlineDurationMinutes / 60).toFixed(2)
            : null,
        reason: a.reason
      })),
      switchUsage,
      activeSwitches: {
        count: activeSwitches.length,
        switches: activeSwitchesWithRuntime
      }
    });
  } catch (error) {
    console.error('Error getting device analytics summary:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

module.exports = router;
