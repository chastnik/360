// © 2025 Бит.Цифра - Стас Чашин

import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

/**
 * Middleware для валидации запросов с использованием Joi схем
 * @param schema - Joi схема для валидации
 * @param source - источник данных для валидации ('body', 'query', 'params')
 */
export const validate = (schema: Joi.Schema, source: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const dataToValidate = source === 'body' ? req.body : source === 'query' ? req.query : req.params;
    
    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorMessages = error.details.map(detail => detail.message).join(', ');
      res.status(400).json({
        success: false,
        error: errorMessages
      });
      return;
    }

    // Заменяем исходные данные валидированными
    if (source === 'body') {
      req.body = value;
    } else if (source === 'query') {
      req.query = value;
    } else {
      req.params = value;
    }

    next();
  };
};

