const DailyConsumption = require('../models/DailyConsumption');
const MonthlyConsumption = require('../models/MonthlyConsumption');
const Device = require('../models/Device');
const { calculatePreciseEnergyConsumption } = require('../metricsService');

/**
 * Consumption Aggregation Service
 * 
 * This service aggregates power consumption data from ActivityLog
 * and stores it in DailyConsumption and MonthlyConsumption tables.
 * 
 * This ensures historical data is always available, even when devices are offline.
 */
class ConsumptionAggregationService {
  constructor() {
    this.isRunning = false;
    this.aggregationInterval = null;
    this.intervalMinutes = 15; // Aggregate every 15 minutes
  }

  /**
   * Start the aggregation service
   */
  start() {
    if (this.isRunning) {
      console.log('[CONSUMPTION-AGG] Service already running');
      return;
    }

    this.isRunning = true;
    console.log(`[CONSUMPTION-AGG] Starting consumption aggregation service (interval: ${this.intervalMinutes} minutes)`);

    // Run initial aggregation
    this.aggregateConsumption();

    // Schedule recurring aggregations
    this.aggregationInterval = setInterval(() => {
      this.aggregateConsumption();
    }, this.intervalMinutes * 60 * 1000);

    console.log('[CONSUMPTION-AGG] Service started');
  }

  /**
   * Stop the aggregation service
   */
  stop() {
    if (this.aggregationInterval) {
      clearInterval(this.aggregationInterval);
      this.aggregationInterval = null;
    }
    this.isRunning = false;
    console.log('[CONSUMPTION-AGG] Service stopped');
  }

  /**
   * Main aggregation function - aggregates today's data and current month
   */
  async aggregateConsumption() {
    try {
      console.log('[CONSUMPTION-AGG] Starting aggregation cycle...');

      const now = new Date();
      
      // Aggregate today's data
      await this.aggregateDailyData(now);
      
      // Aggregate current month
      await this.aggregateMonthlyData(now.getFullYear(), now.getMonth() + 1);
      
      // Also aggregate yesterday if it's early in the day (to finalize yesterday's data)
      const hourOfDay = now.getHours();
      if (hourOfDay < 2) {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        await this.aggregateDailyData(yesterday, true); // Mark as final
      }

      console.log('[CONSUMPTION-AGG] Aggregation cycle completed');
    } catch (error) {
      console.error('[CONSUMPTION-AGG] Error during aggregation:', error);
    }
  }

  /**
   * Aggregate daily consumption data for a specific date
   */
  async aggregateDailyData(targetDate, markAsFinal = false) {
    try {
      const dateStart = new Date(targetDate);
      dateStart.setHours(0, 0, 0, 0);
      const dateEnd = new Date(targetDate);
      dateEnd.setHours(23, 59, 59, 999);

      console.log(`[CONSUMPTION-AGG] Aggregating daily data for ${dateStart.toDateString()}`);

      // Get all devices
      const devices = await Device.find({}, {
        name: 1,
        classroom: 1,
        switches: 1,
        status: 1,
        _id: 1
      }).lean();

      console.log(`[CONSUMPTION-AGG] Processing ${devices.length} devices`);

      // Get current electricity rate
      const fs = require('fs').promises;
      const path = require('path');
      let electricityRate = 7.5; // Default
      try {
        const settingsPath = path.join(__dirname, '../data/powerSettings.json');
        const settingsData = await fs.readFile(settingsPath, 'utf8');
        const settings = JSON.parse(settingsData);
        electricityRate = settings.electricityPrice || 7.5;
      } catch (error) {
        console.log('[CONSUMPTION-AGG] Using default electricity rate');
      }

      let aggregatedCount = 0;

      // Process each device
      for (const device of devices) {
        try {
          // Calculate precise consumption for this day
          const energyKwh = await calculatePreciseEnergyConsumption(
            device._id,
            dateStart,
            dateEnd
          );

          // Skip if no consumption
          if (energyKwh === 0) {
            continue;
          }

          // Calculate cost
          const costINR = energyKwh * electricityRate;

          // Calculate runtime from ActivityLog
          const ActivityLog = require('../models/ActivityLog');
          const activities = await ActivityLog.find({
            deviceId: device._id,
            timestamp: { $gte: dateStart, $lte: dateEnd },
            action: { $in: ['on', 'off', 'manual_on', 'manual_off', 'switch_on', 'switch_off'] }
          }).sort({ timestamp: 1 }).lean();

          let runtimeHours = 0;
          let deviceOnlineHours = 0;
          let onTime = null;

          // Calculate runtime
          for (const activity of activities) {
            if (['on', 'manual_on', 'switch_on'].includes(activity.action)) {
              onTime = activity.timestamp;
            } else if (['off', 'manual_off', 'switch_off'].includes(activity.action) && onTime) {
              runtimeHours += (activity.timestamp - onTime) / (1000 * 60 * 60);
              onTime = null;
            }
          }

          // If still on at end of day
          if (onTime) {
            runtimeHours += (dateEnd - onTime) / (1000 * 60 * 60);
          }

          // Calculate device online hours
          const onlineActivities = await ActivityLog.find({
            deviceId: device._id,
            timestamp: { $gte: dateStart, $lte: dateEnd },
            action: { $in: ['device_online', 'device_offline', 'device_connected', 'device_disconnected'] }
          }).sort({ timestamp: 1 }).lean();

          let deviceOnlineTime = null;
          for (const activity of onlineActivities) {
            if (['device_online', 'device_connected'].includes(activity.action)) {
              deviceOnlineTime = activity.timestamp;
            } else if (['device_offline', 'device_disconnected'].includes(activity.action) && deviceOnlineTime) {
              deviceOnlineHours += (activity.timestamp - deviceOnlineTime) / (1000 * 60 * 60);
              deviceOnlineTime = null;
            }
          }

          if (deviceOnlineTime) {
            deviceOnlineHours += (dateEnd - deviceOnlineTime) / (1000 * 60 * 60);
          }

          // Calculate average and peak power
          const avgPowerWatts = runtimeHours > 0 ? (energyKwh * 1000) / runtimeHours : 0;

          // Store aggregated data
          await DailyConsumption.upsertDailyConsumption({
            deviceId: device._id,
            deviceName: device.name,
            classroom: device.classroom || 'unassigned',
            date: dateStart,
            energyConsumptionKwh: parseFloat(energyKwh.toFixed(6)),
            costINR: parseFloat(costINR.toFixed(2)),
            electricityRateINR: electricityRate,
            runtimeHours: parseFloat(runtimeHours.toFixed(2)),
            avgPowerWatts: parseFloat(avgPowerWatts.toFixed(2)),
            peakPowerWatts: 0, // TODO: Calculate from activity log
            deviceOnlineHours: parseFloat(deviceOnlineHours.toFixed(2)),
            lastUpdated: new Date(),
            isFinal: markAsFinal
          });

          aggregatedCount++;
        } catch (deviceError) {
          console.error(`[CONSUMPTION-AGG] Error processing device ${device.name}:`, deviceError.message);
        }
      }

      console.log(`[CONSUMPTION-AGG] Aggregated ${aggregatedCount} device records for ${dateStart.toDateString()}`);
    } catch (error) {
      console.error('[CONSUMPTION-AGG] Error aggregating daily data:', error);
    }
  }

