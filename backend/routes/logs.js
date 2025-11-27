const express = require('express');
const router = express.Router();
const ActivityLog = require('../models/ActivityLog');
const ManualSwitchLog = require('../models/ManualSwitchLog');
const DeviceStatusLog = require('../models/DeviceStatusLog');
const ExcelJS = require('exceljs');

// GET /api/logs/activities
router.get('/activities', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      search,
      deviceId,
      startDate,
      endDate,
      severity,
      resolved
    } = req.query;

    const query = {};
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query
    if (deviceId && deviceId !== 'all') {
      query.deviceId = deviceId;
    }
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }
    if (search) {
      query.$or = [
        { deviceName: { $regex: search, $options: 'i' } },
        { switchName: { $regex: search, $options: 'i' } },
        { userName: { $regex: search, $options: 'i' } },
        { action: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Include all activity types including manual switches in active logs

    const logs = await ActivityLog.find(query)
      .populate('deviceId', 'name location')
      .populate('userId', 'name')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ActivityLog.countDocuments(query);

    const formattedLogs = logs.map(log => {
      // Normalize newState for activity logs so UI can render ON/OFF badges consistently.
      const deriveState = () => {
        // Prefer explicit context.newState (from ESP telemetry)
        if (log.context && typeof log.context.newState !== 'undefined' && log.context.newState !== null) {
          const ns = String(log.context.newState).toLowerCase();
          return (ns === 'on' || ns === 'true' || ns === '1') ? 'on' : 'off';
        }
        // Prefer top-level newState if present
        if (typeof log.newState !== 'undefined' && log.newState !== null) {
          const ns = String(log.newState).toLowerCase();
          return (ns === 'on' || ns === 'true' || ns === '1') ? 'on' : 'off';
        }
        // Fall back to interpreting action values (manual_on/manual_off/on/off/toggle)
        if (log.action) {
          const act = String(log.action).toLowerCase();
          if (act === 'on' || act === 'manual_on' || act.endsWith('_on')) return 'on';
          if (act === 'off' || act === 'manual_off' || act.endsWith('_off')) return 'off';
          if (act.includes('toggle')) return 'on'; // default display for toggle
        }
        return undefined;
      };

      const normalizedNewState = deriveState();

      return {
        id: log._id,
        timestamp: log.timestamp,
        action: log.action,
        deviceId: log.deviceId?._id,
        deviceName: log.deviceName || log.deviceId?.name,
        switchId: log.switchId,
        switchName: log.switchName,
        userId: log.userId?._id,
        userName: log.userName || log.userId?.name,
        triggeredBy: log.triggeredBy,
        location: log.location || log.deviceId?.location,
        isManualOverride: log.isManualOverride,
        previousState: log.previousState,
        newState: normalizedNewState,
        conflictResolution: log.conflictResolution,
        details: log.details,
        context: log.context
      };
    });

    res.json({
      logs: formattedLogs,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
});

// GET /api/logs/manual-switches
router.get('/manual-switches', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      search,
      deviceId,
      startDate,
      endDate
    } = req.query;

    const query = {};
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Only show manual switch activities
    query.triggeredBy = 'manual_switch';

    if (deviceId && deviceId !== 'all') {
      query.deviceId = deviceId;
    }
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }
    if (search) {
      query.$or = [
        { deviceName: { $regex: search, $options: 'i' } },
        { switchName: { $regex: search, $options: 'i' } },
        { action: { $regex: search, $options: 'i' } }
      ];
    }

    // Query ActivityLog for manual switch entries (primary source)
    const logs = await ActivityLog.find(query)
      .populate('deviceId', 'name location switches')
      .populate('userId', 'name')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ActivityLog.countDocuments(query);

    const formattedLogs = logs.map(log => {
      // Try to get GPIO from context telemetry or from device switches
      let gpioPin = log.context?.telemetry?.gpio || log.context?.telemetry?.physicalPin || null;
      if (!gpioPin && log.deviceId && log.deviceId.switches) {
        const switchInfo = log.deviceId.switches.find(sw => String(sw._id) === String(log.switchId) || sw.name === log.switchName);
        if (switchInfo) {
          gpioPin = switchInfo.manualSwitchEnabled ? switchInfo.manualSwitchGpio : (switchInfo.relayGpio || switchInfo.gpio);
        }
      }

      // Derive state from action or context
      const deriveState = () => {
        if (log.context && typeof log.context.newState !== 'undefined' && log.context.newState !== null) {
          const ns = String(log.context.newState).toLowerCase();
          return (ns === 'on' || ns === 'true' || ns === '1') ? 'on' : 'off';
        }
        if (typeof log.newState !== 'undefined' && log.newState !== null) {
          const ns = String(log.newState).toLowerCase();
          return (ns === 'on' || ns === 'true' || ns === '1') ? 'on' : 'off';
        }
        // Fallback to action parsing
        if (log.action) {
          const act = String(log.action).toLowerCase();
          if (act.includes('on') || act.includes('_on')) return 'on';
          if (act.includes('off') || act.includes('_off')) return 'off';
        }
        return 'off';
      };

      return {
        id: log._id,
        timestamp: log.timestamp,
        deviceId: log.deviceId?._id,
        deviceName: log.deviceName || log.deviceId?.name,
        switchId: log.switchId,
        switchName: log.switchName,
        gpioPin: gpioPin,
        action: log.action,
        previousState: log.previousState || log.context?.previousState || 'unknown',
        newState: deriveState(),
        conflictWith: log.conflictWith || undefined,
        responseTime: log.responseTime,
        location: log.location || log.deviceId?.location,
        details: log.context || log.details
      };
    });

    res.json({
      logs: formattedLogs,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('Error fetching manual switch logs:', error);
    res.status(500).json({ error: 'Failed to fetch manual switch logs' });
  }
});

// GET /api/logs/device-status
router.get('/device-status', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      search,
      deviceId,
      startDate,
      endDate
    } = req.query;

    const query = {};
    const skip = (parseInt(page) - 1) * parseInt(limit);

    if (deviceId && deviceId !== 'all') {
      query.deviceId = deviceId;
    }
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }
    if (search) {
      query.$or = [
        { deviceName: { $regex: search, $options: 'i' } },
        { deviceMac: { $regex: search, $options: 'i' } }
      ];
    }

    const logs = await DeviceStatusLog.find(query)
      .populate('deviceId', 'name location macAddress')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await DeviceStatusLog.countDocuments(query);

    const formattedLogs = logs.map(log => ({
      id: log._id,
      timestamp: log.timestamp,
      deviceId: log.deviceId?._id,
      deviceName: log.deviceName || log.deviceId?.name,
      deviceMac: log.deviceMac || log.deviceId?.macAddress,
      checkType: log.checkType,
      deviceStatus: log.deviceStatus,
      switchStates: log.switchStates,
      alerts: log.alerts,
      summary: log.summary,
      location: log.location || log.deviceId?.location
    }));

    res.json({
      logs: formattedLogs,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('Error fetching device status logs:', error);
    res.status(500).json({ error: 'Failed to fetch device status logs' });
  }
});

