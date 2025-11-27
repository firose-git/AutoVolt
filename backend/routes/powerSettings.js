const express = require('express');
const router = express.Router();
const Device = require('../models/Device');
const { auth } = require('../middleware/auth');

// Apply authentication to all routes
router.use(auth);

/**
 * Get power settings for a device
 * GET /api/power-settings/:deviceId
 */
router.get('/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;

    const device = await Device.findById(deviceId).select('powerSettings name macAddress');
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Return default values if not set
    const settings = {
      deviceId: device._id,
      deviceName: device.name,
      pricePerUnit: device.powerSettings?.pricePerUnit || 7.5,
      consumptionFactor: device.powerSettings?.consumptionFactor || 1.0,
      updatedAt: device.powerSettings?.updatedAt || null
    };

    res.json(settings);
  } catch (error) {
    console.error('Error getting power settings:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

/**
 * Update power price per unit for a device
 * PUT /api/power-settings/:deviceId/price
 * Body: { pricePerUnit: number }
 */
router.put('/:deviceId/price', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { pricePerUnit } = req.body;

    if (typeof pricePerUnit !== 'number' || pricePerUnit < 0) {
      return res.status(400).json({ error: 'Invalid pricePerUnit. Must be a positive number.' });
    }

    const device = await Device.findById(deviceId);
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Initialize powerSettings if not exists
    if (!device.powerSettings) {
      device.powerSettings = {};
    }

    device.powerSettings.pricePerUnit = pricePerUnit;
    device.powerSettings.updatedAt = new Date();
    
    await device.save();

    res.json({
      success: true,
      message: 'Price per unit updated successfully',
      pricePerUnit: device.powerSettings.pricePerUnit,
      updatedAt: device.powerSettings.updatedAt
    });
  } catch (error) {
    console.error('Error updating price per unit:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

/**
 * Update consumption factor (calibration) for a device
 * PUT /api/power-settings/:deviceId/calibration
 * Body: { consumptionFactor: number }
 */
router.put('/:deviceId/calibration', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { consumptionFactor } = req.body;

    if (typeof consumptionFactor !== 'number' || consumptionFactor <= 0) {
      return res.status(400).json({ 
        error: 'Invalid consumptionFactor. Must be a positive number (e.g., 0.9 for 10% reduction, 1.1 for 10% increase).' 
      });
    }

    const device = await Device.findById(deviceId);
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Initialize powerSettings if not exists
    if (!device.powerSettings) {
      device.powerSettings = {};
    }

    device.powerSettings.consumptionFactor = consumptionFactor;
    device.powerSettings.updatedAt = new Date();
    
    await device.save();

    res.json({
      success: true,
      message: 'Consumption factor updated successfully',
      consumptionFactor: device.powerSettings.consumptionFactor,
      updatedAt: device.powerSettings.updatedAt
    });
  } catch (error) {
    console.error('Error updating consumption factor:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

/**
 * Update both price and calibration for a device
 * PUT /api/power-settings/:deviceId
 * Body: { pricePerUnit?: number, consumptionFactor?: number }
 */
router.put('/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { pricePerUnit, consumptionFactor } = req.body;

    // Validate inputs
    if (pricePerUnit !== undefined && (typeof pricePerUnit !== 'number' || pricePerUnit < 0)) {
      return res.status(400).json({ error: 'Invalid pricePerUnit. Must be a positive number.' });
    }

    if (consumptionFactor !== undefined && (typeof consumptionFactor !== 'number' || consumptionFactor <= 0)) {
      return res.status(400).json({ 
        error: 'Invalid consumptionFactor. Must be a positive number.' 
      });
    }

    const device = await Device.findById(deviceId);
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Initialize powerSettings if not exists
    if (!device.powerSettings) {
      device.powerSettings = {};
    }

    // Update only provided fields
    if (pricePerUnit !== undefined) {
      device.powerSettings.pricePerUnit = pricePerUnit;
    }

    if (consumptionFactor !== undefined) {
      device.powerSettings.consumptionFactor = consumptionFactor;
    }

    device.powerSettings.updatedAt = new Date();
    
    await device.save();

    res.json({
      success: true,
      message: 'Power settings updated successfully',
      settings: {
        pricePerUnit: device.powerSettings.pricePerUnit,
        consumptionFactor: device.powerSettings.consumptionFactor,
        updatedAt: device.powerSettings.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating power settings:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

/**
 * Bulk update price for multiple devices
 * PUT /api/power-settings/bulk/price
 * Body: { deviceIds: string[], pricePerUnit: number }
 */
router.put('/bulk/price', async (req, res) => {
  try {
    const { deviceIds, pricePerUnit } = req.body;

    if (!Array.isArray(deviceIds) || deviceIds.length === 0) {
      return res.status(400).json({ error: 'deviceIds must be a non-empty array' });
    }

    if (typeof pricePerUnit !== 'number' || pricePerUnit < 0) {
      return res.status(400).json({ error: 'Invalid pricePerUnit. Must be a positive number.' });
    }

    const result = await Device.updateMany(
      { _id: { $in: deviceIds } },
      { 
        $set: { 
          'powerSettings.pricePerUnit': pricePerUnit,
          'powerSettings.updatedAt': new Date()
        } 
      }
    );

    res.json({
      success: true,
      message: `Price per unit updated for ${result.modifiedCount} device(s)`,
      modifiedCount: result.modifiedCount,
      pricePerUnit
    });
  } catch (error) {
    console.error('Error bulk updating price:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

/**
 * Get global default power settings
 * GET /api/power-settings/defaults
 */
router.get('/defaults', async (req, res) => {
  try {
    // You can store these in a config collection or environment variables
    const defaults = {
      pricePerUnit: parseFloat(process.env.DEFAULT_PRICE_PER_UNIT) || 7.5,
      consumptionFactor: 1.0
    };

    res.json(defaults);
  } catch (error) {
    console.error('Error getting default settings:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

module.exports = router;
