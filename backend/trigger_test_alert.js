const eveningLightsMonitor = require('./services/eveningLightsMonitor');

async function triggerTestSecurityAlert() {
    try {
        console.log('🚨 Triggering test security alert via evening lights monitor...');
        await eveningLightsMonitor.triggerManualCheck();
        console.log('✅ Test security alert triggered successfully');
    } catch (error) {
        console.error('❌ Error triggering test alert:', error);
    }
}

triggerTestSecurityAlert();