// GET /api/logs/web-switches
router.get('/web-switches', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      search,
      deviceId,
      startDate,
      endDate
    } = req.query;

    const query = {};
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Only show web switch activities (triggered by user from web interface)
    query.triggeredBy = 'user';

    if (deviceId && deviceId !== 'all') {
      query.deviceId = deviceId;
    }
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }
    if (search) {
      query.$or = [
        { deviceName: { $regex: search, $options: 'i' } },
        { switchName: { $regex: search, $options: 'i' } },
        { userName: { $regex: search, $options: 'i' } },
        { action: { $regex: search, $options: 'i' } }
      ];
    }

    const logs = await ActivityLog.find(query)
      .populate('deviceId', 'name location')
      .populate('userId', 'name')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ActivityLog.countDocuments(query);

    const formattedLogs = logs.map(log => ({
      id: log._id,
      timestamp: log.timestamp,
      deviceId: log.deviceId?._id,
      deviceName: log.deviceName || log.deviceId?.name,
      switchId: log.switchId,
      switchName: log.switchName,
      userId: log.userId?._id,
      userName: log.userName || log.userId?.name,
      ipAddress: log.ip,
      newState: log.action,
      location: log.location || log.deviceId?.location,
      details: log.context || log.details
    }));

    res.json({
      logs: formattedLogs,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('Error fetching web switch logs:', error);
    res.status(500).json({ error: 'Failed to fetch web switch logs' });
  }
});

