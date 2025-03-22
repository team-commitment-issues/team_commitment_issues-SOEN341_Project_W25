// utils/logger.ts
import winston from 'winston';

/**
 * Creates a logger instance for a specific module
 * @param module Name of the module using the logger
 * @returns Winston logger instance
 */
export const createLogger = (module: string) => {
  // Determine log level based on environment
  const logLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug';
  
  // Create format that includes timestamp, service name, and log level
  const format = winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
    winston.format.printf(info => {
      const { timestamp, level, message, ...meta } = info;
      return JSON.stringify({
        timestamp,
        level,
        module,
        message,
        ...meta
      });
    })
  );
  
  // Create transports based on environment
  const transports: winston.transport[] = [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ];
  
  // Add file transport in production
  if (process.env.NODE_ENV === 'production') {
    transports.push(
      new winston.transports.File({ 
        filename: 'logs/error.log', 
        level: 'error' 
      }),
      new winston.transports.File({ 
        filename: 'logs/combined.log' 
      })
    );
  }
  
  return winston.createLogger({
    level: logLevel,
    format,
    defaultMeta: { service: 'websocket-server' },
    transports
  });
};