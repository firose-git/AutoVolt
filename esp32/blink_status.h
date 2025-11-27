// blink_status.h - Status LED and Connection State Definitions
// For ESP32 MQTT Classroom Automation

#ifndef BLINK_STATUS_H
#define BLINK_STATUS_H

// Connection State Enum for Status LED
enum ConnState {
  WIFI_DISCONNECTED,  // Not connected to WiFi
  WIFI_ONLY,          // Connected to WiFi, but not to MQTT/Backend
  BACKEND_CONNECTED   // Fully connected to WiFi and MQTT/Backend
};

#endif // BLINK_STATUS_H
