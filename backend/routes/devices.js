
const express = require('express');
const { auth, authorize, checkDeviceAccess } = require('../middleware/auth');
const { validateDevice, validateDeviceUpdate } = require('../middleware/deviceValidator');
const { handleValidationErrors } = require('../middleware/validationHandler');
const { checkDevicePermission, incrementUsage, checkValueLimits } = require('../middleware/devicePermissions');
const { bulkToggleByType, bulkToggleByLocation } = require('../controllers/deviceController');
const {
  getAllDevices,
  createDevice,
  toggleSwitch,
  getDeviceStats,
  updateDevice,
  deleteDevice,
  getDeviceById,
  getGpioPinInfo,
  validateGpioConfig,
  bulkToggleSwitches
} = require('../controllers/deviceController');
const { body, param } = require('express-validator');

const router = express.Router();

// GPIO pin information and validation (public for testing)
router.get('/gpio-info', getGpioPinInfo);
router.get('/gpio-info/:deviceId', getGpioPinInfo);
router.post('/validate-gpio', validateGpioConfig);

// All routes require authentication
router.use(auth);

// Device CRUD routes
router.get('/', getAllDevices);
router.post('/', authorize('admin', 'super-admin'), validateDevice, handleValidationErrors, createDevice);
router.get('/stats', getDeviceStats);
router.get('/:deviceId', getDeviceById);
router.put('/:deviceId', authorize('admin', 'super-admin'), validateDeviceUpdate, handleValidationErrors, updateDevice);
router.delete('/:deviceId', authorize('admin', 'super-admin'), deleteDevice);

// Switch control routes
router.post('/:deviceId/switches/:switchId/toggle', checkDevicePermission('canTurnOn', 'canTurnOff'), toggleSwitch);

// Bulk operations
router.post('/bulk-toggle', authorize('admin', 'super-admin'), bulkToggleSwitches);
router.post('/bulk-toggle/type/:type', authorize('admin', 'super-admin'), bulkToggleByType);
router.post('/bulk-toggle/location/:location', authorize('admin', 'super-admin'), bulkToggleByLocation);

// PIR sensor data access
router.get('/:deviceId/pir/data',
  checkDevicePermission('canViewPirData'),
  require('../controllers/deviceController').getPirData
);

// MQTT switch command - DISABLED (keeping for safety/fallback only)
/*
router.post('/mqtt/switch/:relay/:state', authorize('admin', 'principal', 'dean', 'hod', 'faculty'), (req, res) => {
  const { relay, state } = req.params;
  if (!global.sendMqttSwitchCommand) {
    return res.status(500).json({ error: 'MQTT client not available' });
  }
  try {
    global.sendMqttSwitchCommand(relay, state);
    res.json({ success: true, message: `MQTT command sent: ${relay}:${state}` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send MQTT command' });
  }
});
*/

console.log('[MQTT] MQTT switch command route disabled - using WebSocket communication only');

module.exports = router;
