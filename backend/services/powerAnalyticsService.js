const PowerReading = require('../models/PowerReading');
const Device = require('../models/Device');
const mongoose = require('mongoose');

/**
 * Power Analytics Service
 * 
 * Calculates power consumption analytics from PowerReading data
 * Supports daily, monthly, and yearly aggregations
 * Works with both online and offline data
 */

class PowerAnalyticsService {
  /**
   * Get real-time power data for a device
   */
  async getCurrentPower(deviceId) {
    const latestReading = await PowerReading.findOne({ deviceId })
      .sort({ timestamp: -1 })
      .limit(1)
      .lean();

    if (!latestReading) {
      return {
        power: 0,
        voltage: 0,
        current: 0,
        lastUpdate: null,
        status: 'no_data'
      };
    }

    // Check if device is online (reading within last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const isOnline = latestReading.timestamp > fiveMinutesAgo;

    return {
      power: latestReading.power,
      voltage: latestReading.voltage,
      current: latestReading.current,
      lastUpdate: latestReading.timestamp,
      status: isOnline ? 'online' : 'offline'
    };
  }

  /**
   * Get daily consumption summary
   */
  async getDailyConsumption(deviceId, startDate, endDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const dailyData = await PowerReading.aggregate([
      {
        $match: {
          deviceId: mongoose.Types.ObjectId(deviceId),
          timestamp: { $gte: start, $lte: end }
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
          totalEnergyWh: { $sum: '$energy' },
          totalCost: { $sum: '$cost' },
          avgPower: { $avg: '$power' },
          maxPower: { $max: '$power' },
          minPower: { $min: '$power' },
          readingCount: { $sum: 1 },
          onlineReadings: {
            $sum: { $cond: [{ $eq: ['$status', 'online'] }, 1, 0] }
          },
          offlineReadings: {
            $sum: { $cond: [{ $eq: ['$status', 'offline'] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          _id: 0,
          date: 1,
          energyKwh: { $divide: ['$totalEnergyWh', 1000] },
          cost: { $round: ['$totalCost', 2] },
          avgPower: { $round: ['$avgPower', 2] },
          maxPower: { $round: ['$maxPower', 2] },
          minPower: { $round: ['$minPower', 2] },
          readingCount: 1,
          onlineReadings: 1,
          offlineReadings: 1
        }
      },
      {
        $sort: { date: 1 }
      }
    ]);

    return dailyData;
  }

  /**
   * Get monthly consumption summary
   */
  async getMonthlyConsumption(deviceId, year) {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59, 999);

    const monthlyData = await PowerReading.aggregate([
      {
        $match: {
          deviceId: mongoose.Types.ObjectId(deviceId),
          timestamp: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' }
          },
          year: { $first: { $year: '$timestamp' } },
          month: { $first: { $month: '$timestamp' } },
          totalEnergyWh: { $sum: '$energy' },
          totalCost: { $sum: '$cost' },
          avgPower: { $avg: '$power' },
          maxPower: { $max: '$power' },
          readingCount: { $sum: 1 },
          onlineReadings: {
            $sum: { $cond: [{ $eq: ['$status', 'online'] }, 1, 0] }
          },
          offlineReadings: {
            $sum: { $cond: [{ $eq: ['$status', 'offline'] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          _id: 0,
          year: 1,
          month: 1,
          energyKwh: { $divide: ['$totalEnergyWh', 1000] },
          cost: { $round: ['$totalCost', 2] },
          avgPower: { $round: ['$avgPower', 2] },
          maxPower: { $round: ['$maxPower', 2] },
          readingCount: 1,
          onlineReadings: 1,
          offlineReadings: 1
        }
      },
      {
        $sort: { month: 1 }
      }
    ]);

    return monthlyData;
  }

  /**
   * Get yearly consumption summary
   */
  async getYearlyConsumption(deviceId, startYear, endYear) {
    const startDate = new Date(startYear, 0, 1);
    const endDate = new Date(endYear, 11, 31, 23, 59, 59, 999);

    const yearlyData = await PowerReading.aggregate([
      {
        $match: {
          deviceId: mongoose.Types.ObjectId(deviceId),
          timestamp: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: { year: { $year: '$timestamp' } },
          year: { $first: { $year: '$timestamp' } },
          totalEnergyWh: { $sum: '$energy' },
          totalCost: { $sum: '$cost' },
          avgPower: { $avg: '$power' },
          maxPower: { $max: '$power' },
          readingCount: { $sum: 1 },
          onlineReadings: {
            $sum: { $cond: [{ $eq: ['$status', 'online'] }, 1, 0] }
          },
          offlineReadings: {
            $sum: { $cond: [{ $eq: ['$status', 'offline'] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          _id: 0,
          year: 1,
          energyKwh: { $divide: ['$totalEnergyWh', 1000] },
          cost: { $round: ['$totalCost', 2] },
          avgPower: { $round: ['$avgPower', 2] },
          maxPower: { $round: ['$maxPower', 2] },
          readingCount: 1,
          onlineReadings: 1,
          offlineReadings: 1
        }
      },
      {
        $sort: { year: 1 }
      }
    ]);

    return yearlyData;
  }

  /**
   * Get hourly consumption for today
   */
  async getTodayHourly(deviceId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const hourlyData = await PowerReading.aggregate([
      {
        $match: {
          deviceId: mongoose.Types.ObjectId(deviceId),
          timestamp: { $gte: today, $lt: tomorrow }
        }
      },
      {
        $group: {
          _id: { hour: { $hour: '$timestamp' } },
          hour: { $first: { $hour: '$timestamp' } },
          totalEnergyWh: { $sum: '$energy' },
          totalCost: { $sum: '$cost' },
          avgPower: { $avg: '$power' },
          maxPower: { $max: '$power' },
          readingCount: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          hour: 1,
          energyKwh: { $divide: ['$totalEnergyWh', 1000] },
          cost: { $round: ['$totalCost', 2] },
          avgPower: { $round: ['$avgPower', 2] },
          maxPower: { $round: ['$maxPower', 2] },
          readingCount: 1
        }
      },
      {
        $sort: { hour: 1 }
      }
    ]);

    return hourlyData;
  }

  /**
   * Get consumption by classroom
   */
  async getClassroomConsumption(classroom, startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const classroomData = await PowerReading.aggregate([
      {
        $match: {
          classroom,
          timestamp: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: '$deviceId',
          deviceName: { $first: '$deviceName' },
          totalEnergyWh: { $sum: '$energy' },
          totalCost: { $sum: '$cost' },
          avgPower: { $avg: '$power' },
          maxPower: { $max: '$power' },
          readingCount: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          deviceId: '$_id',
          deviceName: 1,
          energyKwh: { $divide: ['$totalEnergyWh', 1000] },
          cost: { $round: ['$totalCost', 2] },
          avgPower: { $round: ['$avgPower', 2] },
          maxPower: { $round: ['$maxPower', 2] },
          readingCount: 1
        }
      },
      {
        $sort: { energyKwh: -1 }
      }
    ]);

    // Calculate totals
    const totals = {
      totalEnergyKwh: 0,
      totalCost: 0,
      deviceCount: classroomData.length,
      devices: classroomData
    };

    classroomData.forEach(device => {
      totals.totalEnergyKwh += device.energyKwh;
      totals.totalCost += device.cost;
    });

    return totals;
  }

  /**
   * Get all devices consumption summary
   */
  async getAllDevicesConsumption(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const devicesData = await PowerReading.aggregate([
      {
        $match: {
          timestamp: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: '$deviceId',
          deviceName: { $first: '$deviceName' },
          classroom: { $first: '$classroom' },
          totalEnergyWh: { $sum: '$energy' },
          totalCost: { $sum: '$cost' },
          avgPower: { $avg: '$power' },
          maxPower: { $max: '$power' },
          readingCount: { $sum: 1 },
          lastReading: { $max: '$timestamp' }
        }
      },
      {
        $project: {
          _id: 0,
          deviceId: '$_id',
          deviceName: 1,
          classroom: 1,
          energyKwh: { $divide: ['$totalEnergyWh', 1000] },
          cost: { $round: ['$totalCost', 2] },
          avgPower: { $round: ['$avgPower', 2] },
          maxPower: { $round: ['$maxPower', 2] },
          readingCount: 1,
          lastReading: 1
        }
      },
      {
        $sort: { energyKwh: -1 }
      }
    ]);

    // Check device status
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    devicesData.forEach(device => {
      device.status = device.lastReading > fiveMinutesAgo ? 'online' : 'offline';
    });

    return devicesData;
  }

  /**
   * Get cost comparison by time period
   */
  async getCostComparison(deviceId, period = 'month') {
    const now = new Date();
    let currentStart, currentEnd, previousStart, previousEnd;

    switch (period) {
      case 'day':
        currentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        currentEnd = new Date(now);
        previousStart = new Date(currentStart);
        previousStart.setDate(previousStart.getDate() - 1);
        previousEnd = new Date(currentStart);
        break;
      case 'week':
        currentStart = new Date(now);
        currentStart.setDate(currentStart.getDate() - now.getDay());
        currentStart.setHours(0, 0, 0, 0);
        currentEnd = new Date(now);
        previousStart = new Date(currentStart);
        previousStart.setDate(previousStart.getDate() - 7);
        previousEnd = new Date(currentStart);
        break;
      case 'month':
      default:
        currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
        currentEnd = new Date(now);
        previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        previousEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        break;
    }

    const [currentPeriod, previousPeriod] = await Promise.all([
      PowerReading.getTotalConsumption(deviceId, currentStart, currentEnd),
      PowerReading.getTotalConsumption(deviceId, previousStart, previousEnd)
    ]);

    const difference = currentPeriod.totalCost - previousPeriod.totalCost;
    const percentageChange = previousPeriod.totalCost > 0 
      ? ((difference / previousPeriod.totalCost) * 100).toFixed(2)
      : 0;

    return {
      current: currentPeriod,
      previous: previousPeriod,
      difference: difference.toFixed(2),
      percentageChange: parseFloat(percentageChange),
      period
    };
  }

  /**
   * Get peak usage hours
   */
  async getPeakUsageHours(deviceId, days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const peakHours = await PowerReading.aggregate([
      {
        $match: {
          deviceId: mongoose.Types.ObjectId(deviceId),
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: { hour: { $hour: '$timestamp' } },
          hour: { $first: { $hour: '$timestamp' } },
          avgPower: { $avg: '$power' },
          maxPower: { $max: '$power' },
          totalEnergy: { $sum: '$energy' }
        }
      },
      {
        $sort: { avgPower: -1 }
      },
      {
        $limit: 5
      }
    ]);

    return peakHours;
  }
}

module.exports = new PowerAnalyticsService();
