// © 2025 Бит.Цифра - Стас Чашин

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Единый обработчик ошибок для всех эндпоинтов
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Логируем ошибку
  logger.error({
    error: {
      message: err.message,
      stack: err.stack,
      name: err.name
    },
    request: {
      url: req.url,
      method: req.method,
      ip: req.ip
    }
  }, 'Ошибка обработки запроса');

  // Определяем статус код
  let statusCode = 500;
  let errorMessage = 'Внутренняя ошибка сервера';

  // В development режиме показываем детали ошибки
  if (process.env.NODE_ENV !== 'production') {
    errorMessage = err.message || 'Внутренняя ошибка сервера';
  }

  // Обработка специфичных ошибок
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorMessage = err.message;
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    errorMessage = 'Не авторизован';
  } else if (err.name === 'ForbiddenError') {
    statusCode = 403;
    errorMessage = 'Доступ запрещен';
  } else if (err.name === 'NotFoundError') {
    statusCode = 404;
    errorMessage = 'Ресурс не найден';
  }

  res.status(statusCode).json({
    success: false,
    error: errorMessage
  });
};

/**
 * Wrapper для асинхронных обработчиков маршрутов
 * Автоматически обрабатывает ошибки и передает их в errorHandler
 */
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

