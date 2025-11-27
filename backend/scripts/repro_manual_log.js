const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/autovolt';
  console.log('Connecting to MongoDB at', uri);
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected.');

  const EnhancedLoggingService = require('../services/enhancedLoggingService');
  const { Types } = mongoose;

  const payload = {
    deviceId: new Types.ObjectId(),
    deviceName: 'REPRO_TEST_DEVICE',
    deviceMac: 'AA:BB:CC:DD:EE:FF',
    switchId: new Types.ObjectId().toString(),
    switchName: 'REPRO_SWITCH',
    physicalPin: 99,
    action: 'manual_on',
    previousState: 'off',
    newState: 'on',
    classroom: 'ReproLab',
    location: 'ReproLocation',
    context: { rawPayload: { repro: true } }
  };

  try {
    console.log('Calling EnhancedLoggingService.logManualSwitch with payload:', payload);
    const res = await EnhancedLoggingService.logManualSwitch(payload);
    console.log('logManualSwitch result:', res);
    // Try with switchId as ObjectId to mimic possible server path
    const payloadObjId = { ...payload, switchId: new Types.ObjectId() };
    console.log('Calling EnhancedLoggingService.logManualSwitch with OBJECTID switchId payload:', payloadObjId);
    const res2 = await EnhancedLoggingService.logManualSwitch(payloadObjId);
    console.log('logManualSwitch result for OBJECTID switchId:', res2);
  } catch (err) {
    console.error('Script error:', err && err.stack ? err.stack : err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected and exiting');
  }
}

main();
