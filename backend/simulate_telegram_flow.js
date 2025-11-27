require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');
const TelegramService = require('./services/telegramService');
const TelegramUser = require('./models/TelegramUser');
const User = require('./models/User');

async function connectDb() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/autovolt';
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to DB');
}

async function clearTestUsers(testTelegramId, testChatId, testGroupId) {
  await TelegramUser.deleteMany({ $or: [ { telegramId: testTelegramId }, { chatId: testChatId }, { chatId: testGroupId } ] });
}

async function createUserAccount(email) {
  // Find or create a system User to attach to TelegramUser
  let u = await User.findOne({ email });
  if (!u) {
    u = new User({ name: 'Test User', email, password: 'SimPass123!', role: 'admin', isActive: true, isApproved: true });
    await u.save();
  }
  return u;
}

async function run() {
  await connectDb();

  const testTelegramId = '999999999';
  const privateChatId = '123456789';
  const groupChatId = '-111222333444';
  const email = 'sim@test.local';

  // Prevent real polling/sending
  TelegramService.startPolling = () => { console.log('startPolling stubbed'); };
  TelegramService.sendMessage = async (chatId, text) => {
    console.log(`[sendMessage] -> chatId=${chatId} | ${text.replace(/\n/g, ' | ')}`);
    return { chat_id: chatId, text };
  };

  // Enable debug output inside the TelegramService for this simulation
  try {
    TelegramService.debug = true;
  } catch (e) {
    // ignore
  }

  // Scenario A: create proper verified record
  await clearTestUsers(testTelegramId, privateChatId, groupChatId);
  const sysUser = await createUserAccount(email);
  const verifiedRecord = new TelegramUser({
    user: sysUser._id,
    telegramId: testTelegramId,
    chatId: privateChatId,
    isVerified: true,
    isActive: true
  });
  await verifiedRecord.save();
  console.log('\nCreated verified TelegramUser with telegramId');

  console.log('\n-- Simulate: /register from private chat (should report already registered) --');
  await TelegramService.processWebhookUpdate({ update_id: 2001, message: { message_id: 3, from: { id: parseInt(testTelegramId) }, chat: { id: parseInt(privateChatId) }, text: '/register' } });

  console.log('\n-- Simulate: /status from private chat (should report verified) --');
  await TelegramService.processWebhookUpdate({ update_id: 2002, message: { message_id: 4, from: { id: parseInt(testTelegramId) }, chat: { id: parseInt(privateChatId) }, text: '/status' } });

  console.log('\n-- Simulate: reply with plain number "3" to choose Device Status from menu --');
  await TelegramService.processWebhookUpdate({ update_id: 2003, message: { message_id: 5, from: { id: parseInt(testTelegramId) }, chat: { id: parseInt(privateChatId) }, text: '3' } });

  // Cleanup
  await clearTestUsers(testTelegramId, privateChatId, groupChatId);
  console.log('\nSimulation complete');
  process.exit(0);
}

run().catch(err => { console.error('Simulation error', err); process.exit(1); });
