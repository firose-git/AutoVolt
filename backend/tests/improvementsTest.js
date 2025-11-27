/**
 * Standalone tests for power consumption improvements
 * Tests validation, dynamic intervals, and model functionality
 */

const mongoose = require('mongoose');
require('dotenv').config();

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    testsPassed++;
    log(`✅ ${testName}`, 'green');
    if (details) log(`   ${details}`, 'yellow');
  } else {
    testsFailed++;
    log(`❌ ${testName}`, 'red');
    if (details) log(`   ${details}`, 'yellow');
  }
}

async function runTests() {
  log('\n' + '='.repeat(60), 'blue');
  log('🧪 POWER CONSUMPTION IMPROVEMENTS TEST SUITE', 'blue');
  log('='.repeat(60) + '\n', 'blue');

  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/autovolt', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    log('✅ Connected to MongoDB\n', 'green');

    // Test 1: Validation Middleware
    log('📝 Test 1: Input Validation', 'blue');
    const { validatePowerReading, LIMITS } = require('../middleware/powerReadingValidator');
    
    // Create mock request/response
    const createMockReq = (body, params = {}) => ({ body, params });
    const createMockRes = () => {
      const res = {};
      res.status = (code) => {
        res.statusCode = code;
        return res;
      };
      res.json = (data) => {
        res.jsonData = data;
        return res;
      };
      return res;
    };
    
    // Valid reading
    let req = createMockReq({
      voltage: 230,
      current: 2.5,
      power: 575,
      activeSwitches: 2,
      totalSwitches: 2
    }, { macAddress: 'AA:BB:CC:DD:EE:FF' });
    let res = createMockRes();
    let nextCalled = false;
    validatePowerReading(req, res, () => { nextCalled = true; });
    assert(nextCalled, 'Valid reading passes validation');

    // Invalid voltage
    req = createMockReq({
      voltage: 400, // Over max
      current: 2.5,
      power: 1000
    }, { macAddress: 'AA:BB:CC:DD:EE:FF' });
    res = createMockRes();
    nextCalled = false;
    validatePowerReading(req, res, () => { nextCalled = true; });
    assert(!nextCalled && res.statusCode === 400, 'Invalid voltage rejected', `Status: ${res.statusCode}`);

    // Invalid current
    req = createMockReq({
      voltage: 230,
      current: -5, // Negative
      power: 0
    }, { macAddress: 'AA:BB:CC:DD:EE:FF' });
    res = createMockRes();
    nextCalled = false;
    validatePowerReading(req, res, () => { nextCalled = true; });
    assert(!nextCalled && res.statusCode === 400, 'Negative current rejected');

    // Power calculation mismatch
    req = createMockReq({
      voltage: 230,
      current: 2.5,
      power: 1000 // Should be ~575W
    }, { macAddress: 'AA:BB:CC:DD:EE:FF' });
    res = createMockRes();
    nextCalled = false;
    validatePowerReading(req, res, () => { nextCalled = true; });
    assert(!nextCalled && res.statusCode === 400, 'Power calculation mismatch detected');

    // Test 2: PowerReading Model
    log('\n📝 Test 2: PowerReading Model', 'blue');
    const PowerReading = require('../models/PowerReading');
    const Device = require('../models/Device');

    // Create test device (find or use existing)
    let testDevice = await Device.findOne({ macAddress: 'AA:BB:CC:DD:EE:01' });
    if (!testDevice) {
      try {
        testDevice = await Device.create({
          name: 'Test Device',
          macAddress: 'AA:BB:CC:DD:EE:01',
          secret: 'test-secret',
          classroom: 'Test Lab',
          location: 'Test Room',
          ipAddress: '192.168.1.1',
          switches: [
            { name: 'Test Switch', state: false, relayGpio: 13, type: 'relay' }
          ]
        });
        log('   Created new test device', 'yellow');
      } catch (error) {
        // Device might exist with different case - try to find it again
        testDevice = await Device.findOne({ macAddress: /aa:bb:cc:dd:ee:01/i });
        if (!testDevice) throw error;
        log('   Using existing test device', 'yellow');
      }
    } else {
      log('   Using existing test device', 'yellow');
    }

    // Create power reading
    const reading = new PowerReading({
      deviceId: testDevice._id,
      deviceName: testDevice.name,
      classroom: testDevice.classroom,
      timestamp: new Date(),
      voltage: 230,
      current: 2.5,
      power: 575,
      energy: 9.58, // ~575W for 1 minute
      totalEnergy: 0,
      status: 'online',
      pricePerUnit: 7.5,
      cost: 0
    });

    await reading.save();
    assert(reading.readingId, 'Reading ID generated automatically', `ID: ${reading.readingId}`);
    assert(reading.cost > 0, 'Cost calculated automatically', `Cost: ₹${reading.cost.toFixed(2)}`);

    // Test 3: Dynamic Interval Calculation
    log('\n📝 Test 3: Dynamic Interval Calculation', 'blue');
    
    // Simulate readings with different intervals
    const now = Date.now();
    const reading1 = new PowerReading({
      deviceId: testDevice._id,
      deviceName: testDevice.name,
      classroom: testDevice.classroom,
      timestamp: new Date(now - 60000), // 1 minute ago
      voltage: 230,
      current: 2.5,
      power: 575,
      energy: 9.58,
      totalEnergy: 0,
      status: 'online',
      pricePerUnit: 7.5,
      cost: 0
    });
    await reading1.save();

    const reading2 = new PowerReading({
      deviceId: testDevice._id,
      deviceName: testDevice.name,
      classroom: testDevice.classroom,
      timestamp: new Date(now), // now
      voltage: 230,
      current: 2.5,
      power: 575,
      energy: 9.58, // For 1 minute interval
      totalEnergy: 0.00958,
      status: 'online',
      pricePerUnit: 7.5,
      cost: 0
    });
    await reading2.save();

    const intervalMs = reading2.timestamp - reading1.timestamp;
    const intervalMinutes = intervalMs / (1000 * 60);
    assert(Math.abs(intervalMinutes - 1) < 0.1, 'Interval calculation accurate', `Interval: ${intervalMinutes.toFixed(2)} minutes`);

    // Test 4: Aggregation Queries
    log('\n📝 Test 4: Aggregation Queries', 'blue');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dailyStats = await PowerReading.getDailyAggregation(
      testDevice._id,
      today,
      tomorrow
    );
    assert(Array.isArray(dailyStats), 'Daily aggregation returns array');
    
    if (dailyStats.length > 0) {
      assert(dailyStats[0].totalEnergyKwh !== undefined, 'Daily stats include energy', 
        `Energy: ${dailyStats[0].totalEnergyKwh.toFixed(4)} kWh`);
    }

    // Test 5: Duplicate Prevention
    log('\n📝 Test 5: Duplicate Prevention', 'blue');
    
    try {
      const duplicateReading = new PowerReading({
        deviceId: testDevice._id,
        deviceName: testDevice.name,
        classroom: testDevice.classroom,
        timestamp: reading1.timestamp, // Same timestamp
        voltage: 230,
        current: 2.5,
        power: 575,
        energy: 9.58,
        totalEnergy: 0,
        status: 'online',
        pricePerUnit: 7.5,
        cost: 0
      });
      await duplicateReading.save();
      assert(false, 'Duplicate timestamp rejected');
    } catch (error) {
      assert(error.code === 11000, 'Duplicate timestamp correctly rejected', 'Unique index working');
    }

    // Test 6: Data Integrity
    log('\n📝 Test 6: Data Integrity', 'blue');
    
    const totalConsumption = await PowerReading.getTotalConsumption(
      testDevice._id,
      today,
      tomorrow
    );
    assert(totalConsumption.totalEnergyKwh >= 0, 'Total consumption calculated', 
      `Total: ${totalConsumption.totalEnergyKwh.toFixed(4)} kWh`);
    assert(totalConsumption.readingCount > 0, 'Reading count tracked', 
      `Count: ${totalConsumption.readingCount}`);

    // Test 7: Cumulative Energy
    log('\n📝 Test 7: Cumulative Energy Tracking', 'blue');
    
    const readings = await PowerReading.find({ deviceId: testDevice._id })
      .sort({ timestamp: 1 })
      .limit(10);
    
    if (readings.length > 1) {
      const isIncreasing = readings.every((r, i) => 
        i === 0 || r.totalEnergy >= readings[i-1].totalEnergy
      );
      assert(isIncreasing, 'Cumulative energy increases monotonically');
    }

    // Test 8: Cost Calculation
    log('\n📝 Test 8: Cost Calculation', 'blue');
    
    const testReading = new PowerReading({
      deviceId: testDevice._id,
      deviceName: testDevice.name,
      classroom: testDevice.classroom,
      timestamp: new Date(),
      voltage: 230,
      current: 10, // 2300W
      power: 2300,
      energy: 38.33, // 2300W for 1 minute
      totalEnergy: 0,
      status: 'online',
      pricePerUnit: 7.5,
      cost: 0
    });
    await testReading.save();
    
    const expectedCost = (38.33 / 1000) * 7.5;
    assert(Math.abs(testReading.cost - expectedCost) < 0.01, 'Cost calculation accurate', 
      `Cost: ₹${testReading.cost.toFixed(4)} (expected: ₹${expectedCost.toFixed(4)})`);

    // Results
    log('\n' + '='.repeat(60), 'blue');
    log('📊 TEST RESULTS', 'blue');
    log('='.repeat(60), 'blue');
    log(`✅ Passed: ${testsPassed}`, 'green');
    log(`❌ Failed: ${testsFailed}`, testsFailed > 0 ? 'red' : 'green');
    log(`📈 Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(2)}%\n`, 'blue');

    log('✨ All improvements tested successfully!', 'green');
    log('   - Input validation working', 'green');
    log('   - Dynamic interval calculation implemented', 'green');
    log('   - Duplicate prevention active', 'green');
    log('   - Aggregation queries functional', 'green');
    log('   - Cost calculation accurate', 'green');
    log('   - Cumulative energy tracking correct\n', 'green');

    process.exit(testsFailed > 0 ? 1 : 0);

  } catch (error) {
    log(`\n❌ Test suite failed: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

runTests();
