const mongoose = require('mongoose');
const PowerReading = require('./models/PowerReading');

mongoose.connect('mongodb://localhost:27017/autovolt', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function checkTodayData() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const readings = await PowerReading.find({
      timestamp: { $gte: today }
    }).sort({ timestamp: -1 }).limit(20);
    
    console.log(`\n📊 Total readings today: ${readings.length}\n`);
    
    if (readings.length === 0) {
      console.log('❌ NO READINGS TODAY - This explains the 1.03 kWh reading!');
      console.log('The dashboard is showing OLD data from previous days.\n');
      
      // Check last reading
      const lastReading = await PowerReading.findOne().sort({ timestamp: -1 });
      if (lastReading) {
        console.log('📍 Last reading in database:');
        console.log(`   Device: ${lastReading.deviceName}`);
        console.log(`   Time: ${lastReading.timestamp}`);
        console.log(`   Power: ${lastReading.power}W`);
        console.log(`   Energy: ${lastReading.energy} Wh`);
        console.log(`   Status: ${lastReading.status}\n`);
      }
    } else {
      console.log('Recent readings today:');
      console.log('='.repeat(80));
      
      let totalEnergy = 0;
      const deviceEnergy = {};
      
      readings.forEach((r, i) => {
        console.log(`${i+1}. [${r.timestamp.toLocaleTimeString()}] ${r.deviceName}`);
        console.log(`   Power: ${r.power}W | Energy: ${r.energy}Wh | Status: ${r.status}`);
        
        totalEnergy += r.energy || 0;
        deviceEnergy[r.deviceName] = (deviceEnergy[r.deviceName] || 0) + (r.energy || 0);
      });
      
      console.log('\n' + '='.repeat(80));
      console.log(`\n📈 Total energy from recent readings: ${(totalEnergy / 1000).toFixed(3)} kWh\n`);
      
      console.log('Per device (recent readings only):');
      Object.entries(deviceEnergy).forEach(([device, energy]) => {
        console.log(`   ${device}: ${(energy / 1000).toFixed(3)} kWh`);
      });
      
      // Check aggregated daily data
      console.log('\n\n🔍 Checking aggregated daily consumption...\n');
      
      const todayString = today.toISOString().split('T')[0];
      const aggregated = await PowerReading.aggregate([
        {
          $match: {
            timestamp: { $gte: today }
          }
        },
        {
          $group: {
            _id: '$deviceId',
            deviceName: { $first: '$deviceName' },
            totalEnergy: { $sum: '$energy' },
            count: { $sum: 1 },
            avgPower: { $avg: '$power' }
          }
        }
      ]);
      
      let grandTotal = 0;
      aggregated.forEach(d => {
        const energyKwh = d.totalEnergy / 1000;
        grandTotal += energyKwh;
        console.log(`   ${d.deviceName}: ${energyKwh.toFixed(3)} kWh (${d.count} readings, avg ${d.avgPower.toFixed(1)}W)`);
      });
      
      console.log(`\n📊 TOTAL TODAY (all devices): ${grandTotal.toFixed(3)} kWh`);
      
      if (grandTotal < 2) {
        console.log('\n⚠️  WARNING: Very low consumption detected!');
        console.log('   Possible reasons:');
        console.log('   - Devices just started sending data today');
        console.log('   - Not many readings collected yet');
        console.log('   - Devices are idle/standby mode');
        console.log('   - Clock/timezone issue causing date mismatch\n');
      }
    }
    
    // Check date/time configuration
    console.log('\n🕐 System time check:');
    console.log(`   Server time: ${new Date().toLocaleString()}`);
    console.log(`   Today start: ${today.toLocaleString()}`);
    console.log(`   Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}\n`);
    
    mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    mongoose.connection.close();
    process.exit(1);
  }
}

checkTodayData();
