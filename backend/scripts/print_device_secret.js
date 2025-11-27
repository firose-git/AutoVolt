const mongoose = require('mongoose');
const Device = require('../models/Device');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/autovolt';
const mac = process.argv[2];
if (!mac) {
  console.error('Usage: node print_device_secret.js <macAddress>');
  process.exit(1);
}

(async () => {
  try {
    await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    const dev = await Device.findOne({ $or: [ { macAddress: mac }, { macAddress: mac.toLowerCase() }, { macAddress: mac.toUpperCase() } ] }).select('+deviceSecret').lean();
    if (!dev) {
      console.log('Device not found for mac:', mac);
    } else {
      console.log('Device:', { id: dev._id, name: dev.name, macAddress: dev.macAddress, deviceSecret: dev.deviceSecret });
      if (dev.switches) {
        console.log('Switches:', dev.switches.map(s => ({ id: s._id, gpio: s.gpio || s.relayGpio, name: s.name || null }))); 
      }
    }
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exit(2);
  }
})();
