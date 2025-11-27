const mongoose = require('mongoose');
const Device = require('./models/Device');

async function updateSwitchesForPir() {
  try {
    await mongoose.connect('mongodb://localhost:27017/autovolt', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    const device = await Device.findOne({ macAddress: '84:1f:e8:68:a2:8c' });

    if (!device) {
      console.log('Device not found');
      return;
    }

    console.log('Before update - Switch PIR settings:');
    device.switches.forEach((sw, idx) => {
      console.log(`Switch ${idx + 1}: ${sw.name}, usePir: ${sw.usePir}`);
    });

    // Update all switches to respond to PIR
    device.switches.forEach(sw => {
      sw.usePir = true;
    });

    await device.save();

    console.log('\nAfter update - Switch PIR settings:');
    device.switches.forEach((sw, idx) => {
      console.log(`Switch ${idx + 1}: ${sw.name}, usePir: ${sw.usePir}`);
    });

    console.log('\nDevice updated. The ESP32 should receive new config and start responding to motion.');

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    await mongoose.disconnect();
  }
}

updateSwitchesForPir();