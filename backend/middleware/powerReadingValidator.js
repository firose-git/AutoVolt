const { logger } = require('./logger');

/**
 * Validation middleware for power readings
 * Ensures data integrity before processing
 */

// Configuration - can be moved to environment variables
const LIMITS = {
  VOLTAGE_MIN: 0,
  VOLTAGE_MAX: 300,      // Max 300V
  CURRENT_MIN: 0,
  CURRENT_MAX: 50,       // Max 50A
  POWER_MIN: 0,
  POWER_MAX: 15000,      // Max 15kW
  POWER_TOLERANCE: 0.15  // 15% tolerance for power calculation
};

/**
 * Validate a single power reading
 */
function validatePowerReading(req, res, next) {
  const { voltage, current, power, activeSwitches, totalSwitches } = req.body;
  const errors = [];

  // Validate voltage
  if (voltage === undefined || voltage === null) {
    errors.push('Voltage is required');
  } else if (typeof voltage !== 'number') {
    errors.push('Voltage must be a number');
  } else if (voltage < LIMITS.VOLTAGE_MIN || voltage > LIMITS.VOLTAGE_MAX) {
    errors.push(`Voltage out of range (${LIMITS.VOLTAGE_MIN}-${LIMITS.VOLTAGE_MAX}V). Received: ${voltage}V`);
  }

  // Validate current
  if (current === undefined || current === null) {
    errors.push('Current is required');
  } else if (typeof current !== 'number') {
    errors.push('Current must be a number');
  } else if (current < LIMITS.CURRENT_MIN || current > LIMITS.CURRENT_MAX) {
    errors.push(`Current out of range (${LIMITS.CURRENT_MIN}-${LIMITS.CURRENT_MAX}A). Received: ${current}A`);
  }

  // Validate power if provided
  if (power !== undefined && power !== null) {
    if (typeof power !== 'number') {
      errors.push('Power must be a number');
    } else if (power < LIMITS.POWER_MIN) {
      errors.push(`Power cannot be negative. Received: ${power}W`);
    } else if (power > LIMITS.POWER_MAX) {
      errors.push(`Power exceeds maximum (${LIMITS.POWER_MAX}W). Received: ${power}W`);
    }

    // Validate power calculation if voltage and current are valid
    if (voltage && current && !isNaN(voltage) && !isNaN(current)) {
      const calculated = voltage * current;
      const difference = Math.abs(power - calculated);
      const tolerance = calculated * LIMITS.POWER_TOLERANCE;

      if (difference > tolerance) {
        errors.push(
          `Power calculation mismatch. ` +
          `Provided: ${power}W, Calculated: ${calculated.toFixed(2)}W, ` +
          `Difference: ${difference.toFixed(2)}W (tolerance: ${tolerance.toFixed(2)}W)`
        );
      }
    }
  }

  // Validate switches if provided
  if (activeSwitches !== undefined) {
    if (typeof activeSwitches !== 'number' || activeSwitches < 0) {
      errors.push('activeSwitches must be a non-negative number');
    }
  }

  if (totalSwitches !== undefined) {
    if (typeof totalSwitches !== 'number' || totalSwitches < 0) {
      errors.push('totalSwitches must be a non-negative number');
    }
  }

  if (activeSwitches !== undefined && totalSwitches !== undefined) {
    if (activeSwitches > totalSwitches) {
      errors.push(`activeSwitches (${activeSwitches}) cannot exceed totalSwitches (${totalSwitches})`);
    }
  }

  // If there are validation errors, return 400
  if (errors.length > 0) {
    logger.warn('Power reading validation failed', {
      macAddress: req.params.macAddress,
      errors,
      data: req.body
    });

    return res.status(400).json({
      error: 'Validation failed',
      details: errors,
      received: {
        voltage,
        current,
        power,
        activeSwitches,
        totalSwitches
      }
    });
  }

  // Validation passed
  next();
}

/**
 * Validate bulk offline readings
 */
