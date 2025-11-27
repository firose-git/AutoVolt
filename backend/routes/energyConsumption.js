const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const EnergyConsumption = require('../models/EnergyConsumption');
const powerTracker = require('../services/powerConsumptionTracker');
const { logger } = require('../middleware/logger');

/**
 * Energy Consumption API Routes
 * Endpoints for querying power consumption by classroom and ESP32 device
 */

/**
 * GET /api/energy-consumption/classroom/:classroom
 * Get consumption data for a specific classroom
 */
router.get('/classroom/:classroom', auth, async (req, res) => {
  try {
    const { classroom } = req.params;
    const { startDate, endDate, groupBy = 'day' } = req.query;
    
    // Default to last 30 days if not specified
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end - 30 * 24 * 60 * 60 * 1000);
    
    // Get consumption report
    const report = await powerTracker.getClassroomReport(classroom, start, end);
    
    // Get detailed records
    const records = await EnergyConsumption.find({
      classroom,
      date: { $gte: start, $lte: end }
    }).sort({ date: 1 });
    
    // Group by specified period
    const grouped = groupByPeriod(records, groupBy);
    
    res.json({
      success: true,
      data: {
        classroom,
        period: { startDate: start, endDate: end },
        summary: report,
        records: grouped,
        totalRecords: records.length
      }
    });
  } catch (error) {
    logger.error('[Energy API] Classroom consumption error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to retrieve consumption data', 
      error: error.message 
    });
  }
});

/**
 * GET /api/energy-consumption/device/:deviceId
 * Get consumption data for a specific ESP32 device
 */
router.get('/device/:deviceId', auth, async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { startDate, endDate, groupBy = 'day' } = req.query;
    
    // Default to last 30 days if not specified
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end - 30 * 24 * 60 * 60 * 1000);
    
    // Get consumption report
    const records = await powerTracker.getDeviceReport(deviceId, start, end);
    
    // Calculate totals
    const totals = records.reduce((acc, record) => {
      acc.totalEnergyKwh += record.totalEnergyKwh || 0;
      acc.totalCost += record.totalCost || 0;
      acc.totalRuntimeHours += record.totalRuntimeHours || 0;
      return acc;
    }, { totalEnergyKwh: 0, totalCost: 0, totalRuntimeHours: 0 });
    
    // Group by specified period
    const grouped = groupByPeriod(records, groupBy);
    
    // Get breakdown by switch type
    const byType = calculateTypeBreakdown(records);
    
    res.json({
      success: true,
      data: {
        deviceId,
        period: { startDate: start, endDate: end },
        summary: {
          ...totals,
          averageDailyCost: records.length > 0 ? totals.totalCost / records.length : 0
        },
        byType,
        records: grouped,
        totalRecords: records.length
      }
    });
  } catch (error) {
    logger.error('[Energy API] Device consumption error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to retrieve consumption data', 
      error: error.message 
    });
  }
});

/**
 * GET /api/energy-consumption/active-switches
 * Get currently active switches (ON and consuming power)
 */
router.get('/active-switches', auth, async (req, res) => {
  try {
    const activeSwitches = powerTracker.getActiveSwitches();
    
    res.json({
      success: true,
      data: {
        count: activeSwitches.length,
        switches: activeSwitches,
        totalPowerWatts: activeSwitches.reduce((sum, sw) => sum + sw.powerWatts, 0),
        totalEstimatedCost: activeSwitches.reduce((sum, sw) => sum + sw.estimatedCost, 0)
      }
    });
  } catch (error) {
    logger.error('[Energy API] Active switches error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to retrieve active switches', 
      error: error.message 
    });
  }
});

/**
 * GET /api/energy-consumption/summary
 * Get overall consumption summary across all devices
 */
router.get('/summary', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Default to current month if not specified
    const now = new Date();
    const end = endDate ? new Date(endDate) : now;
    const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Aggregate consumption data
    const summary = await EnergyConsumption.aggregate([
      {
        $match: {
          date: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: null,
          totalEnergyKwh: { $sum: '$totalEnergyKwh' },
          totalCost: { $sum: '$totalCost' },
          totalRuntimeHours: { $sum: '$totalRuntimeHours' },
          deviceCount: { $addToSet: '$deviceId' },
          classroomCount: { $addToSet: '$classroom' }
        }
      }
    ]);
    
    // Get by classroom
    const byClassroom = await EnergyConsumption.aggregate([
      {
        $match: {
          date: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: '$classroom',
          totalEnergyKwh: { $sum: '$totalEnergyKwh' },
          totalCost: { $sum: '$totalCost' },
          deviceCount: { $addToSet: '$deviceId' }
        }
      },
      {
        $sort: { totalCost: -1 }
      }
    ]);
    
    // Get by device type
    const byType = await EnergyConsumption.aggregate([
      {
        $match: {
          date: { $gte: start, $lte: end }
        }
      },
      {
        $project: {
          types: { $objectToArray: '$consumptionByType' }
        }
      },
      {
        $unwind: '$types'
      },
      {
        $group: {
          _id: '$types.k',
          totalEnergyKwh: { $sum: '$types.v.energyKwh' },
          totalCost: { $sum: '$types.v.cost' },
          totalRuntimeHours: { $sum: '$types.v.runtimeHours' }
        }
      },
      {
        $sort: { totalCost: -1 }
      }
    ]);
    
    const result = summary[0] || {
      totalEnergyKwh: 0,
      totalCost: 0,
      totalRuntimeHours: 0,
      deviceCount: [],
      classroomCount: []
    };
    
    res.json({
      success: true,
      data: {
        period: { startDate: start, endDate: end },
        overall: {
          totalEnergyKwh: result.totalEnergyKwh,
          totalCost: result.totalCost,
          totalRuntimeHours: result.totalRuntimeHours,
          uniqueDevices: result.deviceCount.length,
          uniqueClassrooms: result.classroomCount.length
        },
        byClassroom: byClassroom.map(c => ({
          classroom: c._id,
          energyKwh: c.totalEnergyKwh,
          cost: c.totalCost,
          deviceCount: c.deviceCount.length
        })),
        byType: byType.map(t => ({
          type: t._id,
          energyKwh: t.totalEnergyKwh,
          cost: t.totalCost,
          runtimeHours: t.totalRuntimeHours
        }))
      }
    });
  } catch (error) {
    logger.error('[Energy API] Summary error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to retrieve summary', 
      error: error.message 
    });
  }
});

