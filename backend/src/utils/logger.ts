// © 2025 Бит.Цифра - Стас Чашин

import type { LoggerOptions } from 'pino';
// Используем require для обхода проблемы с разрешением модуля в TypeScript
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pino = require('pino');

/**
 * Настройка структурированного логирования с использованием pino
 * 
 * Особенности:
 * - В development режиме: красивый вывод в консоль (pino-pretty)
 * - В production режиме: JSON формат для парсинга логов
 * - Разные уровни логирования (trace, debug, info, warn, error, fatal)
 * - Автоматическое логирование ошибок с stack trace
 */
const isDevelopment = process.env.NODE_ENV !== 'production';
const logLevel = process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info');

const loggerConfig: LoggerOptions = {
  level: logLevel,
  formatters: {
    level: (label: string) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(isDevelopment && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
        singleLine: false,
      },
    },
  }),
};

// Создаем основной logger
export const logger = pino(loggerConfig);

/**
 * Вспомогательные функции для удобного логирования
 */
export const logInfo = (message: string, data?: Record<string, any>) => {
  logger.info(data || {}, message);
};

export const logError = (message: string, error?: Error | unknown, data?: Record<string, any>) => {
  const errorData: Record<string, any> = {
    ...data,
  };

  if (error instanceof Error) {
    errorData.error = {
      message: error.message,
      stack: error.stack,
      name: error.name,
    };
  } else if (error) {
    errorData.error = error;
  }

  logger.error(errorData, message);
};

export const logWarn = (message: string, data?: Record<string, any>) => {
  logger.warn(data || {}, message);
};

export const logDebug = (message: string, data?: Record<string, any>) => {
  logger.debug(data || {}, message);
};

export default logger;

