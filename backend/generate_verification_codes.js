const mongoose = require('mongoose');
const TelegramUser = require('./models/TelegramUser');
const User = require('./models/User');

// Script to generate new verification codes for pending Telegram registrations
async function generateVerificationCodes() {
  try {
    console.log('🔑 Generating New Verification Codes for Pending Registrations\n');

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/autovolt';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Find all active but unverified users
    const pendingUsers = await TelegramUser.find({
      isActive: true,
      isVerified: false
    }).populate('user', 'name email role');

    if (pendingUsers.length === 0) {
      console.log('✅ No pending registrations found');
      return;
    }

    console.log(`Found ${pendingUsers.length} users with pending verification:\n`);

    // Generate new verification codes for each pending user
    for (const telegramUser of pendingUsers) {
      // Generate a new 6-character verification code
      const verificationCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      // Set the verification token and expiry (10 minutes)
      telegramUser.registrationToken = verificationCode;
      telegramUser.tokenExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      telegramUser.isVerified = false; // Ensure not verified
      telegramUser.verifiedAt = undefined; // Clear any previous verification

      await telegramUser.save();

      console.log(`🔄 Generated verification code for:`);
      console.log(`   Name: ${telegramUser.user.name}`);
      console.log(`   Role: ${telegramUser.user.role}`);
      console.log(`   Email: ${telegramUser.user.email}`);
      console.log(`   Telegram ID: ${telegramUser.telegramId}`);
      console.log(`   Verification Code: ${verificationCode}`);
      console.log(`   Expires: ${telegramUser.tokenExpires.toLocaleString()}`);
      console.log('');
    }

    console.log('📋 Instructions for completing verification:');
    console.log('');
    console.log('Each user needs to:');
    console.log('1. Open Telegram and go to the bot chat');
    console.log('2. Reply with their 6-character verification code');
    console.log('3. The bot will confirm successful verification');
    console.log('');
    console.log('⚠️  Important: Codes expire in 10 minutes!');
    console.log('   If expired, users need to re-register with /register <email>');
    console.log('');
    console.log('🔒 Security Note:');
    console.log('   - Only authorized personnel (admin/security roles) can register');
    console.log('   - Security personnel will receive security and energy alerts');
    console.log('   - Admin personnel receive all alert types');

  } catch (error) {
    console.error('❌ Error generating verification codes:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the code generation
if (require.main === module) {
  generateVerificationCodes().then(() => {
    console.log('\n🎉 Verification code generation completed');
    process.exit(0);
  }).catch((error) => {
    console.error('\n💥 Verification code generation failed:', error);
    process.exit(1);
  });
}

module.exports = { generateVerificationCodes };