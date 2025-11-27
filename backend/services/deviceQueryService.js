const Device = require('../models/Device');

class DeviceQueryService {
  // Handle device-related queries from Telegram
  static async handleDeviceQuery(chatId, query, telegramService, telegramUser) {
    try {
      // If no query provided, show numbered menu
      if (!query) {
        return await this.showDeviceQueryMenu(chatId, telegramService);
      }

      const lowerQuery = typeof query === 'string' ? query.toLowerCase().trim() : query;

      // Handle specific numbered queries
      switch (lowerQuery) {
        case 'offline':
        case '1':
          return await this.handleOfflineDevicesQuery(chatId, telegramService, telegramUser);

        case 'online':
        case '2':
          return await this.handleOnlineDevicesQuery(chatId, telegramService);

        case 'all':
        case '3':
          return await this.handleDeviceListQuery(chatId, telegramService);

        case 'status':
        case '4':
          return await this.handleDeviceStatusQuery(chatId, telegramService);

        case 'classrooms':
        case '5':
          return await this.handleClassroomDevicesQuery(chatId, telegramService);

        case 'maintenance':
        case '6':
          return await this.handleMaintenanceDevicesQuery(chatId, telegramService);

        default:
          // Handle natural language queries for backward compatibility
          if (typeof query === 'string') {
            return await this.handleNaturalLanguageQuery(chatId, query, telegramService, telegramUser);
          }

          return await telegramService.sendMessage(
            chatId,
            `❌ Invalid device query option.\n\nUse \`/devices\` to see available numbered options.`
          );
      }

    } catch (error) {
      console.error('Error handling device query:', error);
      return await telegramService.sendMessage(
        chatId,
        'Sorry, I encountered an error while processing your device query.'
      );
    }
  }

  // Show device query menu with numbered options
  static async showDeviceQueryMenu(chatId, telegramService) {
    const options = telegramService.getDeviceQueryOptions();
    const queryList = Object.entries(options)
      .map(([num, option]) => `${num}. ${option.name} - ${option.description}`)
      .join('\n');

    return await telegramService.sendMessage(
      chatId,
      `🔧 *Device Management Menu*\n\n${queryList}\n\n` +
      `💡 *How to use:*\n` +
      `• Type a number: \`/devices 1\` (for Offline Devices)\n` +
      `• Or use the command: \`/devices offline\`\n\n` +
      `Example: \`/devices 4\` for Device Status Summary`
    );
  }

  // Handle online devices query
  static async handleOnlineDevicesQuery(chatId, telegramService) {
    try {
      const onlineDevices = await Device.find({ status: 'online' }).sort({ name: 1 });

      if (onlineDevices.length === 0) {
        return await telegramService.sendMessage(chatId, '❌ No devices are currently online.');
      }

      let message = `🟢 *Online Devices* (${onlineDevices.length})\n\n`;

      onlineDevices.forEach(device => {
        const classroom = device.classroom || 'Unknown';
        const lastSeen = device.lastSeen ?
          new Date(device.lastSeen).toLocaleString() : 'Unknown';
        message += `• *${device.name}*\n  Classroom: ${classroom}\n  Last seen: ${lastSeen}\n\n`;
      });

      return await telegramService.sendMessage(chatId, message);
    } catch (error) {
      console.error('Error in online devices query:', error);
      return await telegramService.sendMessage(chatId, 'Error retrieving online devices.');
    }
  }

  // Handle classroom devices query (grouped by classroom)
  static async handleClassroomDevicesQuery(chatId, telegramService) {
    try {
      const devices = await Device.find({}).sort({ classroom: 1, name: 1 });

      if (devices.length === 0) {
        return await telegramService.sendMessage(chatId, 'No devices found in the system.');
      }

      // Group devices by classroom
      const classroomGroups = {};
      devices.forEach(device => {
        const classroom = device.classroom || 'Unknown';
        if (!classroomGroups[classroom]) {
          classroomGroups[classroom] = [];
        }
        classroomGroups[classroom].push(device);
      });

      let message = `🏫 *Devices by Classroom*\n\n`;

      Object.keys(classroomGroups).sort().forEach(classroom => {
        const devicesInClassroom = classroomGroups[classroom];
        const onlineCount = devicesInClassroom.filter(d => d.status === 'online').length;
        const totalCount = devicesInClassroom.length;

        message += `*${classroom}:* ${onlineCount}/${totalCount} online\n`;

        devicesInClassroom.forEach(device => {
          const status = device.status === 'online' ? '🟢' : '🔴';
          message += `  ${status} ${device.name}\n`;
        });

        message += `\n`;
      });

      return await telegramService.sendMessage(chatId, message);
    } catch (error) {
      console.error('Error in classroom devices query:', error);
      return await telegramService.sendMessage(chatId, 'Error retrieving classroom devices.');
    }
  }

