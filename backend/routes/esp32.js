const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const deviceApiController = require('../controllers/deviceApiController');
const esp32Controller = require('../controllers/esp32Controller');
const { 
  validatePowerReading, 
  validateOfflineReadings, 
  validateChecksum 
} = require('../middleware/powerReadingValidator');

// Rate limiter for live power readings (per device)
const powerReadingLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // Max 2 readings per second
  keyGenerator: (req) => req.params.macAddress,
  message: {
    error: 'Rate limit exceeded',
    message: 'Too many power readings from this device. Maximum: 120 per minute (2/second)'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for offline sync (per device)
const syncReadingsLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // Max 10 syncs per 5 minutes
  keyGenerator: (req) => req.params.macAddress,
  message: {
    error: 'Rate limit exceeded',
    message: 'Too many sync requests from this device. Maximum: 10 per 5 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ESP32 endpoints
router.get('/config/:macAddress', deviceApiController.getDeviceConfig);
router.post('/state/:macAddress', deviceApiController.updateDeviceStatus);
router.post('/command/:macAddress', deviceApiController.sendCommand);

// Power reading endpoints with validation and rate limiting
router.post('/power-reading/:macAddress', 
  powerReadingLimiter,
  validatePowerReading,
  esp32Controller.submitPowerReading
);

router.post('/sync-readings/:macAddress',
  syncReadingsLimiter,
  validateOfflineReadings,
  validateChecksum,
  esp32Controller.syncOfflineReadings
);

module.exports = router;
