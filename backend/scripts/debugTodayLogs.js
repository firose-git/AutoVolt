const mongoose = require('mongoose');
const ActivityLog = require('../models/ActivityLog');
const Device = require('../models/Device');
require('dotenv').config();

const DB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/autovolt';

async function debugTodayLogs() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(DB_URI);
    console.log('✅ Connected\n');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const now = new Date();

    console.log('📅 Today:', today.toISOString());
    console.log('🕐 Now:', now.toISOString(), '\n');

    // Check total devices
    const devices = await Device.find({}).lean();
    const onlineDevices = devices.filter(d => d.status === 'online');
    console.log(`📱 Total devices: ${devices.length}`);
    console.log(`✅ Online devices: ${onlineDevices.length}`);
    console.log(`❌ Offline devices: ${devices.length - onlineDevices.length}\n`);

    // Check today's activity logs
    const todayLogs = await ActivityLog.find({
      timestamp: { $gte: today, $lte: now },
      action: { $in: ['on', 'off', 'manual_on', 'manual_off', 'switch_on', 'switch_off'] }
    }).sort({ timestamp: -1 }).lean();

    console.log(`📊 Today's switch events: ${todayLogs.length}\n`);

    if (todayLogs.length === 0) {
      console.log('⚠️  NO ACTIVITY LOGS TODAY!');
      console.log('This is why consumption shows 0.\n');
      
      // Check if there are any logs at all
      const anyLogs = await ActivityLog.find({
        action: { $in: ['on', 'off', 'manual_on', 'manual_off', 'switch_on', 'switch_off'] }
      }).sort({ timestamp: -1 }).limit(5).lean();
      
      if (anyLogs.length > 0) {
        console.log('📝 Most recent switch events:');
        anyLogs.forEach(log => {
          console.log(`  - ${log.timestamp.toISOString()} | ${log.deviceName} | ${log.switchName} | ${log.action} | Power: ${log.powerConsumption || 'NOT SET'}W`);
        });
      } else {
        console.log('❌ No switch events in database at all!');
      }
    } else {
      console.log('📝 Recent switch events today:');
      todayLogs.slice(0, 10).forEach(log => {
        console.log(`  - ${log.timestamp.toISOString()} | ${log.deviceName} | ${log.switchName} | ${log.action} | Power: ${log.powerConsumption || 'NOT SET'}W`);
      });

      // Check for missing powerConsumption
      const logsWithoutPower = todayLogs.filter(log => !log.powerConsumption || log.powerConsumption === 0);
      if (logsWithoutPower.length > 0) {
        console.log(`\n⚠️  ${logsWithoutPower.length} logs are missing powerConsumption!`);
        console.log('Run: node scripts/backfillPowerConsumption.js');
      }

      // Calculate expected consumption
      console.log('\n🔍 Analyzing consumption...');
      let totalKwh = 0;
      const deviceRuntimes = new Map();

      for (const device of devices) {
        const deviceLogs = todayLogs.filter(log => log.deviceId.toString() === device._id.toString());
        if (deviceLogs.length === 0) continue;

        let onTime = null;
        let deviceRuntime = 0;
        let deviceConsumption = 0;

        for (const log of deviceLogs.sort((a, b) => a.timestamp - b.timestamp)) {
          if (['on', 'switch_on', 'manual_on'].includes(log.action)) {
            onTime = log.timestamp;
          } else if (['off', 'switch_off', 'manual_off'].includes(log.action) && onTime) {
            const hours = (log.timestamp - onTime) / (1000 * 60 * 60);
            deviceRuntime += hours;
            const power = log.powerConsumption || 0;
            deviceConsumption += (power * hours) / 1000; // kWh
            onTime = null;
          }
        }

        // Still on now?
        if (onTime) {
          const hours = (now - onTime) / (1000 * 60 * 60);
          deviceRuntime += hours;
          // Get current power (approximate)
          const lastOnLog = deviceLogs.find(l => ['on', 'switch_on', 'manual_on'].includes(l.action));
          const power = lastOnLog?.powerConsumption || 0;
          deviceConsumption += (power * hours) / 1000;
        }

        if (deviceConsumption > 0) {
          console.log(`  ${device.name}: ${deviceConsumption.toFixed(3)} kWh (${deviceRuntime.toFixed(2)}h runtime)`);
          totalKwh += deviceConsumption;
        }
      }

      console.log(`\n📊 Expected Total: ${totalKwh.toFixed(3)} kWh`);
      console.log(`💰 Expected Cost: ₹${(totalKwh * 7.5).toFixed(2)}`);
    }

    // Check current device states
    console.log('\n🔦 Current device states:');
    onlineDevices.forEach(device => {
      const onSwitches = device.switches.filter(sw => sw.state === true);
      if (onSwitches.length > 0) {
        console.log(`  ${device.name}: ${onSwitches.length} switches ON`);
        onSwitches.forEach(sw => {
          console.log(`    - ${sw.name} (${sw.type})`);
        });
      }
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected');
  }
}

debugTodayLogs();
