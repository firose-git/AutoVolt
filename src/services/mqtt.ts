import mqtt, { MqttClient } from 'mqtt';

class MqttService {
  private client: MqttClient | null = null;
  private isConnecting = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private eventListeners: { [topic: string]: ((message: any) => void)[] } = {};

  constructor() {
    // MQTT connection disabled - using Socket.IO for real-time features
    // this.connect();
  }

  private connect() {
    if (this.isConnecting || (this.client && this.client.connected)) {
      return;
    }

    this.isConnecting = true;

    // Try WebSocket MQTT connection first (if broker supports it)
    const wsBrokerUrl = `ws://localhost:8083/mqtt`;

    console.log('[MQTT] Attempting WebSocket MQTT connection to:', wsBrokerUrl);

    this.client = mqtt.connect(wsBrokerUrl, {
      clientId: `frontend_${Date.now()}`,
      clean: true,
      connectTimeout: 4000,
      reconnectPeriod: 1000,
      protocolVersion: 4
    });

    this.client.on('connect', () => {
      console.log('[MQTT] Connected successfully via WebSocket');
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this.subscribeToNoticeTopics();
    });

    this.client.on('error', (error) => {
      console.error('[MQTT] WebSocket connection error:', error);
      this.isConnecting = false;

      // If WebSocket fails and we haven't tried direct MQTT, try direct connection
      if (this.reconnectAttempts === 0) {
        console.log('[MQTT] Retrying with direct MQTT connection...');
        this.connectDirect();
      } else {
        // If all connection attempts fail, stop trying
        console.warn('[MQTT] All MQTT connection attempts failed. MQTT features will be disabled.');
        this.client = null;
      }
    });

    this.client.on('offline', () => {
      console.log('[MQTT] Client offline');
    });

    this.client.on('reconnect', () => {
      this.reconnectAttempts++;
      if (this.reconnectAttempts <= 3) {
        console.log('[MQTT] Reconnecting...');
      } else if (this.reconnectAttempts === 4) {
        console.warn('[MQTT] MQTT broker not available. Features requiring MQTT will be disabled.');
      }
      // Stop logging after 4 attempts to avoid console spam
    });

    this.client.on('message', (topic, message) => {
      try {
        const data = JSON.parse(message.toString());
        this.handleMessage(topic, data);
      } catch (error) {
        console.error('[MQTT] Failed to parse message:', error);
      }
    });
  }

  private connectDirect() {
    // Fallback: try direct MQTT connection (won't work in browser, but for completeness)
    console.log('[MQTT] Attempting direct MQTT connection (fallback)...');

    // Note: Direct MQTT connection from browser won't work due to browser security
    // This is just for completeness - in production, WebSocket MQTT proxy is required
    const directUrl = `mqtt://localhost:1884`;

    this.client = mqtt.connect(directUrl, {
      clientId: `frontend_${Date.now()}`,
      clean: true,
      connectTimeout: 4000,
      reconnectPeriod: 1000,
      protocolVersion: 4
    });

    this.client.on('connect', () => {
      console.log('[MQTT] Connected successfully via direct MQTT');
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this.subscribeToNoticeTopics();
    });

    this.client.on('error', (error) => {
      console.error('[MQTT] Direct MQTT connection also failed:', error);
      this.isConnecting = false;
      console.warn('[MQTT] All connection attempts failed. Real-time features will not work.');
    });
  }

  private subscribeToNoticeTopics() {
    if (!this.client || !this.client.connected) return;

    const topics = [
      'notices/submitted',
      'notices/reviewed',
      'notices/published',
      'notices/admin'
    ];

    topics.forEach(topic => {
      this.client!.subscribe(topic, { qos: 1 }, (err) => {
        if (!err) {
          console.log(`[MQTT] Subscribed to ${topic}`);
        } else {
          console.error(`[MQTT] Failed to subscribe to ${topic}:`, err);
        }
      });
    });
  }

  private handleMessage(topic: string, data: any) {
    console.log(`[MQTT] Received message on ${topic}:`, data);

    // Call registered listeners for this topic
    if (this.eventListeners[topic]) {
      this.eventListeners[topic].forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error('[MQTT] Error in event listener:', error);
        }
      });
    }
  }

  // Subscribe to user-specific topics (called after login)
  subscribeToUserTopics(userId: string) {
    if (!this.client || !this.client.connected) return;

    const userTopic = `notices/user/${userId}`;
    this.client.subscribe(userTopic, { qos: 1 }, (err) => {
      if (!err) {
        console.log(`[MQTT] Subscribed to user topic: ${userTopic}`);
      } else {
        console.error(`[MQTT] Failed to subscribe to user topic:`, err);
      }
    });
  }

  // Unsubscribe from user-specific topics (called on logout)
  unsubscribeFromUserTopics(userId: string) {
    if (!this.client || !this.client.connected) return;

    const userTopic = `notices/user/${userId}`;
    this.client.unsubscribe(userTopic, (err) => {
      if (!err) {
        console.log(`[MQTT] Unsubscribed from user topic: ${userTopic}`);
      } else {
        console.error(`[MQTT] Failed to unsubscribe from user topic:`, err);
      }
    });
  }

  // Add event listener for a specific topic
  on(topic: string, callback: (message: any) => void) {
    if (!this.eventListeners[topic]) {
      this.eventListeners[topic] = [];
    }
    this.eventListeners[topic].push(callback);
  }

  // Remove event listener for a specific topic
  off(topic: string, callback?: (message: any) => void) {
    if (!this.eventListeners[topic]) return;

    if (callback) {
      this.eventListeners[topic] = this.eventListeners[topic].filter(listener => listener !== callback);
    } else {
      delete this.eventListeners[topic];
    }
  }

  // Publish a message to a topic
  publish(topic: string, message: any, options: { qos?: 0 | 1 | 2 } = {}) {
    if (!this.client || !this.client.connected) {
      console.warn('[MQTT] Cannot publish - client not connected');
      return;
    }

    const payload = JSON.stringify(message);
    this.client.publish(topic, payload, { qos: options.qos || 1 }, (err) => {
      if (err) {
        console.error('[MQTT] Failed to publish message:', err);
      }
    });
  }

  // Disconnect from MQTT broker
  disconnect() {
    if (this.client) {
      this.client.end();
      this.client = null;
    }
    this.eventListeners = {};
  }

  // Check if connected
  get isConnected(): boolean {
    return this.client?.connected || false;
  }
}

// Create singleton instance
const mqttService = new MqttService();

export default mqttService;