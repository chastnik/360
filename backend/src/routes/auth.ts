// Автор: Стас Чашин @chastnik
/* eslint-disable no-console */
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Joi from 'joi';
import crypto from 'crypto';
import db from '../database/connection';
import { LoginRequest, RegisterRequest } from '../types';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Валидация для логина
const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Некорректный email',
    'any.required': 'Email обязателен'
  }),
  password: Joi.string().required().messages({
    'any.required': 'Пароль обязателен'
  })
});

// Валидация для регистрации
const registerSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Некорректный email',
    'any.required': 'Email обязателен'
  }),
  first_name: Joi.string().required().messages({
    'any.required': 'Имя обязательно'
  }),
  last_name: Joi.string().required().messages({
    'any.required': 'Фамилия обязательна'
  }),
  role: Joi.string().valid('user', 'admin', 'hr').required().messages({
    'any.only': 'Роль может быть только user, admin или hr',
    'any.required': 'Роль обязательна'
  })
});

// Генерация случайного пароля
const generateRandomPassword = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

// POST /api/auth/login
router.post('/login', async (req, res): Promise<void> => {
  try {
    const { error } = loginSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        error: error.details?.[0]?.message || 'Ошибка валидации'
      });
      return;
    }

    const { email, password }: LoginRequest = req.body;

    // Найти пользователя
    const user = await db('users')
      .where({ email: email.toLowerCase(), is_active: true })
      .first();

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Неверный email или пароль'
      });
      return;
    }

    // Проверить пароль
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        error: 'Неверный email или пароль'
      });
      return;
    }

    // Создать JWT токен
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role,
        roleId: user.role_id || null
      },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    // Отдаём ещё permissions для фронта
    const permissions = await db('role_permissions').where('role_id', user.role_id).pluck('permission');
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        role_id: user.role_id || null,
        permissions
      }
    });

  } catch (error) {
    console.error('Ошибка при входе:', error);
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res): Promise<void> => {
  try {
    const { error } = registerSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        error: error.details?.[0]?.message || 'Ошибка валидации'
      });
      return;
    }

    const { email, first_name, last_name, role }: RegisterRequest = req.body;

    // Проверить, что пользователь не существует
    const existingUser = await db('users')
      .where({ email: email.toLowerCase() })
      .first();

    if (existingUser) {
      res.status(400).json({
        success: false,
        error: 'Пользователь с таким email уже существует'
      });
      return;
    }

    // Сгенерировать случайный пароль
    const password = generateRandomPassword();
    
    // Хешировать пароль
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Создать пользователя
    const [newUser] = await db('users')
      .insert({
        email: email.toLowerCase(),
        password_hash,
        first_name,
        last_name,
        role,
        is_active: true
      })
      .returning('*');

    res.status(201).json({
      success: true,
      message: 'Пользователь успешно зарегистрирован',
      user: {
        id: newUser.id,
        email: newUser.email,
        first_name: newUser.first_name,
        last_name: newUser.last_name,
        role: newUser.role
      },
      temporary_password: password
    });

  } catch (error) {
    console.error('Ошибка при регистрации:', error);
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req: AuthRequest, res): Promise<void> => {
  try {
    const user = await db('users')
      .where({ id: req.user?.userId, is_active: true })
      .first();

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'Пользователь не найден'
      });
      return;
    }

    const mePermissions = await db('role_permissions').where('role_id', user.role_id).pluck('permission');
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role
      },
      permissions: mePermissions
    });

  } catch (error) {
    console.error('Ошибка получения пользователя:', error);
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    });
  }
});

// POST /api/auth/change-password
router.post('/change-password', authenticateToken, async (req: AuthRequest, res): Promise<void> => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      res.status(400).json({
        success: false,
        error: 'Текущий пароль и новый пароль обязательны'
      });
      return;
    }

    if (new_password.length < 6) {
      res.status(400).json({
        success: false,
        error: 'Новый пароль должен содержать минимум 6 символов'
      });
      return;
    }

    const user = await db('users')
      .where({ id: req.user?.userId, is_active: true })
      .first();

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'Пользователь не найден'
      });
      return;
    }

    // Проверить текущий пароль
    const isCurrentPasswordValid = await bcrypt.compare(current_password, user.password_hash);
    if (!isCurrentPasswordValid) {
      res.status(400).json({
        success: false,
        error: 'Неверный текущий пароль'
      });
      return;
    }

    // Хешировать новый пароль
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(new_password, saltRounds);

    // Обновить пароль
    await db('users')
      .where({ id: user.id })
      .update({ password_hash: newPasswordHash });

    res.json({
      success: true,
      message: 'Пароль успешно изменен'
    });

  } catch (error) {
    console.error('Ошибка смены пароля:', error);
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    });
  }
});

// Валидация для запроса сброса пароля
const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Некорректный email',
    'any.required': 'Email обязателен'
  })
});

// Валидация для сброса пароля
const resetPasswordSchema = Joi.object({
  token: Joi.string().required().messages({
    'any.required': 'Токен сброса обязателен'
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Пароль должен содержать минимум 6 символов',
    'any.required': 'Новый пароль обязателен'
  })
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res): Promise<void> => {
  try {
    const { error } = forgotPasswordSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        error: error.details?.[0]?.message || 'Ошибка валидации'
      });
      return;
    }

    const { email } = req.body;

    // Найти пользователя
    const user = await db('users')
      .where({ email: email.toLowerCase(), is_active: true })
      .first();

    // Всегда возвращаем успех, чтобы не раскрывать существование email
    if (!user) {
      res.json({
        success: true,
        message: 'Если пользователь с таким email существует, на него будет отправлено письмо с инструкциями по сбросу пароля'
      });
      return;
    }

    // Генерировать токен сброса
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 час

    // Сохранить токен в БД
    await db('users')
      .where({ id: user.id })
      .update({
        reset_token: resetToken,
        reset_token_expiry: resetTokenExpiry
      });

    // TODO: Отправить email с токеном сброса
    // В реальном приложении здесь должна быть отправка email
    console.log(`Токен сброса пароля для ${email}: ${resetToken}`);
    console.log(`Ссылка для сброса: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`);

    res.json({
      success: true,
      message: 'Если пользователь с таким email существует, на него будет отправлено письмо с инструкциями по сбросу пароля'
    });

  } catch (error) {
    console.error('Ошибка запроса сброса пароля:', error);
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res): Promise<void> => {
  try {
    const { error } = resetPasswordSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        error: error.details?.[0]?.message || 'Ошибка валидации'
      });
      return;
    }

    const { token, password } = req.body;

    // Найти пользователя по токену
    const user = await db('users')
      .where({ 
        reset_token: token,
        is_active: true 
      })
      .where('reset_token_expiry', '>', new Date())
      .first();

    if (!user) {
      res.status(400).json({
        success: false,
        error: 'Недействительный или просроченный токен сброса'
      });
      return;
    }

    // Хешировать новый пароль
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Обновить пароль и очистить токен сброса
    await db('users')
      .where({ id: user.id })
      .update({
        password_hash: passwordHash,
        reset_token: null,
        reset_token_expiry: null
      });

    res.json({
      success: true,
      message: 'Пароль успешно сброшен'
    });

  } catch (error) {
    console.error('Ошибка сброса пароля:', error);
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    });
  }
});

export default router; 