  // Handle maintenance devices query
  static async handleMaintenanceDevicesQuery(chatId, telegramService) {
    try {
      // Find devices that might need maintenance (offline for more than 24 hours)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const maintenanceDevices = await Device.find({
        $or: [
          { status: 'offline' },
          { lastSeen: { $lt: oneDayAgo } }
        ]
      }).sort({ lastSeen: -1 });

      if (maintenanceDevices.length === 0) {
        return await telegramService.sendMessage(chatId, '🎉 All devices are in good condition!');
      }

      let message = `🔧 *Devices Needing Attention* (${maintenanceDevices.length})\n\n`;

      maintenanceDevices.forEach(device => {
        const status = device.status === 'online' ? '🟢 Online' : '🔴 Offline';
        const lastSeen = device.lastSeen ?
          new Date(device.lastSeen).toLocaleString() : 'Never';
        const classroom = device.classroom || 'Unknown';
        const daysSinceLastSeen = device.lastSeen ?
          Math.floor((Date.now() - new Date(device.lastSeen)) / (1000 * 60 * 60 * 24)) : 'Unknown';

        message += `• *${device.name}*\n`;
        message += `  Status: ${status}\n`;
        message += `  Classroom: ${classroom}\n`;
        message += `  Last seen: ${lastSeen}\n`;
        if (daysSinceLastSeen !== 'Unknown' && daysSinceLastSeen > 0) {
          message += `  Days offline: ${daysSinceLastSeen}\n`;
        }
        message += `\n`;
      });

