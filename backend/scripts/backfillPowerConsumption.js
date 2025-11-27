/**
 * Migration Script: Backfill powerConsumption for existing ActivityLog entries
 * 
 * This script updates existing activity logs that don't have powerConsumption values
 * by calculating them based on the switch type and historical power settings.
 * 
 * Usage: node scripts/backfillPowerConsumption.js
 */

const mongoose = require('mongoose');
const ActivityLog = require('../models/ActivityLog');
const Device = require('../models/Device');
const { getBasePowerConsumption } = require('../metricsService');
require('dotenv').config();

const DB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/autovolt';

async function backfillPowerConsumption() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(DB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all activity logs that are switch actions but don't have powerConsumption
    const logsToUpdate = await ActivityLog.find({
      action: { 
        $in: ['on', 'off', 'manual_on', 'manual_off', 'switch_on', 'switch_off'] 
      },
      $or: [
        { powerConsumption: { $exists: false } },
        { powerConsumption: null },
        { powerConsumption: 0 }
      ]
    }).lean();

    console.log(`\n📊 Found ${logsToUpdate.length} activity logs to backfill`);

    if (logsToUpdate.length === 0) {
      console.log('✨ No logs need backfilling. All logs are up to date!');
      return;
    }

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    // Get all devices to create a lookup map
    const devices = await Device.find({}).lean();
    const deviceMap = new Map();
    const switchTypeMap = new Map(); // switchId -> type

    devices.forEach(device => {
      deviceMap.set(device._id.toString(), device);
      if (device.switches && Array.isArray(device.switches)) {
        device.switches.forEach(sw => {
          if (sw._id) {
            switchTypeMap.set(sw._id.toString(), {
              name: sw.name,
              type: sw.type || 'relay'
            });
          }
        });
      }
    });

    console.log(`\n📋 Processing ${logsToUpdate.length} logs...`);
    
    for (const log of logsToUpdate) {
      try {
        let powerConsumption = 0;
        
        // Try to get switch info from the log
        const switchId = log.switchId;
        const switchName = log.switchName;
        const deviceId = log.deviceId?.toString();

        // Method 1: Use switchId to look up type
        if (switchId && switchTypeMap.has(switchId.toString())) {
          const switchInfo = switchTypeMap.get(switchId.toString());
          powerConsumption = getBasePowerConsumption(
            switchInfo.name,
            switchInfo.type
          );
        }
        // Method 2: Use device and switchName
        else if (deviceId && deviceMap.has(deviceId) && switchName) {
          const device = deviceMap.get(deviceId);
          const matchingSwitch = device.switches?.find(sw => sw.name === switchName);
          if (matchingSwitch) {
            powerConsumption = getBasePowerConsumption(
              matchingSwitch.name,
              matchingSwitch.type || 'relay'
            );
          } else {
            // Fallback: guess from switch name
            powerConsumption = getBasePowerConsumption(switchName, 'unknown');
          }
        }
        // Method 3: Fallback to switchName only
        else if (switchName) {
          powerConsumption = getBasePowerConsumption(switchName, 'unknown');
        }

        if (powerConsumption > 0) {
          await ActivityLog.updateOne(
            { _id: log._id },
            { $set: { powerConsumption } }
          );
          updated++;
          
          if (updated % 100 === 0) {
            console.log(`  ⏳ Updated ${updated}/${logsToUpdate.length}...`);
          }
        } else {
          skipped++;
        }
      } catch (err) {
        console.error(`  ❌ Error updating log ${log._id}:`, err.message);
        errors++;
      }
    }

    console.log('\n✅ Backfill complete!');
    console.log(`   📈 Updated: ${updated} logs`);
    console.log(`   ⏭️  Skipped: ${skipped} logs (no power data available)`);
    if (errors > 0) {
      console.log(`   ⚠️  Errors: ${errors} logs`);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the migration
if (require.main === module) {
  backfillPowerConsumption()
    .then(() => {
      console.log('\n🎉 Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = backfillPowerConsumption;
