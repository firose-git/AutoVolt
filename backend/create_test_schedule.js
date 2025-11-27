const mongoose = require('mongoose');
const Schedule = require('./models/Schedule');
const Device = require('./models/Device');

async function createTestSchedule() {
  try {
    await mongoose.connect('mongodb://localhost:27017/autovolt');

    // Get current time + 1 minute
    const now = new Date();
    const testTime = new Date(now.getTime() + 60000); // +1 minute
    const timeStr = testTime.getHours().toString().padStart(2,'0') + ':' + testTime.getMinutes().toString().padStart(2,'0');

    // Find a device to schedule
    const device = await Device.findOne();
    if (!device) {
      console.log('No devices found');
      return;
    }

    const switchRef = {
      deviceId: device._id,
      switchId: device.switches[0]._id
    };

    const testSchedule = new Schedule({
      name: 'Test Schedule',
      type: 'once',
      time: timeStr,
      action: 'on',
      switches: [switchRef],
      enabled: true,
      checkHolidays: false,
      respectMotion: false
    });

    await testSchedule.save();
    console.log(`Created test schedule '${testSchedule.name}' to run at ${timeStr} (in 1 minute)`);
    console.log('Schedule ID:', testSchedule._id);
    console.log('Device:', device.name, 'Switch:', device.switches[0].name);

  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await mongoose.disconnect();
  }
}

createTestSchedule();