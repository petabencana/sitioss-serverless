const winston = require('winston');

const logger = winston.createLogger({
    transports: [
      new winston.transports.Console(),
    ],
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.printf(info => {
        return `${info.level}: ${info.message} ${info.timestamp}`;
      })
    )
  });

  module.exports = logger;