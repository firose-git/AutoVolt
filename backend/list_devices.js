const mongoose = require('mongoose');
const Device = require('./models/Device');

async function listDevices() {
  try {
    await mongoose.connect('mongodb://localhost:27017/autovolt', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    const devices = await Device.find({}).select('name macAddress ipAddress status pirEnabled pirSensorType lastSeen location');

    console.log('All devices in database:');
    devices.forEach(device => {
      console.log(`Name: ${device.name}, MAC: ${device.macAddress}, Status: ${device.status}, PIR: ${device.pirEnabled}, Type: ${device.pirSensorType}, Last Seen: ${device.lastSeen}`);
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    await mongoose.disconnect();
  }
}

listDevices();