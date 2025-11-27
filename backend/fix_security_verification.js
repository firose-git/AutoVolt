const mongoose = require('mongoose');
const TelegramUser = require('./models/TelegramUser');
const User = require('./models/User');

// Script to fix security user verification issues
async function fixSecurityUserVerification() {
  try {
    console.log('🔧 Fixing Security User Verification Issues\n');

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/autovolt';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Find security users who are active but not verified
    const securityUsers = await TelegramUser.find({
      isActive: true,
      isVerified: false
    }).populate('user', 'name email role');

    const unverifiedSecurityUsers = securityUsers.filter(tgUser =>
      tgUser.user && tgUser.user.role === 'security'
    );

    if (unverifiedSecurityUsers.length === 0) {
      console.log('✅ No unverified security users found');
      return;
    }

    console.log(`Found ${unverifiedSecurityUsers.length} unverified security users:`);
    unverifiedSecurityUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.user.name} (${user.user.email})`);
      console.log(`      Telegram ID: ${user.telegramId}`);
      console.log(`      Has expired token: ${!!user.registrationToken}`);
    });
    console.log('');

    // Clean up expired tokens and reset verification status
    console.log('🧹 Cleaning up expired tokens...');
    for (const telegramUser of unverifiedSecurityUsers) {
      // Clear any expired tokens
      telegramUser.registrationToken = undefined;
      telegramUser.tokenExpires = undefined;

      // Reset verification status
      telegramUser.isVerified = false;
      telegramUser.verifiedAt = undefined;

      await telegramUser.save();
      console.log(`   ✅ Cleared expired data for ${telegramUser.user.name}`);
    }
    console.log('');

    console.log('📋 Instructions for security users to complete verification:');
    console.log('');
    console.log('   The following security personnel need to re-register with Telegram:');
    console.log('');

    unverifiedSecurityUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.user.name}`);
      console.log(`      Email: ${user.user.email}`);
      console.log(`      Instructions:`);
      console.log(`         1. Open Telegram and message the bot`);
      console.log(`         2. Send: /register ${user.user.email}`);
      console.log(`         3. Bot will send a 6-character verification code`);
      console.log(`         4. Reply with the code to complete registration`);
      console.log('');
    });

    console.log('⚠️  Important: Security users must complete verification to receive alerts!');
    console.log('   After verification, they will automatically receive:');
    console.log('   • Security alerts');
    console.log('   • Energy conservation alerts (including evening lights monitoring)');

  } catch (error) {
    console.error('❌ Error fixing security user verification:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the fix
if (require.main === module) {
  fixSecurityUserVerification().then(() => {
    console.log('\n🎉 Security user verification fix completed');
    process.exit(0);
  }).catch((error) => {
    console.error('\n💥 Security user verification fix failed:', error);
    process.exit(1);
  });
}

module.exports = { fixSecurityUserVerification };