// GET /api/logs/schedule-switches
router.get('/schedule-switches', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      search,
      deviceId,
      startDate,
      endDate
    } = req.query;

    const query = {};
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Only show scheduled switch activities
    query.triggeredBy = 'schedule';

    if (deviceId && deviceId !== 'all') {
      query.deviceId = deviceId;
    }
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }
    if (search) {
      query.$or = [
        { deviceName: { $regex: search, $options: 'i' } },
        { switchName: { $regex: search, $options: 'i' } },
        { action: { $regex: search, $options: 'i' } }
      ];
    }

    const logs = await ActivityLog.find(query)
      .populate('deviceId', 'name location')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ActivityLog.countDocuments(query);

    const formattedLogs = logs.map(log => ({
      id: log._id,
      timestamp: log.timestamp,
      deviceId: log.deviceId?._id,
      deviceName: log.deviceName || log.deviceId?.name,
      switchId: log.switchId,
      switchName: log.switchName,
      scheduleName: log.context?.scheduleName || 'Unknown Schedule',
      triggerTime: log.context?.scheduledTime || log.timestamp,
      newState: log.action,
      location: log.location || log.deviceId?.location,
      details: log.context || log.details
    }));

    res.json({
      logs: formattedLogs,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('Error fetching log stats:', error);
    res.status(500).json({ error: 'Failed to fetch log stats' });
  }
});

// GET /api/logs/stats
router.get('/stats', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get stats for all log types
    const [
      activitiesTotal,
      activitiesToday,
      manualSwitchesTotal,
      manualSwitchesToday,
      manualSwitchesConflicts,
      webSwitchesTotal,
      webSwitchesToday,
      scheduleSwitchesTotal,
      scheduleSwitchesToday,
      deviceStatusTotal,
      deviceStatusToday
    ] = await Promise.all([
      // Activities
      ActivityLog.countDocuments(),
      ActivityLog.countDocuments({ timestamp: { $gte: today, $lt: tomorrow } }),
      
      // Manual switches (triggeredBy: 'manual_switch')
      ActivityLog.countDocuments({ triggeredBy: 'manual_switch' }),
      ActivityLog.countDocuments({ triggeredBy: 'manual_switch', timestamp: { $gte: today, $lt: tomorrow } }),
      ActivityLog.countDocuments({ triggeredBy: 'manual_switch', conflictResolution: { $exists: true } }),
      
      // Web switches (triggeredBy: 'user')
      ActivityLog.countDocuments({ triggeredBy: 'user' }),
      ActivityLog.countDocuments({ triggeredBy: 'user', timestamp: { $gte: today, $lt: tomorrow } }),
      
      // Schedule switches (triggeredBy: 'schedule')
      ActivityLog.countDocuments({ triggeredBy: 'schedule' }),
      ActivityLog.countDocuments({ triggeredBy: 'schedule', timestamp: { $gte: today, $lt: tomorrow } }),
      
      // Device status
      DeviceStatusLog.countDocuments(),
      DeviceStatusLog.countDocuments({ timestamp: { $gte: today, $lt: tomorrow } })
    ]);

    const stats = {
      activities: {
        total: activitiesTotal,
        today: activitiesToday
      },
      manualSwitches: {
        total: manualSwitchesTotal,
        today: manualSwitchesToday,
        conflicts: manualSwitchesConflicts
      },
      webSwitches: {
        total: webSwitchesTotal,
        today: webSwitchesToday
      },
      scheduleSwitches: {
        total: scheduleSwitchesTotal,
        today: scheduleSwitchesToday
      },
      deviceStatus: {
        total: deviceStatusTotal,
        today: deviceStatusToday
      }
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching log stats:', error);
    res.status(500).json({ error: 'Failed to fetch log stats' });
  }
});

