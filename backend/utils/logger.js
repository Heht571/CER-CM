const winston = require('winston');
const config = require('../config');

const logger = winston.createLogger({
  level: config.port === 3000 ? 'debug' : 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, stack }) => {
          if (stack) {
            return `${timestamp} [${level}]: ${message}\n${stack}`;
          }
          return `${timestamp} [${level}]: ${message}`;
        })
      )
    })
  ]
});

module.exports = logger;