      return await telegramService.sendMessage(chatId, message);
    } catch (error) {
      console.error('Error in maintenance devices query:', error);
      return await telegramService.sendMessage(chatId, 'Error retrieving maintenance devices.');
    }
  }

  // Handle natural language queries (backward compatibility)
  static async handleNaturalLanguageQuery(chatId, query, telegramService, telegramUser) {
    const lowerQuery = query.toLowerCase().trim();

    // Handle specific device queries
    if (lowerQuery.includes('status') || lowerQuery.includes('what')) {
      return await this.handleDeviceStatusQuery(chatId, query, telegramService);
    }

    // Handle offline devices query
    if (lowerQuery.includes('offline')) {
      return await this.handleOfflineDevicesQuery(chatId, telegramService, telegramUser);
    }

    // Handle device list query
    if (lowerQuery.includes('list') || lowerQuery.includes('show') || lowerQuery.includes('all')) {
      return await this.handleDeviceListQuery(chatId, telegramService);
    }

    // Handle specific device queries
    const deviceName = this.extractDeviceName(query);
    if (deviceName) {
      return await this.handleSpecificDeviceQuery(chatId, deviceName, telegramService);
    }

    // Handle classroom queries
    const classroom = this.extractClassroom(query);
    if (classroom) {
      return await this.handleClassroomQuery(chatId, classroom, telegramService);
    }

    // Default response
    return await telegramService.sendMessage(
      chatId,
      `I can help you with device queries! Try asking:\n\n` +
      `• "Show offline devices"\n` +
      `• "What's the status of Computer_Lab?"\n` +
      `• "Devices in LH_19g"\n` +
      `• "List all devices"\n\n` +
      `Or use numbered options: \`/devices\` to see the menu!`
    );
  }

  // Handle offline devices query
  static async handleOfflineDevicesQuery(chatId, telegramService, telegramUser) {
    try {
      const offlineDevices = await Device.find({ status: 'offline' }).sort({ lastSeen: -1 });

      if (offlineDevices.length === 0) {
        return await telegramService.sendMessage(chatId, '🎉 All devices are currently online!');
      }

      let message = `🔴 *Offline Devices* (${offlineDevices.length})\n\n`;

      offlineDevices.forEach(device => {
        const lastSeen = device.lastSeen ?
          new Date(device.lastSeen).toLocaleString() : 'Never';
        const classroom = device.classroom || 'Unknown';
        message += `• *${device.name}*\n  Classroom: ${classroom}\n  Last seen: ${lastSeen}\n\n`;
      });

      // If user is subscribed to device alerts, mention that notifications are being sent
      if (telegramUser && telegramUser.roleSubscriptions.includes('deviceOffline')) {
        message += `📢 You are subscribed to offline device notifications. You'll receive alerts when devices go offline.`;
      }

      return await telegramService.sendMessage(chatId, message);
    } catch (error) {
      console.error('Error in offline devices query:', error);
      return await telegramService.sendMessage(chatId, 'Error retrieving offline devices.');
    }
  }

  // Handle device list query
  static async handleDeviceListQuery(chatId, telegramService) {
    try {
      const devices = await Device.find({}).sort({ name: 1 });

      if (devices.length === 0) {
        return await telegramService.sendMessage(chatId, 'No devices found in the system.');
      }

      let message = `📋 *All Devices* (${devices.length})\n\n`;

      devices.forEach(device => {
        const status = device.status === 'online' ? '🟢' : '🔴';
        const classroom = device.classroom || 'Unknown';
        message += `${status} ${device.name} (${classroom})\n`;
      });

      return await telegramService.sendMessage(chatId, message);
    } catch (error) {
      console.error('Error in device list query:', error);
      return await telegramService.sendMessage(chatId, 'Error retrieving device list.');
    }
  }

  // Handle specific device query
  static async handleSpecificDeviceQuery(chatId, deviceName, telegramService) {
    try {
      const device = await Device.findOne({
        name: { $regex: deviceName, $options: 'i' }
      });

      if (!device) {
        // Try partial match
        const devices = await Device.find({
          name: { $regex: deviceName, $options: 'i' }
        }).limit(5);

        if (devices.length === 0) {
          return await telegramService.sendMessage(
            chatId,
            `❌ Device "${deviceName}" not found.\n\nTry "list all devices" to see available devices.`
          );
        }

        let message = `🔍 *Similar Devices Found:*\n\n`;
        devices.forEach(d => {
          const status = d.status === 'online' ? '🟢 Online' : '🔴 Offline';
          message += `• ${d.name} - ${status}\n`;
        });

        return await telegramService.sendMessage(chatId, message);
      }

      const status = device.status === 'online' ? '🟢 Online' : '🔴 Offline';
      const lastSeen = device.lastSeen ?
        new Date(device.lastSeen).toLocaleString() : 'Never';
      const classroom = device.classroom || 'Unknown';

      let message = `📱 *Device: ${device.name}*\n\n`;
      message += `Status: ${status}\n`;
      message += `Classroom: ${classroom}\n`;
      message += `MAC Address: ${device.macAddress}\n`;
      message += `Last Heartbeat: ${lastSeen}\n`;

      if (device.switches && device.switches.length > 0) {
        message += `\n*Switch States:*\n`;
        device.switches.forEach((switchInfo, index) => {
          const switchStatus = switchInfo.state ? 'ON' : 'OFF';
          message += `• GPIO ${switchInfo.gpio || (16 + index)}: ${switchStatus}\n`;
        });
      }

      return await telegramService.sendMessage(chatId, message);
    } catch (error) {
      console.error('Error in specific device query:', error);
      return await telegramService.sendMessage(chatId, 'Error retrieving device information.');
    }
  }

  // Handle classroom query
  static async handleClassroomQuery(chatId, classroom, telegramService) {
    try {
      const devices = await Device.find({
        classroom: { $regex: classroom, $options: 'i' }
      }).sort({ name: 1 });

      if (devices.length === 0) {
        return await telegramService.sendMessage(
          chatId,
          `❌ No devices found in classroom "${classroom}".`
        );
      }

      let message = `🏫 *Devices in ${classroom}* (${devices.length})\n\n`;

      devices.forEach(device => {
        const status = device.status === 'online' ? '🟢' : '🔴';
        message += `${status} ${device.name}\n`;
      });

      return await telegramService.sendMessage(chatId, message);
    } catch (error) {
      console.error('Error in classroom query:', error);
      return await telegramService.sendMessage(chatId, 'Error retrieving classroom devices.');
    }
  }

  // Extract device name from query
  static extractDeviceName(query) {
    const lowerQuery = query.toLowerCase();

    // Common device names
    const deviceNames = [
      'computer_lab', 'iot_lab', 'lh_19g', 'lh_28', 'lh_d_28',
      'classroom_1', 'classroom_2', 'lab_1', 'lab_2'
    ];

    for (const name of deviceNames) {
      if (lowerQuery.includes(name.replace(/_/g, ' ')) || lowerQuery.includes(name)) {
        return name;
      }
    }

    return null;
  }

  // Extract classroom from query
  static extractClassroom(query) {
    const lowerQuery = query.toLowerCase();

    // Common classroom patterns
    const classroomPatterns = [
      /classroom\s+(\w+)/i,
      /room\s+(\w+)/i,
      /lh[_ ]?(\w+)/i,
      /lab[_ ]?(\w+)/i
    ];

    for (const pattern of classroomPatterns) {
      const match = query.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }
}

module.exports = DeviceQueryService;