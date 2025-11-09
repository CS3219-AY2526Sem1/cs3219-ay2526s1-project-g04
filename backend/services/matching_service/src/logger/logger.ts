import winston from 'winston';
import path from 'path';
import fs from 'fs';

const logDir = path.resolve('logs');

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Define log formats
const logFormat = winston.format.printf(
  ({ timestamp, level, message }) =>
    `${timestamp} [${level.toUpperCase()}] ${message}`,
);

// Create logger
export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat,
  ),
  transports: [
    // Info + Warn logs
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
    }),
    // Error logs
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
    }),
    // Console output for development
    new winston.transports.Console(),
  ],
});
