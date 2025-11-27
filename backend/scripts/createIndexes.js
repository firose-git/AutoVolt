const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Import models
const Device = require('../models/Device');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const PowerReading = require('../models/PowerReading');
const DeviceStatusLog = require('../models/DeviceStatusLog');
const Schedule = require('../models/Schedule');
const EnergyConsumption = require('../models/EnergyConsumption');

/**
 * Script to create database indexes for performance optimization
 * Run this script after deploying or when adding new indexes
 */

async function createIndexes() {
  try {
    console.log('🔧 Creating database indexes...\n');

    // Connect to MongoDB
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/iot_classroom';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Create indexes for each model
    console.log('📊 Creating Device indexes...');
    await Device.createIndexes();
    console.log('✅ Device indexes created\n');

    console.log('👤 Creating User indexes...');
    await User.createIndexes();
    console.log('✅ User indexes created\n');

    console.log('📝 Creating ActivityLog indexes...');
    await ActivityLog.createIndexes();
    console.log('✅ ActivityLog indexes created\n');

    console.log('⚡ Creating PowerReading indexes...');
    await PowerReading.createIndexes();
    console.log('✅ PowerReading indexes created\n');

    console.log('📊 Creating DeviceStatusLog indexes...');
    await DeviceStatusLog.createIndexes();
    console.log('✅ DeviceStatusLog indexes created\n');

    console.log('📅 Creating Schedule indexes...');
    await Schedule.createIndexes();
    console.log('✅ Schedule indexes created\n');
    
    console.log('⚡ Creating EnergyConsumption indexes...');
    await EnergyConsumption.createIndexes();
    console.log('✅ EnergyConsumption indexes created\n');

    // List all indexes for verification
    console.log('\n📋 Verifying indexes...\n');
    
    const deviceIndexes = await Device.collection.getIndexes();
    console.log('Device indexes:', Object.keys(deviceIndexes).length);
    
    const userIndexes = await User.collection.getIndexes();
    console.log('User indexes:', Object.keys(userIndexes).length);
    
    const activityIndexes = await ActivityLog.collection.getIndexes();
    console.log('ActivityLog indexes:', Object.keys(activityIndexes).length);
    
    const energyIndexes = await EnergyConsumption.collection.getIndexes();
    console.log('EnergyConsumption indexes:', Object.keys(energyIndexes).length);

    console.log('\n✅ All indexes created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating indexes:', error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
    process.exit(0);
  }
}

// Run the script
createIndexes();
