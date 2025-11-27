// Simulate manual alert sending command processing
function simulateAlertCommand() {
  console.log('🎮 === Simulating Manual Security Alert Sending ===\n');

  console.log('📱 User Interaction Simulation:');
  console.log('');

  // Step 1: User types /alert
  console.log('1. 👤 User (Security/Admin): /alert');
  console.log('   🤖 Bot Response:');
  console.log('   🚨 *Send Manual Alert*');
  console.log('   ');
  console.log('   1. Security Alert - Send security-related alert to security personnel');
  console.log('   2. Admin Alert - Send administrative alert to administrators');
  console.log('   3. Maintenance Alert - Send maintenance alert to administrators');
  console.log('   4. System Alert - Send system health alert to administrators');
  console.log('   5. Energy Alert - Send energy conservation alert to all users');
  console.log('   6. User Alert - Send user-related alert to administrators');
  console.log('   ');
  console.log('   💡 *How to send an alert:*');
  console.log('   • Type a number: `/alert 1` (for Security Alert)');
  console.log('   • Or type the name: `/alert security_alerts`');
  console.log('   ');
  console.log('   ⚠️ *Important:* You must provide a message with the alert!');
  console.log('   Example: `/alert 1 Suspicious activity detected in LH_19g`');
  console.log('');

  // Step 2: User sends security alert
  console.log('2. 👤 User (Security/Admin): /alert 1 Suspicious person spotted near main entrance');
  console.log('   🤖 Bot Processing:');
  console.log('   ✅ Permission check: User has security/admin role');
  console.log('   ✅ Alert type parsed: "1" → "security_alerts"');
  console.log('   ✅ Message extracted: "Suspicious person spotted near main entrance"');
  console.log('   📝 Alert data created:');
  console.log('      - alertname: "Manual Security Alert"');
  console.log('      - summary: "Suspicious person spotted near main entrance"');
  console.log('      - description: "Manual alert sent by [User Name] (security)"');
  console.log('      - severity: "warning"');
  console.log('   👥 Finding subscribers for security_alerts...');
  console.log('   📨 Sending to 3 security personnel...');
  console.log('');

  // Step 3: Bot confirmation
  console.log('3. 🤖 Bot Confirmation:');
  console.log('   ✅ *Alert Sent Successfully!*');
  console.log('   ');
  console.log('   📢 *Alert Type:* Security Alert');
  console.log('   📝 *Message:* Suspicious person spotted near main entrance');
  console.log('   👥 *Recipients:* 3/3 users notified');
  console.log('   ');
  console.log('   *Sent by:* John Security (security)');
  console.log('   *Time:* 24/10/2025, 9:57:24 am');
  console.log('');

  // Step 4: Recipients receive alert
  console.log('4. 📱 Recipients Receive Alert:');
  console.log('   ⚠️ *IoT Classroom Alert* ⚠️');
  console.log('   ');
  console.log('   *Alert:* Manual Security Alert');
  console.log('   *Summary:* Suspicious person spotted near main entrance');
  console.log('   *Description:* Manual alert sent by John Security (security)');
  console.log('   *Severity:* warning');
  console.log('   ');
  console.log('   *Time:* 24/10/2025, 9:57:24 am');
  console.log('   ');
  console.log('   Please take action immediately!');
  console.log('');

  console.log('🎯 Security Response Options:');
  console.log('• Check cameras: /devices (then select device to query)');
  console.log('• Check offline devices: /devices 1');
  console.log('• Get device status: /status 3');
  console.log('• Send follow-up alert: /alert 1 Camera shows clear now');
  console.log('');

  console.log('🚨 Security Alert System Demo Complete!');
  console.log('✅ Manual alerts can be sent by authorized personnel');
  console.log('✅ Alerts reach subscribed security staff instantly');
  console.log('✅ Full audit trail and sender information included');
  console.log('✅ Integration with device monitoring commands');
}

simulateAlertCommand();