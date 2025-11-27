const { logger } = require('./logger');

// Custom error classes
class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400);
    this.details = details;
  }
}

class DatabaseError extends AppError {
  constructor(message, originalError = null) {
    super(message, 500);
    this.originalError = originalError;
  }
}

class MQTTError extends AppError {
  constructor(message, originalError = null) {
    super(message, 503);
    this.originalError = originalError;
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403);
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
  }
}

class DeviceNotIdentifiedError extends AppError {
  constructor(message = 'Device is not identified/connected') {
    super(message, 409);
    this.name = 'DeviceNotIdentifiedError';
  }
}

class DeviceOfflineError extends AppError {
  constructor(message = 'Device is currently offline') {
    super(message, 409);
    this.name = 'DeviceOfflineError';
  }
}

const errorTypes = {
    DEVICE_NOT_IDENTIFIED: {
        code: 'device_not_identified',
        status: 409,
        message: 'Device is not identified/connected'
    },
    DEVICE_OFFLINE: {
        code: 'device_offline',
        status: 409,
        message: 'Device is currently offline'
    },
    INVALID_STATE: {
        code: 'invalid_state',
        status: 400,
        message: 'Invalid device state'
    },
    OPERATION_TIMEOUT: {
        code: 'operation_timeout',
        status: 408,
        message: 'Operation timed out'
    }
};

const errorHandler = (err, req, res, next) => {
    // Log error details
    logger.error('Error:', {
        name: err.name,
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        body: req.body,
        user: req.user ? { id: req.user.id, role: req.user.role } : null
    });

    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Validation Error',
            details: Object.values(err.errors).map(e => e.message)
        });
    }

    if (err.name === 'MongoError' || err.name === 'MongoServerError') {
        if (err.code === 11000) {
            return res.status(400).json({
                error: 'Duplicate Error',
                message: 'A record with that information already exists'
            });
        }
    }

    if (err.name === 'DeviceNotIdentifiedError') {
        return res.status(409).json({
            error: 'Device Not Identified',
            code: 'device_not_identified',
            message: 'Device is not identified/connected. Please wait for the device to connect and try again.'
        });
    }

    if (err.name === 'DeviceOfflineError') {
        return res.status(409).json({
            error: 'Device Offline',
            code: 'device_offline',
            message: 'Device is currently offline. Please check the device connection.'
        });
    }

    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            error: 'Invalid Token',
            message: 'Please login again'
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            error: 'Token Expired',
            message: 'Please login again'
        });
    }

    // Handle custom AppErrors
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            success: false,
            error: err.message,
            code: err.code || 'APP_ERROR',
            ...(err.details && { details: err.details }),
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        });
    }

    // Default error - don't expose internal errors in production
    const statusCode = err.status || err.statusCode || 500;
    const message = err.isOperational ? err.message : 'Internal Server Error';
    
    res.status(statusCode).json({
        success: false,
        error: message,
        code: err.code || 'UNKNOWN_ERROR',
        ...(process.env.NODE_ENV === 'development' && { 
            stack: err.stack,
            details: err.message 
        })
    });
};

// Async error wrapper to catch async errors
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
    errorHandler,
    asyncHandler,
    errorTypes,
    AppError,
    ValidationError,
    DatabaseError,
    MQTTError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    DeviceNotIdentifiedError,
    DeviceOfflineError
};
