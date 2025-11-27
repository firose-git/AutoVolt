const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const telegramService = require('../services/telegramService');
const TelegramUser = require('../models/TelegramUser');
const User = require('../models/User');
const smartNotificationService = require('../services/smartNotificationService');

// Webhook endpoint for Telegram bot updates
router.post('/webhook', async (req, res) => {
  try {
    const update = req.body;

    // Process the update asynchronously
    telegramService.processWebhookUpdate(update).catch(error => {
      console.error('Error processing webhook update:', error);
    });

    // Respond immediately to Telegram
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Alert webhook endpoint for Alertmanager
router.post('/alerts/webhook', async (req, res) => {
  try {
    const alerts = req.body.alerts || [];

    console.log(`Received ${alerts.length} alerts from Alertmanager`);

    for (const alert of alerts) {
      const alertType = getAlertTypeFromLabels(alert.labels);
      const alertData = {
        alertname: alert.labels.alertname,
        summary: alert.annotations.summary,
        description: alert.annotations.description,
        severity: alert.labels.severity,
        instance: alert.labels.instance,
        value: alert.value
      };

      try {
        await telegramService.sendAlert(alertType, alertData, alert.labels);
        console.log(`Alert ${alert.labels.alertname} sent to subscribers`);
      } catch (error) {
        console.error(`Failed to send alert ${alert.labels.alertname}:`, error);
      }
    }

    res.status(200).json({ status: 'alerts processed' });
  } catch (error) {
    console.error('Alert webhook error:', error);
    res.status(500).json({ error: 'Failed to process alerts' });
  }
});

// Helper function to map alert labels to alert types
function getAlertTypeFromLabels(labels) {
  const alertname = labels.alertname;

  const alertTypeMap = {
    'DeviceOffline': 'deviceOffline',
    'SwitchesOnAfter5PM': 'switchesOnAfter5PM',
    'BackendDown': 'systemAlerts',
    'DatabaseDown': 'systemAlerts',
    'HighCPUUsage': 'systemAlerts',
    'HighMemoryUsage': 'systemAlerts',
    'DiskSpaceLow': 'systemAlerts',
    'MQTTConnectionIssues': 'systemAlerts',
    'PowerUsageSpike': 'energyAlerts',
    'MultipleDevicesOffline': 'maintenanceAlerts',
    'ClassScheduleDisruption': 'admin_alerts',
    'AbnormalEnergyConsumption': 'energyAlerts',
    'SwitchTimeLimitExceeded': 'energyAlerts'
  };

  return alertTypeMap[alertname] || 'systemAlerts';
}

// Test endpoint to send test alert
router.post('/test-alert', auth, authorize('admin', 'super-admin'), async (req, res) => {
  try {
    const { alertType = 'systemAlerts', message = 'Test alert from IoT Classroom system' } = req.body;

    const testAlertData = {
      alertname: 'TestAlert',
      summary: 'Test Alert',
      description: message,
      severity: 'info'
    };

    const results = await telegramService.sendAlert(alertType, testAlertData);

    res.json({
      success: true,
      message: 'Test alert sent',
      results: results
    });
  } catch (error) {
    console.error('Test alert error:', error);
    res.status(500).json({ error: 'Failed to send test alert' });
  }
});

// Get Telegram bot info
router.get('/bot-info', auth, authorize('admin', 'super-admin'), async (req, res) => {
  try {
    const botInfo = await telegramService.getBotInfo();
    res.json({
      success: true,
      bot: botInfo
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get bot info' });
  }
});

// Test smart notification service
router.post('/test-smart-notifications', auth, authorize('admin', 'super-admin'), async (req, res) => {
  try {
    const result = await smartNotificationService.triggerOfflineCheck();
    res.json({
      success: true,
      message: 'Smart notification check triggered',
      result: result
    });
  } catch (error) {
    console.error('Test smart notifications error:', error);
    res.status(500).json({ error: 'Failed to trigger smart notifications' });
  }
});

// Test after-hours lights monitor
router.post('/test-after-hours-monitor', auth, authorize('admin', 'super-admin', 'security'), async (req, res) => {
  try {
    const afterHoursLightsMonitor = require('../services/afterHoursLightsMonitor');
    const result = await afterHoursLightsMonitor.triggerManualCheck();
    res.json({
      success: true,
      message: 'After-hours lights check triggered',
      result: result
    });
  } catch (error) {
    console.error('Test after-hours monitor error:', error);
    res.status(500).json({ error: 'Failed to trigger after-hours check' });
  }
});

// Get after-hours monitor status
router.get('/after-hours-status', auth, authorize('admin', 'super-admin', 'security'), async (req, res) => {
  try {
    const afterHoursLightsMonitor = require('../services/afterHoursLightsMonitor');
    const status = afterHoursLightsMonitor.getStatus();
    res.json({
      success: true,
      status: status
    });
  } catch (error) {
    console.error('Error getting after-hours status:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

// Update after-hours monitor configuration
router.patch('/after-hours-config', auth, authorize('admin', 'super-admin'), async (req, res) => {
  try {
    const afterHoursLightsMonitor = require('../services/afterHoursLightsMonitor');
    const { afterHoursThreshold, alertCooldown } = req.body;
    
    if (afterHoursThreshold !== undefined) {
      afterHoursLightsMonitor.setAfterHoursThreshold(afterHoursThreshold);
    }
    
    if (alertCooldown !== undefined) {
      afterHoursLightsMonitor.setAlertCooldown(alertCooldown);
    }
    
    res.json({
      success: true,
      message: 'Configuration updated',
      status: afterHoursLightsMonitor.getStatus()
    });
  } catch (error) {
    console.error('Error updating after-hours config:', error);
    res.status(500).json({ error: error.message || 'Failed to update configuration' });
  }
});

// Get all Telegram users (admin only)
router.get('/users', auth, authorize('admin', 'super-admin'), async (req, res) => {
  try {
    const telegramUsers = await TelegramUser.find()
      .populate('user', 'name email role department')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      users: telegramUsers
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch Telegram users' });
  }
});

// Get current user's Telegram status
router.get('/my-status', auth, async (req, res) => {
  try {
    const telegramUser = await TelegramUser.findOne({ user: req.user.id })
      .populate('user', 'name email role');

    res.json({
      success: true,
      telegramUser: telegramUser
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch Telegram status' });
  }
});

// Update user's Telegram notification preferences
router.patch('/preferences', auth, async (req, res) => {
  try {
    const { notificationPreferences, roleSubscriptions } = req.body;

    const telegramUser = await TelegramUser.findOne({ user: req.user.id });

    if (!telegramUser) {
      return res.status(404).json({ error: 'Telegram user not found. Please register first.' });
    }

    if (notificationPreferences) {
      telegramUser.notificationPreferences = {
        ...telegramUser.notificationPreferences,
        ...notificationPreferences
      };
    }

    if (roleSubscriptions) {
      telegramUser.roleSubscriptions = roleSubscriptions;
    }

    await telegramUser.save();

    res.json({
      success: true,
      message: 'Preferences updated successfully',
      preferences: telegramUser.notificationPreferences,
      subscriptions: telegramUser.roleSubscriptions
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// Deactivate user's Telegram registration
router.delete('/unregister', auth, async (req, res) => {
  try {
    const telegramUser = await TelegramUser.findOneAndUpdate(
      { user: req.user.id },
      { isActive: false },
      { new: true }
    );

    if (!telegramUser) {
      return res.status(404).json({ error: 'Telegram user not found' });
    }

    // Update user's notification preferences
    await User.findByIdAndUpdate(req.user.id, {
      'notificationPreferences.telegram': false
    });

    res.json({
      success: true,
      message: 'Telegram registration deactivated'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to deactivate registration' });
  }
});

// Admin endpoint to send message to specific user
router.post('/send-message', auth, authorize('admin', 'super-admin'), async (req, res) => {
  try {
    const { userId, message } = req.body;

    if (!userId || !message) {
      return res.status(400).json({ error: 'userId and message are required' });
    }

    const telegramUser = await TelegramUser.findOne({ user: userId, isActive: true });

    if (!telegramUser) {
      return res.status(404).json({ error: 'User not registered for Telegram notifications' });
    }

    await telegramService.sendMessage(telegramUser.chatId, message);

    res.json({
      success: true,
      message: 'Message sent successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Admin endpoint to manage Telegram user status
router.patch('/users/:telegramUserId/status', auth, authorize('admin', 'super-admin'), async (req, res) => {
  try {
    const { telegramUserId } = req.params;
    const { isActive } = req.body;

    const telegramUser = await TelegramUser.findByIdAndUpdate(
      telegramUserId,
      { isActive },
      { new: true }
    ).populate('user', 'name email');

    if (!telegramUser) {
      return res.status(404).json({ error: 'Telegram user not found' });
    }

    // Update user's notification preferences
    await User.findByIdAndUpdate(telegramUser.user._id, {
      'notificationPreferences.telegram': isActive
    });

    res.json({
      success: true,
      message: `Telegram user ${isActive ? 'activated' : 'deactivated'}`,
      user: telegramUser
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// Get Telegram statistics
router.get('/stats', auth, authorize('admin', 'super-admin'), async (req, res) => {
  try {
    const stats = await TelegramUser.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          activeUsers: { $sum: { $cond: ['$isActive', 1, 0] } },
          verifiedUsers: { $sum: { $cond: ['$isVerified', 1, 0] } },
          totalAlerts: { $sum: '$alertsReceived' },
          totalMessages: { $sum: '$messagesReceived' }
        }
      }
    ]);

    const subscriptionStats = await TelegramUser.aggregate([
      { $unwind: '$roleSubscriptions' },
      {
        $group: {
          _id: '$roleSubscriptions',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      stats: stats[0] || {
        totalUsers: 0,
        activeUsers: 0,
        verifiedUsers: 0,
        totalAlerts: 0,
        totalMessages: 0
      },
      subscriptionStats: subscriptionStats
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router;