// POST /api/logs/export/excel
router.post('/export/excel', async (req, res) => {
  try {
    const {
      type,
      search,
      deviceId,
      startDate,
      endDate
    } = req.query;

    if (!type) {
      return res.status(400).json({ error: 'Type parameter is required' });
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`${type.charAt(0).toUpperCase() + type.slice(1)} Logs`);

    let logs = [];
    let headers = [];

    // Set headers and fetch data based on type
    switch (type) {
      case 'activities':
        headers = ['Time', 'Action', 'Device', 'Switch', 'User', 'Location'];
        logs = await getActivityLogs({ search, deviceId, startDate, endDate });
        break;
      case 'manual-switches':
        headers = ['Time', 'Device', 'Switch', 'GPIO Pin', 'Action', 'Location'];
        logs = await getManualSwitchLogs({ search, deviceId, startDate, endDate });
        break;
      case 'web-switches':
        headers = ['Time', 'Device', 'Switch', 'User', 'IP Address', 'Action', 'Location'];
        logs = await getWebSwitchLogs({ search, deviceId, startDate, endDate });
        break;
      case 'schedule-switches':
        headers = ['Time', 'Device', 'Switch', 'Schedule', 'Trigger Time', 'Action', 'Location'];
        logs = await getScheduleSwitchLogs({ search, deviceId, startDate, endDate });
        break;
      case 'device-status':
        headers = ['Time', 'Device', 'Online Status', 'Signal Strength', 'Temperature', 'Switches On/Off', 'Alerts', 'Response Time'];
        logs = await getDeviceStatusLogs({ search, deviceId, startDate, endDate });
        break;
      default:
        return res.status(400).json({ error: 'Invalid type parameter' });
    }

    // Add headers
    worksheet.addRow(headers);

    // Style headers
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6FA' }
    };

    // Add data rows
    logs.forEach(log => {
      worksheet.addRow(log);
    });

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = Math.max(15, (column.values?.reduce((max, value) =>
        Math.max(max, String(value || '').length), 0) || 15));
    });

    // Set response headers
    const fileName = `${type}-logs-${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    // Write to response
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Error exporting logs to Excel:', error);
    res.status(500).json({ error: 'Failed to export logs' });
  }
});

// Helper functions to get data for export
async function getActivityLogs(filters) {
  const { search, deviceId, startDate, endDate } = filters;
  const query = {};

  if (deviceId && deviceId !== 'all') {
    query.deviceId = deviceId;
  }
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }
  if (search) {
    query.$or = [
      { deviceName: { $regex: search, $options: 'i' } },
      { switchName: { $regex: search, $options: 'i' } },
      { userName: { $regex: search, $options: 'i' } },
      { action: { $regex: search, $options: 'i' } }
    ];
  }

  const logs = await ActivityLog.find(query)
    .populate('deviceId', 'name location')
    .populate('userId', 'name')
    .sort({ timestamp: -1 })
    .limit(10000); // Limit to prevent memory issues

  return logs.map(log => [
    formatTimestamp(log.timestamp),
    log.action || 'unknown',
    log.deviceName || log.deviceId?.name || '-',
    log.switchName || '-',
    log.userName || log.userId?.name || '-',
    log.location || log.deviceId?.location || '-'
  ]);
}

async function getManualSwitchLogs(filters) {
  const { search, deviceId, startDate, endDate } = filters;
  const query = { triggeredBy: 'manual_switch' };

  if (deviceId && deviceId !== 'all') {
    query.deviceId = deviceId;
  }
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }
  if (search) {
    query.$or = [
      { deviceName: { $regex: search, $options: 'i' } },
      { switchName: { $regex: search, $options: 'i' } },
      { action: { $regex: search, $options: 'i' } }
    ];
  }

  const logs = await ActivityLog.find(query)
    .populate('deviceId', 'name location switches')
    .sort({ timestamp: -1 })
    .limit(10000);

  return logs.map(log => {
    let gpioPin = null;
    if (log.deviceId && log.deviceId.switches) {
      const switchInfo = log.deviceId.switches.find(sw => sw.name === log.switchName);
      if (switchInfo) {
        gpioPin = switchInfo.manualSwitchEnabled ? switchInfo.manualSwitchGpio : switchInfo.gpio;
      }
    }

    // Determine manual action and newState robustly (same logic as the API endpoint).
    let manualAction = 'manual_toggle';
    let newState = 'off';

    if (typeof log.newState !== 'undefined' && log.newState !== null) {
      const ns = String(log.newState).toLowerCase();
      newState = (ns === 'on' || ns === 'true') ? 'on' : 'off';
    } else if (log.context && typeof log.context.newState !== 'undefined' && log.context.newState !== null) {
      const ns = String(log.context.newState).toLowerCase();
      newState = (ns === 'on' || ns === 'true') ? 'on' : 'off';
    }

    if (log.action) {
      const act = String(log.action).toLowerCase();
      if (act === 'on' || act === 'manual_on' || act.endsWith('_on')) {
        manualAction = act.startsWith('manual') ? act : 'manual_on';
        newState = 'on';
      } else if (act === 'off' || act === 'manual_off' || act.endsWith('_off')) {
        manualAction = act.startsWith('manual') ? act : 'manual_off';
        newState = 'off';
      } else if (act.includes('toggle')) {
        manualAction = act.startsWith('manual') ? act : 'manual_toggle';
        if (typeof log.newState === 'undefined' && !(log.context && typeof log.context.newState !== 'undefined')) {
          newState = 'on';
        }
      } else if (act.includes('manual')) {
        manualAction = act;
      }
    }

    return [
      formatTimestamp(log.timestamp),
      log.deviceName || log.deviceId?.name || 'Unknown Device',
      log.switchName || 'Unknown Switch',
      gpioPin || 'N/A',
      newState === 'on' ? 'ON' : 'OFF',
      log.location || log.deviceId?.location || '-'
    ];
  });
}

async function getWebSwitchLogs(filters) {
  const { search, deviceId, startDate, endDate } = filters;
  const query = { triggeredBy: 'user' };

  if (deviceId && deviceId !== 'all') {
    query.deviceId = deviceId;
  }
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }
  if (search) {
    query.$or = [
      { deviceName: { $regex: search, $options: 'i' } },
      { switchName: { $regex: search, $options: 'i' } },
      { userName: { $regex: search, $options: 'i' } },
      { action: { $regex: search, $options: 'i' } }
    ];
  }

  const logs = await ActivityLog.find(query)
    .populate('deviceId', 'name location')
    .populate('userId', 'name')
    .sort({ timestamp: -1 })
    .limit(10000);

  return logs.map(log => [
    formatTimestamp(log.timestamp),
    log.deviceName || log.deviceId?.name || 'Unknown Device',
    log.switchName || 'Unknown Switch',
    log.userName || log.userId?.name || 'Unknown User',
    log.ip || '-',
    log.action === 'on' ? 'ON' : 'OFF',
    log.location || log.deviceId?.location || '-'
  ]);
}

async function getScheduleSwitchLogs(filters) {
  const { search, deviceId, startDate, endDate } = filters;
  const query = { triggeredBy: 'schedule' };

  if (deviceId && deviceId !== 'all') {
    query.deviceId = deviceId;
  }
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }
  if (search) {
    query.$or = [
      { deviceName: { $regex: search, $options: 'i' } },
      { switchName: { $regex: search, $options: 'i' } },
      { action: { $regex: search, $options: 'i' } }
    ];
  }

  const logs = await ActivityLog.find(query)
    .populate('deviceId', 'name location')
    .sort({ timestamp: -1 })
    .limit(10000);

  return logs.map(log => [
    formatTimestamp(log.timestamp),
    log.deviceName || log.deviceId?.name || 'Unknown Device',
    log.switchName || 'Unknown Switch',
    log.context?.scheduleName || 'Unknown Schedule',
    formatTimestamp(log.context?.scheduledTime || log.timestamp),
    log.action === 'on' ? 'ON' : 'OFF',
    log.location || log.deviceId?.location || '-'
  ]);
}

async function getDeviceStatusLogs(filters) {
  const { search, deviceId, startDate, endDate } = filters;
  const query = {};

  if (deviceId && deviceId !== 'all') {
    query.deviceId = deviceId;
  }
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }
  if (search) {
    query.$or = [
      { deviceName: { $regex: search, $options: 'i' } },
      { deviceMac: { $regex: search, $options: 'i' } }
    ];
  }

  const logs = await DeviceStatusLog.find(query)
    .populate('deviceId', 'name location macAddress')
    .sort({ timestamp: -1 })
    .limit(10000);

  return logs.map(log => [
    formatTimestamp(log.timestamp),
    log.deviceName || log.deviceId?.name || '-',
    log.deviceStatus?.isOnline ? 'Online' : 'Offline',
    log.deviceStatus?.wifiSignalStrength ? `${log.deviceStatus.wifiSignalStrength}dBm` : '-',
    log.deviceStatus?.temperature ? `${log.deviceStatus.temperature}°C` : '-',
    log.summary ? `${log.summary.totalSwitchesOn || 0}/${log.summary.totalSwitchesOff || 0}` : '-',
    log.alerts && log.alerts.length > 0 ? log.alerts.length.toString() : 'No Alerts',
    log.deviceStatus?.responseTime ? `${log.deviceStatus.responseTime}ms` : '-'
  ]);
}

function formatTimestamp(timestamp) {
  if (!timestamp) return '-';
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleString();
  } catch (error) {
    return '-';
  }
}

module.exports = router;