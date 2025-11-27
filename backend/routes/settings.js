const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  getSettings,
  updateSettings
} = require('../controllers/settingsController');
const fs = require('fs').promises;
const path = require('path');
const { loadPowerSettings: reloadMetricsSettings } = require('../metricsService');

// Path to power settings file
const SETTINGS_FILE = path.join(__dirname, '../data/powerSettings.json');

// Default power settings
const DEFAULT_POWER_SETTINGS = {
  deviceTypes: [
    { type: 'relay', name: 'Relay Switch', icon: 'Zap', powerConsumption: 50, unit: 'W' },
    { type: 'light', name: 'LED Lights', icon: 'Lightbulb', powerConsumption: 40, unit: 'W' },
    { type: 'fan', name: 'HVAC Fans', icon: 'Fan', powerConsumption: 75, unit: 'W' },
    { type: 'outlet', name: 'Power Outlet', icon: 'Plug', powerConsumption: 100, unit: 'W' },
    { type: 'projector', name: 'Projector', icon: 'Monitor', powerConsumption: 200, unit: 'W' },
    { type: 'ac', name: 'Air Conditioner', icon: 'Activity', powerConsumption: 1500, unit: 'W' }
  ],
  electricityPrice: 7.5 // Default price per kWh in rupees
};

// Ensure data directory exists
const ensureDataDirectory = async () => {
  const dataDir = path.join(__dirname, '../data');
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
};

// Load power settings from file
const loadPowerSettings = async () => {
  try {
    await ensureDataDirectory();
    const data = await fs.readFile(SETTINGS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist, return defaults
    return DEFAULT_POWER_SETTINGS;
  }
};

// Save power settings to file
const savePowerSettings = async (settings) => {
  try {
    await ensureDataDirectory();
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving power settings:', error);
    throw error;
  }
};

// Power Settings routes - MUST come before general routes to avoid conflicts

// GET /api/settings/power - Get current power settings
router.get('/power', auth, async (req, res) => {
  try {
    const settings = await loadPowerSettings();
    res.json(settings);
  } catch (error) {
    console.error('Error loading power settings:', error);
    res.status(500).json({ 
      error: 'Failed to load power settings',
      settings: DEFAULT_POWER_SETTINGS 
    });
  }
});

// POST /api/settings/power - Update power settings (Admin only)
router.post('/power', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin' && req.user.role !== 'super-admin') {
      return res.status(403).json({ 
        error: 'Access denied. Admin privileges required.' 
      });
    }

    const { deviceTypes, electricityPrice } = req.body;

    // Validate input
    if (!Array.isArray(deviceTypes) || typeof electricityPrice !== 'number') {
      return res.status(400).json({ 
        error: 'Invalid settings format. Expected deviceTypes array and electricityPrice number.' 
      });
    }

    // Validate device types
    for (const device of deviceTypes) {
      if (!device.type || !device.name || typeof device.powerConsumption !== 'number') {
        return res.status(400).json({ 
          error: 'Invalid device type format. Each device must have type, name, and powerConsumption.' 
        });
      }
      if (device.powerConsumption < 0) {
        return res.status(400).json({ 
          error: `Invalid power consumption for ${device.name}. Must be non-negative.` 
        });
      }
    }

    // Validate electricity price
    if (electricityPrice < 0) {
      return res.status(400).json({ 
        error: 'Invalid electricity price. Must be non-negative.' 
      });
    }

    const settings = { deviceTypes, electricityPrice };
    await savePowerSettings(settings);

    // Reload power settings in metricsService immediately
    console.log('[Settings] Reloading power settings in metricsService...');
    await reloadMetricsSettings();

    res.json({ 
      success: true, 
      message: 'Power settings updated successfully',
      settings 
    });
  } catch (error) {
    console.error('Error saving power settings:', error);
    res.status(500).json({ 
      error: 'Failed to save power settings' 
    });
  }
});

// GET /api/settings/power/device/:type - Get power consumption for specific device type
router.get('/power/device/:type', auth, async (req, res) => {
  try {
    const { type } = req.params;
    const settings = await loadPowerSettings();
    
    const device = settings.deviceTypes.find(d => d.type === type);
    if (!device) {
      // Return default device if type not found
      const defaultDevice = settings.deviceTypes.find(d => d.type === 'default');
      return res.json(defaultDevice || { powerConsumption: 50, unit: 'W' });
    }

    res.json(device);
  } catch (error) {
    console.error('Error loading device power settings:', error);
    res.status(500).json({ 
      error: 'Failed to load device power settings',
      device: { powerConsumption: 50, unit: 'W' }
    });
  }
});

// GET /api/settings/power/price - Get current electricity price
router.get('/power/price', auth, async (req, res) => {
  try {
    const settings = await loadPowerSettings();
    res.json({ 
      price: settings.electricityPrice,
      currency: 'INR',
      unit: 'kWh'
    });
  } catch (error) {
    console.error('Error loading electricity price:', error);
    res.status(500).json({ 
      error: 'Failed to load electricity price',
      price: 7.5,
      currency: 'INR',
      unit: 'kWh'
    });
  }
});

// POST /api/settings/power/reload - Force immediate reload of power settings
router.post('/power/reload', auth, async (req, res) => {
  try {
    console.log('[Settings] Manual reload requested - reloading power settings...');
    await reloadMetricsSettings();
    res.json({ 
      success: true, 
      message: 'Power settings reloaded successfully'
    });
  } catch (error) {
    console.error('Error reloading power settings:', error);
    res.status(500).json({ 
      error: 'Failed to reload power settings'
    });
  }
});

// General settings routes - MUST come after specific routes
router.get('/', auth, getSettings);
router.put('/', auth, updateSettings);

module.exports = router;

