const mongoose = require('mongoose');
require('dotenv').config();

/**
 * Migration Script: Power Consumption System Migration
 * 
 * This script:
 * 1. Drops old power consumption collections (PowerConsumptionLog, EnergyLog, DailyConsumption, MonthlyConsumption)
 * 2. Creates new PowerReading collection with proper indexes
 * 3. Initializes the new system
 * 
 * WARNING: This will delete all existing power consumption data!
 * Make sure to backup your database before running this script.
 */

async function migrate() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/autovolt', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;

    // Get all existing collections
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    console.log('📋 Existing collections:', collectionNames.join(', '), '\n');

    // Collections to drop
    const collectionsToDelete = [
      'powerconsumptionlogs',
      'energylogs',
      'dailyconsumptions',
      'monthlyconsumptions'
    ];

    console.log('🗑️  Dropping old power consumption collections...\n');

    for (const collectionName of collectionsToDelete) {
      if (collectionNames.includes(collectionName)) {
        console.log(`   Dropping: ${collectionName}`);
        await db.dropCollection(collectionName);
        console.log(`   ✅ Dropped: ${collectionName}\n`);
      } else {
        console.log(`   ⚠️  Collection not found: ${collectionName}\n`);
      }
    }

    // Import PowerReading model to create collection and indexes
    console.log('📦 Creating new PowerReading collection with indexes...\n');
    const PowerReading = require('../models/PowerReading');

    // Create indexes by triggering model initialization
    await PowerReading.createIndexes();
    
    console.log('✅ PowerReading collection created with indexes:\n');
    const indexes = await PowerReading.collection.getIndexes();
    console.log(JSON.stringify(indexes, null, 2), '\n');

    // Verify collection was created
    const newCollections = await db.listCollections().toArray();
    const newCollectionNames = newCollections.map(c => c.name);
    
    if (newCollectionNames.includes('powerreadings')) {
      console.log('✅ PowerReading collection successfully created\n');
    } else {
      console.log('⚠️  PowerReading collection not found - it will be created on first insert\n');
    }

    console.log('✅ Migration completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Dropped ${collectionsToDelete.length} old collections`);
    console.log(`   - Created new PowerReading collection with indexes`);
    console.log(`   - System ready for ESP32 power readings\n`);

    console.log('📝 Next steps:');
    console.log('   1. Update ESP32 firmware to use new data format');
    console.log('   2. Configure offline buffering on ESP32 devices');
    console.log('   3. Test data sync endpoints');
    console.log('   4. Monitor dashboard for accurate readings\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run migration
if (require.main === module) {
  console.log('⚡ Starting Power Consumption System Migration...\n');
  console.log('⚠️  WARNING: This will delete all existing power consumption data!\n');
  
  // Give user 5 seconds to cancel
  let countdown = 5;
  const interval = setInterval(() => {
    process.stdout.write(`\r   Starting in ${countdown} seconds... (Press Ctrl+C to cancel)`);
    countdown--;
    
    if (countdown < 0) {
      clearInterval(interval);
      console.log('\n');
      migrate();
    }
  }, 1000);
}

module.exports = migrate;
