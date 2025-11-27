const mongoose = require('mongoose');
const Device = require('../models/Device');
const EnergyLog = require('../models/EnergyLog');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/autovolt', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

/**
 * Generate realistic energy usage data for AI/ML forecasting
 * This creates 14 days of hourly energy consumption data with patterns:
 * - Higher usage during class hours (9 AM - 5 PM)
 * - Lower usage during early morning/late evening
 * - Weekend vs weekday patterns
 * - Random variations for realistic data
 */
async function generateEnergyData() {
  try {
    console.log('🔌 Generating sample energy usage data for AI/ML...');

    // Get all devices
    const devices = await Device.find({ status: 'online' }).limit(5);

    if (devices.length === 0) {
      console.log('❌ No online devices found. Please add devices first.');
      process.exit(1);
    }

    console.log(`📊 Found ${devices.length} devices. Generating data...`);

    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    for (const device of devices) {
      console.log(`\n📍 Generating data for: ${device.name}`);

      const energyLogs = [];
      let currentTime = new Date(fourteenDaysAgo);

      while (currentTime < now) {
        const hour = currentTime.getHours();
        const dayOfWeek = currentTime.getDay(); // 0 = Sunday, 6 = Saturday
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        // Base consumption patterns
        let baseConsumption = 0;

        if (isWeekend) {
          // Lower consumption on weekends
          if (hour >= 9 && hour <= 17) {
            baseConsumption = 15 + Math.random() * 10; // 15-25 kWh
          } else if (hour >= 6 && hour < 9) {
            baseConsumption = 5 + Math.random() * 5; // 5-10 kWh
          } else if (hour > 17 && hour <= 22) {
            baseConsumption = 8 + Math.random() * 7; // 8-15 kWh
          } else {
            baseConsumption = 2 + Math.random() * 3; // 2-5 kWh (night)
          }
        } else {
          // Weekday patterns - peak during class hours
          if (hour >= 9 && hour <= 17) {
            // Peak class hours
            baseConsumption = 35 + Math.random() * 25; // 35-60 kWh
          } else if (hour >= 6 && hour < 9) {
            // Morning ramp-up
            baseConsumption = 15 + Math.random() * 10; // 15-25 kWh
          } else if (hour > 17 && hour <= 22) {
            // Evening wind-down
            baseConsumption = 20 + Math.random() * 15; // 20-35 kWh
          } else {
            // Night time - minimal usage
            baseConsumption = 3 + Math.random() * 5; // 3-8 kWh
          }
        }

        // Count active switches
        const activeSwitches = device.switches.filter(s => s.state).length;
        const totalSwitches = device.switches.length;

        // Adjust consumption based on active switches
        const switchMultiplier = totalSwitches > 0 ? (activeSwitches / totalSwitches) : 0.5;
        const consumption = baseConsumption * (0.5 + switchMultiplier * 0.5);

        // Calculate cost (₹10 per kWh as example)
        const cost = consumption * 10;

        energyLogs.push({
          deviceId: device._id,
          deviceName: device.name,
          timestamp: new Date(currentTime),
          consumption: parseFloat(consumption.toFixed(2)),
          cost: parseFloat(cost.toFixed(2)),
          activeSwitches: activeSwitches,
          totalSwitches: totalSwitches,
          classroom: device.classroom,
          location: device.location,
          metadata: {
            hourOfDay: hour,
            dayOfWeek: dayOfWeek,
            isWeekend: isWeekend,
            generated: true
          }
        });

        // Move to next hour
        currentTime = new Date(currentTime.getTime() + 60 * 60 * 1000);
      }

      // Bulk insert for performance
      if (energyLogs.length > 0) {
        await EnergyLog.insertMany(energyLogs, { ordered: false });
        console.log(`   ✅ Generated ${energyLogs.length} energy log entries`);
      }
    }

    console.log('\n✨ Sample data generation complete!');
    console.log('📈 You can now use the AI/ML forecasting features.');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error generating sample data:', error);
    process.exit(1);
  }
}

// Run the script
generateEnergyData();