/**
 * GET /api/energy-consumption/comparison
 * Compare consumption between classrooms or devices
 */
router.get('/comparison', auth, async (req, res) => {
  try {
    const { type = 'classroom', entities, startDate, endDate } = req.query;
    
    if (!entities) {
      return res.status(400).json({ 
        success: false, 
        message: 'entities parameter required (comma-separated list)' 
      });
    }
    
    const entityList = entities.split(',').map(e => e.trim());
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end - 30 * 24 * 60 * 60 * 1000);
    
    const comparison = [];
    
    for (const entity of entityList) {
      if (type === 'classroom') {
        const data = await EnergyConsumption.aggregate([
          {
            $match: {
              classroom: entity,
              date: { $gte: start, $lte: end }
            }
          },
          {
            $group: {
              _id: '$classroom',
              totalEnergyKwh: { $sum: '$totalEnergyKwh' },
              totalCost: { $sum: '$totalCost' },
              days: { $sum: 1 }
            }
          }
        ]);
        
        if (data.length > 0) {
          comparison.push({
            entity,
            type: 'classroom',
            ...data[0],
            averageDailyCost: data[0].totalCost / data[0].days
          });
        }
      } else if (type === 'device') {
        const data = await EnergyConsumption.aggregate([
          {
            $match: {
              deviceId: entity,
              date: { $gte: start, $lte: end }
            }
          },
          {
            $group: {
              _id: '$deviceId',
              deviceName: { $first: '$deviceName' },
              totalEnergyKwh: { $sum: '$totalEnergyKwh' },
              totalCost: { $sum: '$totalCost' },
              days: { $sum: 1 }
            }
          }
        ]);
        
        if (data.length > 0) {
          comparison.push({
            entity,
            type: 'device',
            ...data[0],
            averageDailyCost: data[0].totalCost / data[0].days
          });
        }
      }
    }
    
    res.json({
      success: true,
      data: {
        period: { startDate: start, endDate: end },
        comparison: comparison.sort((a, b) => b.totalCost - a.totalCost)
      }
    });
  } catch (error) {
    logger.error('[Energy API] Comparison error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to compare consumption', 
      error: error.message 
    });
  }
});

/**
 * Helper function to group records by period
 */
function groupByPeriod(records, groupBy) {
  if (groupBy === 'raw') return records;
  
  const grouped = {};
  
  records.forEach(record => {
    let key;
    const date = new Date(record.date);
    
    switch (groupBy) {
      case 'day':
        key = date.toISOString().split('T')[0];
        break;
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
        break;
      case 'month':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
      case 'year':
        key = String(date.getFullYear());
        break;
      default:
        key = date.toISOString().split('T')[0];
    }
    
    if (!grouped[key]) {
      grouped[key] = {
        period: key,
        totalEnergyKwh: 0,
        totalCost: 0,
        totalRuntimeHours: 0,
        records: []
      };
    }
    
    grouped[key].totalEnergyKwh += record.totalEnergyKwh || 0;
    grouped[key].totalCost += record.totalCost || 0;
    grouped[key].totalRuntimeHours += record.totalRuntimeHours || 0;
    grouped[key].records.push(record);
  });
  
  return Object.values(grouped).sort((a, b) => a.period.localeCompare(b.period));
}

/**
 * Helper function to calculate breakdown by switch type
 */
function calculateTypeBreakdown(records) {
  const breakdown = {
    light: { energyKwh: 0, cost: 0, runtimeHours: 0 },
    fan: { energyKwh: 0, cost: 0, runtimeHours: 0 },
    ac: { energyKwh: 0, cost: 0, runtimeHours: 0 },
    projector: { energyKwh: 0, cost: 0, runtimeHours: 0 },
    outlet: { energyKwh: 0, cost: 0, runtimeHours: 0 },
    other: { energyKwh: 0, cost: 0, runtimeHours: 0 }
  };
  
  records.forEach(record => {
    if (record.consumptionByType) {
      Object.keys(breakdown).forEach(type => {
        if (record.consumptionByType[type]) {
          breakdown[type].energyKwh += record.consumptionByType[type].energyKwh || 0;
          breakdown[type].cost += record.consumptionByType[type].cost || 0;
          breakdown[type].runtimeHours += record.consumptionByType[type].runtimeHours || 0;
        }
      });
    }
  });
  
  return breakdown;
}

module.exports = router;
