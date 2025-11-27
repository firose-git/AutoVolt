// Environment configuration
export const config = {
  // API Configuration (development vs production) - Dynamic detection for network access
  apiBaseUrl: (() => {
    // In development, construct the URL from the current page's hostname
    if (import.meta.env.DEV) {
      const currentHost = window.location.hostname;
      // Use the same hostname where the frontend is being accessed from, but with the backend port
      return `http://${currentHost}:3001`;
    }
    // Production fallback from environment variables
    return import.meta.env.VITE_API_BASE_URL || 'http://192.168.0.108:3001';
  })(),

  staticBaseUrl: (() => {
    if (import.meta.env.DEV) {
      const currentHost = window.location.hostname;
      return `http://${currentHost}:3001`;
    }
    return import.meta.env.VITE_STATIC_BASE_URL || 'http://192.168.0.108:3001';
  })(),

  websocketUrl: (() => {
    if (import.meta.env.DEV) {
      const currentHost = window.location.hostname;
      return `ws://${currentHost}:3001`;
    }
    return import.meta.env.VITE_WEBSOCKET_URL || 'ws://192.168.0.108:3001';
  })(),
  
  // Application Settings
  appName: import.meta.env.VITE_APP_NAME || 'AutoVolt - Intelligent Power Management',
  appVersion: import.meta.env.VITE_APP_VERSION || '1.0.0',
  
  // Development Settings
  isDevelopment: import.meta.env.DEV,
  debugMode: import.meta.env.VITE_DEBUG_MODE === 'true',
  logLevel: import.meta.env.VITE_LOG_LEVEL || 'info',
  
  // Theme Settings
  defaultTheme: import.meta.env.VITE_DEFAULT_THEME || 'dark',
  
  // Authentication
  authProvider: import.meta.env.VITE_AUTH_PROVIDER || 'jwt',
  
  // ESP32 Configuration
  esp32: {
    defaultPort: 80,
    maxRetries: 3,
    timeout: 5000,
    updateInterval: 30000, // 30 seconds
  },
  
  // GPIO Pin Definitions
  gpio: {
    availableOutputPins: [2, 4, 5, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 25, 26, 27],
    availableInputPins: [0, 1, 3, 6, 7, 8, 9, 10, 11, 20, 24, 28, 29, 30, 31, 32, 33, 34, 35, 36, 39],
    pirRecommendedPins: [16, 17, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33, 34, 35, 36, 39],
  }
};

export default config;