  /**
   * Aggregate monthly consumption data
   */
  async aggregateMonthlyData(year, month) {
    try {
      console.log(`[CONSUMPTION-AGG] Aggregating monthly data for ${year}-${month}`);

      const monthStart = new Date(year, month - 1, 1, 0, 0, 0);
      const monthEnd = new Date(year, month, 0, 23, 59, 59);

      // Get all daily records for this month
      const dailyRecords = await DailyConsumption.find({
        date: { $gte: monthStart, $lte: monthEnd }
      }).lean();

      // Group by device
      const deviceGroups = {};
      for (const record of dailyRecords) {
        const deviceId = record.deviceId.toString();
        if (!deviceGroups[deviceId]) {
          deviceGroups[deviceId] = {
            deviceId: record.deviceId,
            deviceName: record.deviceName,
            classroom: record.classroom,
            records: []
          };
        }
        deviceGroups[deviceId].records.push(record);
      }

      // Aggregate each device's monthly data
      for (const deviceId in deviceGroups) {
        const group = deviceGroups[deviceId];
        const records = group.records;

        if (records.length === 0) continue;

        const totalEnergyKwh = records.reduce((sum, r) => sum + r.energyConsumptionKwh, 0);
        const totalCostINR = records.reduce((sum, r) => sum + r.costINR, 0);
        const totalRuntimeHours = records.reduce((sum, r) => sum + r.runtimeHours, 0);
        const totalOnlineHours = records.reduce((sum, r) => sum + r.deviceOnlineHours, 0);
        const avgPowerWatts = totalRuntimeHours > 0 ? (totalEnergyKwh * 1000) / totalRuntimeHours : 0;

        // Get current electricity rate (average from records)
        const electricityRate = records.reduce((sum, r) => sum + r.electricityRateINR, 0) / records.length;

        // Create daily breakdown
        const dailyBreakdown = records.map(r => ({
          day: r.date.getDate(),
          energyKwh: r.energyConsumptionKwh,
          costINR: r.costINR,
          runtimeHours: r.runtimeHours
        }));

        await MonthlyConsumption.upsertMonthlyConsumption({
          deviceId: group.deviceId,
          deviceName: group.deviceName,
          classroom: group.classroom,
          year: year,
          month: month,
          energyConsumptionKwh: parseFloat(totalEnergyKwh.toFixed(6)),
          costINR: parseFloat(totalCostINR.toFixed(2)),
          electricityRateINR: parseFloat(electricityRate.toFixed(2)),
          runtimeHours: parseFloat(totalRuntimeHours.toFixed(2)),
          avgPowerWatts: parseFloat(avgPowerWatts.toFixed(2)),
          peakPowerWatts: Math.max(...records.map(r => r.avgPowerWatts)),
          dailyBreakdown: dailyBreakdown,
          deviceOnlineHours: parseFloat(totalOnlineHours.toFixed(2)),
          lastUpdated: new Date(),
          isFinal: false
        });
      }

      console.log(`[CONSUMPTION-AGG] Aggregated monthly data for ${Object.keys(deviceGroups).length} devices`);
    } catch (error) {
      console.error('[CONSUMPTION-AGG] Error aggregating monthly data:', error);
    }
  }

  /**
   * Manually trigger aggregation for a specific date
   */
  async aggregateForDate(date) {
    console.log(`[CONSUMPTION-AGG] Manual aggregation triggered for ${date.toDateString()}`);
    await this.aggregateDailyData(date);
    await this.aggregateMonthlyData(date.getFullYear(), date.getMonth() + 1);
  }

  /**
   * Backfill historical data
   */
  async backfillHistoricalData(startDate, endDate) {
    console.log(`[CONSUMPTION-AGG] Backfilling historical data from ${startDate.toDateString()} to ${endDate.toDateString()}`);

    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      await this.aggregateDailyData(currentDate, true);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log('[CONSUMPTION-AGG] Historical backfill completed');
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      intervalMinutes: this.intervalMinutes,
      nextAggregation: this.isRunning ? new Date(Date.now() + this.intervalMinutes * 60 * 1000) : null
    };
  }
}

module.exports = new ConsumptionAggregationService();