function validateOfflineReadings(req, res, next) {
  const { readings } = req.body;
  const errors = [];

  // Check if readings array exists
  if (!readings || !Array.isArray(readings)) {
    return res.status(400).json({
      error: 'Validation failed',
      details: ['readings must be an array']
    });
  }

  // Check array length
  if (readings.length === 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: ['readings array cannot be empty']
    });
  }

  // Check max readings limit
  const MAX_READINGS = process.env.MAX_SYNC_READINGS || 1000;
  if (readings.length > MAX_READINGS) {
    return res.status(400).json({
      error: 'Validation failed',
      details: [`Too many readings. Maximum: ${MAX_READINGS}, Received: ${readings.length}`]
    });
  }

  // Validate each reading
  readings.forEach((reading, index) => {
    const readingErrors = [];

    // Check required fields
    if (!reading.timestamp) {
      readingErrors.push(`timestamp is required`);
    } else {
      // Validate timestamp format
      const timestamp = new Date(reading.timestamp);
      if (isNaN(timestamp.getTime())) {
        readingErrors.push(`invalid timestamp format`);
      } else {
        // Check for future timestamps (clock drift)
        const now = Date.now();
        if (timestamp.getTime() > now + 60000) { // Allow 1 minute future
          readingErrors.push(`timestamp is in the future (possible clock drift)`);
        }
      }
    }

    // Validate voltage
    if (reading.voltage === undefined || reading.voltage === null) {
      readingErrors.push('voltage is required');
    } else if (reading.voltage < LIMITS.VOLTAGE_MIN || reading.voltage > LIMITS.VOLTAGE_MAX) {
      readingErrors.push(`voltage out of range (${LIMITS.VOLTAGE_MIN}-${LIMITS.VOLTAGE_MAX}V)`);
    }

    // Validate current
    if (reading.current === undefined || reading.current === null) {
      readingErrors.push('current is required');
    } else if (reading.current < LIMITS.CURRENT_MIN || reading.current > LIMITS.CURRENT_MAX) {
      readingErrors.push(`current out of range (${LIMITS.CURRENT_MIN}-${LIMITS.CURRENT_MAX}A)`);
    }

    // Validate power if provided
    if (reading.power !== undefined && reading.power !== null) {
      if (reading.power < LIMITS.POWER_MIN || reading.power > LIMITS.POWER_MAX) {
        readingErrors.push(`power out of range (${LIMITS.POWER_MIN}-${LIMITS.POWER_MAX}W)`);
      }
    }

    if (readingErrors.length > 0) {
      errors.push({
        index,
        timestamp: reading.timestamp,
        errors: readingErrors
      });
    }
  });

  // If there are validation errors in any reading
  if (errors.length > 0) {
    logger.warn('Offline readings validation failed', {
      macAddress: req.params.macAddress,
      totalReadings: readings.length,
      failedReadings: errors.length,
      errors: errors.slice(0, 10) // Log first 10 errors only
    });

    return res.status(400).json({
      error: 'Validation failed',
      totalReadings: readings.length,
      failedReadings: errors.length,
      details: errors.slice(0, 10), // Return first 10 errors
      message: errors.length > 10 ? `Showing first 10 of ${errors.length} errors` : undefined
    });
  }

  // Validation passed
  next();
}

/**
 * Validate checksum if provided (for data integrity)
 */
function validateChecksum(req, res, next) {
  const { readings, checksum } = req.body;

  if (checksum) {
    const crypto = require('crypto');
    const calculated = crypto
      .createHash('md5')
      .update(JSON.stringify(readings))
      .digest('hex');

    if (calculated !== checksum) {
      logger.error('Checksum mismatch - data may be corrupted', {
        macAddress: req.params.macAddress,
        expected: checksum,
        calculated
      });

      return res.status(400).json({
        error: 'Data integrity check failed',
        details: ['Checksum mismatch - data may be corrupted'],
        expected: checksum,
        calculated
      });
    }

    logger.info('Checksum validated successfully', {
      macAddress: req.params.macAddress,
      readingsCount: readings.length
    });
  }

  next();
}

module.exports = {
  validatePowerReading,
  validateOfflineReadings,
  validateChecksum,
  LIMITS
};
