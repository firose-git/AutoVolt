# AutoVolt - Intelligent IoT Classroom Automation System

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6+-green.svg)](https://www.mongodb.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)

AutoVolt is a comprehensive IoT classroom automation system that provides intelligent power management, real-time monitoring, energy analytics, and automated device control for educational institutions.

## 🌟 Key Features

### 🏫 Classroom Automation
- **ESP32 Device Control**: Wireless control of classroom appliances (lights, fans, projectors)
- **Automated Scheduling**: Time-based device control with customizable schedules
- **Manual Override**: Physical button control with software override capabilities
- **Device Grouping**: Organize devices by classroom, building, and floor

### 📊 Energy Monitoring & Analytics
- **Real-time Energy Tracking**: Monitor power consumption in real-time
- **Cost Analysis**: Electricity bill calculations with customizable rates
- **Usage Analytics**: Daily, monthly, and yearly consumption reports
- **Efficiency Metrics**: Device uptime and energy efficiency tracking

### 🤖 AI/ML Integration
- **Predictive Analytics**: Forecast energy usage patterns
- **Anomaly Detection**: Identify unusual power consumption
- **Smart Scheduling**: AI-optimized device scheduling
- **Usage Optimization**: Recommendations for energy savings

### 📱 Real-time Monitoring
- **Web Dashboard**: Modern React-based interface
- **Live Device Status**: Real-time device connectivity and state monitoring
- **WebSocket Updates**: Instant UI updates without page refresh
- **Mobile Responsive**: Works seamlessly on all devices

### 📢 Smart Notifications
- **Telegram Bot Integration**: Control devices via Telegram
- **Automated Alerts**: Device offline/online notifications
- **Custom Webhooks**: Integration with external systems
- **Email Notifications**: Configurable alert system

### 🔍 Advanced Monitoring Stack
- **Prometheus Metrics**: Comprehensive system monitoring
- **Grafana Dashboards**: Visual analytics and reporting
- **System Health Checks**: Automated monitoring of all services
- **Performance Analytics**: Response times and system metrics

## 🏗️ System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Frontend│    │  Node.js Backend│    │     MongoDB     │
│   (Port 5173)   │◄──►│   (Port 3001)   │◄──►│   Database      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  ESP32 Devices  │    │   MQTT Broker   │    │   AI/ML Service │
│   (WiFi/Control)│◄──►│   (Mosquitto)   │    │   (Port 8002)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Telegram Bot    │    │   Prometheus    │    │     Grafana     │
│  Notifications  │    │   Monitoring    │    │   Dashboards    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **MongoDB** 6+ (local or Atlas)
- **Mosquitto MQTT Broker** (optional, can use Aedes)
- **Python 3.8+** (for AI/ML service)
- **Git** for version control

### 1. Clone and Setup

```bash
# Clone the repository
git clone https://github.com/chandud1124/AutoVolt.git
cd AutoVolt

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### 2. Environment Configuration

```bash
# Copy environment template
cp backend/.env.example backend/.env

# Edit the .env file with your configuration
# Required: MongoDB URI, JWT Secret, Telegram Bot Token
```

### 3. Start MongoDB

**Option A: Local MongoDB**
```bash
# Install MongoDB locally or use Docker
docker run -d -p 27017:27017 --name mongodb mongo:6.0
```

**Option B: MongoDB Atlas**
```bash
# Use cloud MongoDB Atlas
# Update MONGODB_URI in .env file
```

### 4. Start the Application

**Development Mode (Recommended for first run):**

```bash
# Terminal 1: Start Backend
cd backend
npm run dev

# Terminal 2: Start Frontend
npm run dev
```

**Production Mode:**

```bash
# Terminal 1: Start Backend
cd backend
npm start

# Terminal 2: Start Frontend
npm run build
npm run preview
```

### 5. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

## 🔧 Configuration

### Environment Variables

Create `backend/.env` with the following variables:

```bash
# Database
MONGODB_URI=mongodb://localhost:27017/autovolt
MONGODB_URI_FALLBACK=mongodb://localhost:27017/autovolt_backup

# Security
JWT_SECRET=your_very_secure_jwt_secret_here_minimum_32_characters_long
JWT_EXPIRE=7d
BCRYPT_ROUNDS=12

# Server
PORT=3001
NODE_ENV=development
HOST=0.0.0.0

# MQTT
MQTT_BROKER=localhost
MQTT_PORT=1883

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_WEBHOOK_URL=https://your-domain.com/api/telegram/webhook

# Email (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Admin User
ADMIN_EMAIL=admin@college.edu
ADMIN_PASSWORD=admin123456
ADMIN_NAME=System Administrator
```

## 📱 Using the Application

### 1. Initial Setup

1. **Access the application** at http://localhost:5173
2. **Login** with admin credentials (admin@college.edu / admin123456)
3. **Navigate to Settings** to configure your institution details

### 2. Device Management

1. **Add ESP32 Devices**:
   - Go to Devices → Add Device
   - Enter MAC address and device details
   - Configure switches and GPIO mappings

2. **Organize by Location**:
   - Create classrooms, buildings, floors
   - Assign devices to locations
   - Set up device groups

### 3. Schedule Management

1. **Create Schedules**:
   - Go to Schedules → Create Schedule
   - Set time-based rules
   - Assign to devices or groups

2. **Automated Control**:
   - Devices turn on/off automatically
   - Override manually when needed

### 4. Energy Monitoring

1. **View Analytics**:
   - Go to Analytics → Energy tab
   - Monitor real-time consumption
   - View cost analysis

2. **Calendar View**:
   - Click calendar icon for monthly overview
   - Color-coded usage indicators

### 5. Telegram Bot Control

1. **Setup Bot**:
   - Configure TELEGRAM_BOT_TOKEN in .env
   - Start bot with `/start` command

2. **Available Commands**:
   ```
   /register admin@college.edu  - Register admin user
   /devices                     - List all devices
   /status <device_id>          - Check device status
   /on <device_id> <switch_id>  - Turn switch on
   /off <device_id> <switch_id> - Turn switch off
   /schedule                    - View schedules
   ```

## 🔌 ESP32 Integration

### Hardware Requirements

- **ESP32 Development Board** (ESP32-WROOM-32)
- **Relay Modules** (for device control)
- **Push Buttons** (for manual override)
- **Power Supply** (5V/3.3V compatible)

### ESP32 Setup

1. **Flash Firmware**:
   ```bash
   # Use PlatformIO or Arduino IDE
   # Load the ESP32 firmware from platformio.ini
   ```

2. **Configure WiFi**:
   - Update WiFi credentials in firmware
   - Set MQTT broker address
   - Configure device secret

3. **Hardware Connections**:
   ```
   ESP32 GPIO 16-22 → Relay Modules
   ESP32 GPIO 25-32 → Manual Push Buttons
   Relay VCC → 5V Power Supply
   Relay GND → ESP32 GND
   ```

### Device Registration

1. **Get MAC Address** from ESP32 serial output
2. **Add Device** in web interface
3. **Configure Switches** with GPIO mappings
4. **Test Connection** - device should appear online

## 📊 Monitoring & Analytics

### Grafana Dashboards

1. **Start Monitoring Stack**:
   ```bash
   docker-compose -f docker-compose.monitoring.yml up -d
   ```

2. **Access Grafana**:
   - URL: http://localhost:3000
   - Username: admin
   - Password: IOT@098

3. **Available Dashboards**:
   - System Health Overview
   - Device Performance
   - Energy Consumption
   - API Response Times

### Prometheus Metrics

- **Metrics Endpoint**: http://localhost:3001/metrics
- **System Health**: http://localhost:3001/health
- **Custom Metrics**: Device status, energy consumption, API performance

## 🤖 AI/ML Features

### Starting AI Service

```bash
# Navigate to AI service directory
cd ai_ml_service

# Install Python dependencies
pip install -r requirements.txt

# Start the service
python app.py
```

### AI Features Available

1. **Energy Forecasting**:
   - Predict future consumption patterns
   - Optimize scheduling based on usage history

2. **Anomaly Detection**:
   - Identify unusual power consumption
   - Alert on potential equipment issues

3. **Smart Recommendations**:
   - Suggest optimal device configurations
   - Provide energy-saving recommendations

## 🐳 Docker Deployment

### Full Stack Deployment

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Individual Services

```bash
# Backend only
docker-compose up backend -d

# Frontend only
docker-compose up frontend -d

# Monitoring stack
docker-compose -f docker-compose.monitoring.yml up -d
```

## 🧪 Testing

### Running Tests

```bash
# Backend tests
cd backend
npm test

# Frontend tests
npm test

# End-to-end tests
npm run test:e2e
```

### Manual Testing Checklist

- [ ] User registration and login
- [ ] Device addition and configuration
- [ ] Switch control (on/off)
- [ ] Schedule creation and execution
- [ ] Energy monitoring dashboard
- [ ] Telegram bot commands
- [ ] Real-time WebSocket updates
- [ ] Mobile responsiveness

## 🔧 API Documentation

### REST API Endpoints

#### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout

#### Devices
- `GET /api/devices` - List all devices
- `POST /api/devices` - Add new device
- `PUT /api/devices/:id` - Update device
- `DELETE /api/devices/:id` - Delete device

#### Device Control
- `POST /api/devices/:id/control` - Control device switches
- `GET /api/devices/:id/status` - Get device status

#### Analytics
- `GET /api/analytics/energy-summary` - Energy consumption summary
- `GET /api/analytics/device-performance` - Device performance metrics
- `GET /api/analytics/cost-analysis` - Cost analysis data

#### Schedules
- `GET /api/schedules` - List schedules
- `POST /api/schedules` - Create schedule
- `PUT /api/schedules/:id` - Update schedule
- `DELETE /api/schedules/:id` - Delete schedule

### WebSocket Events

#### Client to Server
- `switch_intent` - Control individual switches
- `bulk_switch_intent` - Control multiple switches
- `join-room` - Join user-specific room

#### Server to Client
- `device_state_changed` - Device state updates
- `device_connected` - Device connection status
- `deviceStatusUpdate` - Legacy device status updates

## 🚨 Troubleshooting

### Common Issues

#### Backend Won't Start
```bash
# Check if port 3001 is available
netstat -ano | findstr :3001

# Kill process using port
taskkill /PID <PID> /F

# Check MongoDB connection
mongosh --eval "db.adminCommand('ping')"
```

#### Devices Not Connecting
```bash
# Check MQTT broker
netstat -ano | findstr :1883

# Verify ESP32 WiFi credentials
# Check device MAC address registration
# Review ESP32 serial output for errors
```

#### Telegram Bot Not Working
```bash
# Verify bot token in .env
# Check webhook URL configuration
# Test bot with /start command
```

#### High CPU/Memory Usage
```bash
# Check for memory leaks
# Monitor database connections
# Review application logs
# Consider adding more server resources
```

### Logs and Debugging

```bash
# Backend logs
cd backend
npm run dev  # Development with auto-restart

# View application logs
tail -f logs/app.log

# Database logs
mongosh --eval "db.serverStatus()"
```

## 📚 Additional Documentation

- [Energy Dashboard Guide](QUICK_START_ENERGY_DASHBOARD.md)
- [ESP32 Connection Setup](ESP8266_CONNECTION_FIX.md)
- [Grafana Setup Guide](COMPLETE_GRAFANA_GUIDE.md)
- [MQTT Configuration](mqttService.ts)
- [API Reference](backend/routes/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow ESLint configuration
- Write tests for new features
- Update documentation
- Use TypeScript for type safety
- Follow conventional commit messages

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **ESP32 Community** for IoT hardware support
- **MongoDB** for reliable database solutions
- **React Ecosystem** for modern web development
- **Open Source Community** for invaluable tools and libraries

## 📞 Support

For support and questions:
- **Issues**: [GitHub Issues](https://github.com/chandud1124/AutoVolt/issues)
- **Discussions**: [GitHub Discussions](https://github.com/chandud1124/AutoVolt/discussions)
- **Documentation**: Check the `/docs` directory

---

**Built with ❤️ for educational institutions worldwide**

*AutoVolt - Making classrooms smarter, one device at a time.*</content>
<parameter name="filePath">C:\Users\IOT\Downloads\aims_smart_class\new-autovolt\README.md