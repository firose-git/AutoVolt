const Device = require('../models/Device');
const telegramService = require('./telegramService');

class EveningLightsMonitor {
  constructor() {
    this.monitoringInterval = null;
    this.isRunning = false;
    this.checkTime = '10:00'; // 10 AM
    this.alertSentToday = false;
  }

  // Start the evening lights monitoring service
  start() {
    if (this.isRunning) {
      console.log('[EVENING-LIGHTS] Service already running');
      return;
    }

    this.isRunning = true;
    console.log(`[EVENING-LIGHTS] Starting evening lights monitoring (checks at ${this.checkTime} daily)`);

    // Schedule daily check at 10 AM
    this.scheduleDailyCheck();

    console.log('[EVENING-LIGHTS] Evening lights monitoring service started');
  }

  // Stop the monitoring service
  stop() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isRunning = false;
    console.log('[EVENING-LIGHTS] Evening lights monitoring service stopped');
  }

  // Schedule daily check at 10 AM
  scheduleDailyCheck() {
    const now = new Date();
    const [hour, minute] = this.checkTime.split(':').map(Number);

    // Calculate time until next 10 AM
    const nextCheck = new Date();
    nextCheck.setHours(hour, minute, 0, 0);

    // If it's already past 10 AM today, schedule for tomorrow
    if (now >= nextCheck) {
      nextCheck.setDate(nextCheck.getDate() + 1);
    }

    const timeUntilNextCheck = nextCheck - now;

    console.log(`[EVENING-LIGHTS] Next check scheduled for: ${nextCheck.toLocaleString()}`);
    console.log(`[EVENING-LIGHTS] Time until next check: ${Math.floor(timeUntilNextCheck / 1000 / 60)} minutes`);

    // Schedule the check
    setTimeout(() => {
      this.performEveningLightsCheck();

      // Then schedule daily checks every 24 hours
      this.monitoringInterval = setInterval(() => {
        this.performEveningLightsCheck();
      }, 24 * 60 * 60 * 1000); // 24 hours
    }, timeUntilNextCheck);
  }

  // Perform the evening lights check at 10 AM
  async performEveningLightsCheck() {
    try {
      console.log(`[EVENING-LIGHTS] Performing evening lights check at ${new Date().toLocaleString()}`);

      // Reset daily flag
      this.alertSentToday = false;

      // Find all devices with light switches that are still on
      const devices = await Device.find({
        'switches.type': 'light',
        'switches.state': true
      }).populate('switches');

      console.log(`[EVENING-LIGHTS] Found ${devices.length} devices with active lights`);

      if (devices.length === 0) {
        console.log('[EVENING-LIGHTS] ✅ All lights are off - no action needed');
        return;
      }

      // Count lights by classroom and device
      const lightsByClassroom = {};
      let totalLightsOn = 0;

      devices.forEach(device => {
        const activeLights = device.switches.filter(sw => sw.type === 'light' && sw.state);
        if (activeLights.length > 0) {
          const classroom = device.classroom || 'Unassigned';
          if (!lightsByClassroom[classroom]) {
            lightsByClassroom[classroom] = [];
          }

          lightsByClassroom[classroom].push({
            deviceName: device.name,
            location: device.location,
            lightsOn: activeLights.map(light => light.name),
            count: activeLights.length
          });

          totalLightsOn += activeLights.length;
        }
      });

      console.log(`[EVENING-LIGHTS] Total lights still on after 10 AM: ${totalLightsOn}`);

      // Send security alert if lights are still on
      if (totalLightsOn > 0) {
        await this.sendSecurityAlert(totalLightsOn, lightsByClassroom);
      }

      // Log the results
      this.logEveningLightsCheck(totalLightsOn, lightsByClassroom);

    } catch (error) {
      console.error('[EVENING-LIGHTS] Error performing evening lights check:', error);
    }
  }

  // Send security alert about lights still on
  async sendSecurityAlert(totalLightsOn, lightsByClassroom) {
    try {
      console.log(`[EVENING-LIGHTS] Sending security alert for ${totalLightsOn} lights still on`);

      // Create detailed message
      let message = `🚨 *Evening Lights Alert*\n\n`;
      message += `⚠️ ${totalLightsOn} light(s) are still ON after 10:00 AM\n\n`;

      // Add details by classroom
      Object.keys(lightsByClassroom).forEach(classroom => {
        const devices = lightsByClassroom[classroom];
        message += `*${classroom}:*\n`;

        devices.forEach(device => {
          message += `  • ${device.deviceName}: ${device.lightsOn.join(', ')}\n`;
        });
        message += `\n`;
      });

      message += `*Time:* ${new Date().toLocaleString()}\n\n`;
      message += `Please investigate and turn off unnecessary lights to save energy.`;

      // Send alert to security personnel
      const alertData = {
        alertname: 'Evening Lights Security Alert',
        summary: `${totalLightsOn} lights still on after 10 AM`,
        description: message,
        severity: 'warning',
        instance: 'evening_lights_monitor',
        value: totalLightsOn
      };

      const results = await telegramService.sendAlert('security_alerts', alertData);

      const successCount = results.filter(r => r.success).length;
      console.log(`[EVENING-LIGHTS] Alert sent to ${successCount}/${results.length} security personnel`);

      // Mark that alert was sent today
      this.alertSentToday = true;

      return results;

    } catch (error) {
      console.error('[EVENING-LIGHTS] Error sending security alert:', error);
      return [];
    }
  }

  // Log the evening lights check results
  logEveningLightsCheck(totalLightsOn, lightsByClassroom) {
    const logEntry = {
      timestamp: new Date(),
      totalLightsOn: totalLightsOn,
      lightsByClassroom: lightsByClassroom,
      alertSent: this.alertSentToday,
      checkTime: this.checkTime
    };

    console.log('[EVENING-LIGHTS] Check completed:', {
      timestamp: logEntry.timestamp.toISOString(),
      totalLightsOn: logEntry.totalLightsOn,
      classrooms: Object.keys(logEntry.lightsByClassroom).length,
      alertSent: logEntry.alertSent
    });
  }

  // Manual trigger for testing
  async triggerManualCheck() {
    console.log('[EVENING-LIGHTS] Manual check triggered');
    await this.performEveningLightsCheck();
  }

  // Get current status
  getStatus() {
    return {
      isRunning: this.isRunning,
      checkTime: this.checkTime,
      alertSentToday: this.alertSentToday,
      nextCheck: this.calculateNextCheckTime()
    };
  }

  // Calculate next check time
  calculateNextCheckTime() {
    if (!this.isRunning) return null;

    const now = new Date();
    const [hour, minute] = this.checkTime.split(':').map(Number);
    const nextCheck = new Date();

    nextCheck.setHours(hour, minute, 0, 0);

    // If it's already past 10 AM today, schedule for tomorrow
    if (now >= nextCheck) {
      nextCheck.setDate(nextCheck.getDate() + 1);
    }

    return nextCheck;
  }

  // Update check time (for configuration)
  setCheckTime(newTime) {
    if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(newTime)) {
      throw new Error('Time must be in HH:MM format (24-hour)');
    }

    console.log(`[EVENING-LIGHTS] Changing check time from ${this.checkTime} to ${newTime}`);
    this.checkTime = newTime;

    // Restart scheduling with new time
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.isRunning) {
      this.scheduleDailyCheck();
    }
  }
}

module.exports = new EveningLightsMonitor();