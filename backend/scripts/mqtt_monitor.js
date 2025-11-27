const mqtt = require('mqtt');
const BROKER = process.env.MQTT_BROKER || 'mqtt://172.16.3.171:1883';
const client = mqtt.connect(BROKER, { clientId: 'monitor_client_' + Math.random().toString(16).slice(2) });

client.on('connect', () => {
  console.log('[monitor] connected to', BROKER);
  client.subscribe('esp32/switches', (err) => {
    if (err) console.error('[monitor] subscribe error', err.message);
    else console.log('[monitor] subscribed to esp32/switches');
  });
});

client.on('message', (topic, payload) => {
  try {
    const msg = payload.toString();
    console.log('[monitor] message', topic, msg);
  } catch (e) {
    console.error('[monitor] message parse error', e.message);
  }
});

client.on('error', (err) => {
  console.error('[monitor] error', err.message);
});

// Keep running until killed
setInterval(() => {}, 1000);
