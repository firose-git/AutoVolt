const mongoose = require('mongoose');
require('dotenv').config();

async function addMissingSwitches() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/iot_classroom');
    
    const Device = require('./models/Device');
    const device = await Device.findById('68da956dd03a3ce598867653');
    
    if (!device) {
      console.log('Device not found');
      return;
    }
    
    console.log('Current switches:', device.switches.length);
    
    // Switches to add based on ESP32 state
    const switchesToAdd = [
      { name: 'Switch18', gpio: 18, state: false, type: 'relay' },
      { name: 'Switch19', gpio: 19, state: false, type: 'relay' },
      { name: 'Switch21', gpio: 21, state: false, type: 'relay' },
      { name: 'Switch22', gpio: 22, state: false, type: 'relay' }
    ];
    
    // Check which switches are missing
    const existingGpios = device.switches.map(s => s.gpio || s.relayGpio);
    const missingSwitches = switchesToAdd.filter(s => !existingGpios.includes(s.gpio));
    
    if (missingSwitches.length === 0) {
      console.log('All switches already exist');
      return;
    }
    
    console.log('Adding switches:', missingSwitches.map(s => `${s.name} (GPIO ${s.gpio})`));
    
    // Add missing switches
    for (const switchData of missingSwitches) {
      device.switches.push({
        name: switchData.name,
        gpio: switchData.gpio,
        type: switchData.type,
        state: switchData.state,
        manualOverride: false,
        lastStateChange: new Date()
      });
    }
    
    await device.save();
    console.log(`Added ${missingSwitches.length} switches. Total switches now: ${device.switches.length}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

addMissingSwitches();
