import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Joi from 'joi';
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
        role: user.role 
      },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role
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

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role
      }
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

export default router; 