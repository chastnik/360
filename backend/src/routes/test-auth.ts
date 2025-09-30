// © 2025 Бит.Цифра - Стас Чашин

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../database/connection';

const router = Router();

// Основной логин (рабочая версия)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Прямой SQL запрос
    const result = await db.raw(`
      SELECT * FROM users 
      WHERE email = ? AND is_active = true
      LIMIT 1
    `, [email.toLowerCase()]);
    
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Неверный email или пароль'
      });
    }

    // Проверить пароль
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Неверный email или пароль'
      });
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

    // Получить права
    const permissions = await db('role_permissions').where('role_id', user.role_id).pluck('permission');

    // Создаем объект пользователя (используем рабочий подход)
    const userData = {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      role_id: user.role_id || null,
      permissions
    };

    return res.json({
      success: true,
      token,
      user: userData
    });

  } catch (error: any) {
    console.error('Ошибка в логине:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Новый логин без проблем (дубликат для тестирования)
router.post('/login-new', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Прямой SQL запрос
    const result = await db.raw(`
      SELECT * FROM users 
      WHERE email = ? AND is_active = true
      LIMIT 1
    `, [email.toLowerCase()]);
    
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Пользователь не найден'
      });
    }

    // Проверить пароль
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Неверный пароль'
      });
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

    // Получить права
    const permissions = await db('role_permissions').where('role_id', user.role_id).pluck('permission');

    return res.json({
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

  } catch (error: any) {
    console.error('Ошибка в новом логине:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Глубокий тест для отладки
router.get('/debug-user', async (_req, res) => {
  try {
    const result = await db.raw(`
      SELECT * FROM users 
      WHERE email = ? AND is_active = true
      LIMIT 1
    `, ['admin@company.com']);
    
    const user = result.rows[0];
    
    // Тестируем различные способы доступа к данным
    const testData = {
      user_raw: user,
      user_stringified: JSON.stringify(user),
      user_id_direct: user?.id,
      user_email_direct: user?.email,
      user_role_direct: user?.role,
      user_keys: user ? Object.keys(user) : null,
      user_values: user ? Object.values(user) : null,
      typeof_user: typeof user,
      is_null: user === null,
      is_undefined: user === undefined
    };
    
    // Пробуем создать объект как в логине
    const userObject = {
      id: user.id,
      email: user.email,
      role: user.role,
      role_id: user.role_id
    };
    
    res.json({
      success: true,
      debug: testData,
      userObject,
      userObject_stringified: JSON.stringify(userObject)
    });

  } catch (error: any) {
    res.json({
      success: false,
      error: error.message
    });
  }
});

// Тест статичных данных
router.get('/test-static', (_req, res) => {
  const testUser = {
    id: "550e8400-e29b-41d4-a716-446655440100",
    email: "admin@company.com", 
    role: "admin",
    role_id: "5d58bb6c-dff8-4cbd-804e-1e9ab60d6e9e"
  };
  
  res.json({
    success: true,
    user: testUser,
    test_user_data: testUser,
    raw_data: {
      id: "550e8400-e29b-41d4-a716-446655440100",
      email: "admin@company.com", 
      role: "admin",
      role_id: "5d58bb6c-dff8-4cbd-804e-1e9ab60d6e9e"
    },
    test_message: "Статичные данные"
  });
});

// Тест данных из базы
router.get('/test-db-data', async (_req, res) => {
  try {
    const result = await db.raw(`
      SELECT * FROM users 
      WHERE email = ? AND is_active = true
      LIMIT 1
    `, ['admin@company.com']);
    
    const user = result.rows[0];
    
    // Создаем объект разными способами
    const userMethod1 = {
      id: user.id,
      email: user.email,
      role: user.role,
      role_id: user.role_id
    };
    
    const userMethod2 = Object.assign({}, {
      id: user.id,
      email: user.email,
      role: user.role,
      role_id: user.role_id
    });
    
    const userMethod3 = JSON.parse(JSON.stringify({
      id: user.id,
      email: user.email,
      role: user.role,
      role_id: user.role_id
    }));
    
    // Попробуем разные способы доступа
    const directAccess = {
      id: user?.id,
      email: user?.email,
      role: user?.role,
      role_id: user?.role_id
    };
    
    res.json({
      success: true,
      user_raw: user,
      userMethod1,
      userMethod2,
      userMethod3,
      directAccess,
      user_keys: Object.keys(user || {}),
      typeof_user: typeof user,
      user_constructor: user?.constructor?.name
    });

  } catch (error: any) {
    res.json({
      success: false,
      error: error.message
    });
  }
});

// Точная копия рабочего теста в формате логина
router.post('/login-exact-copy', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const result = await db.raw(`
      SELECT * FROM users 
      WHERE email = ? AND is_active = true
      LIMIT 1
    `, [email.toLowerCase()]);
    
    const user = result.rows[0];
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Пользователь не найден'
      });
    }

    // Проверить пароль
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Неверный пароль'
      });
    }

    // Создаем объект ТОЧНО так же, как в рабочем тесте
    const userMethod1 = {
      id: user.id,
      email: user.email,
      role: user.role,
      role_id: user.role_id
    };

    return res.json({
      success: true,
      user: userMethod1,
      token: 'test-token'
    });

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Тест без проверки пароля
router.post('/login-no-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    const result = await db.raw(`
      SELECT * FROM users 
      WHERE email = ? AND is_active = true
      LIMIT 1
    `, [email.toLowerCase()]);
    
    const user = result.rows[0];
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Пользователь не найден'
      });
    }

    // БЕЗ проверки пароля
    const userMethod1 = {
      id: user.id,
      email: user.email,
      role: user.role,
      role_id: user.role_id
    };

    return res.json({
      success: true,
      user: userMethod1,
      token: 'test-token'
    });

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET версия логина для сравнения
router.get('/login-get/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    const result = await db.raw(`
      SELECT * FROM users 
      WHERE email = ? AND is_active = true
      LIMIT 1
    `, [email.toLowerCase()]);
    
    const user = result.rows[0];
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Пользователь не найден'
      });
    }

    const userMethod1 = {
      id: user.id,
      email: user.email,
      role: user.role,
      role_id: user.role_id
    };

    return res.json({
      success: true,
      user_data: userMethod1, // Изменили название поля
      user: userMethod1,      // Оставили для сравнения
      token: 'test-token'
    });

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Эндпоинт для проверки текущего пользователя (нужен фронтенду)
router.get('/me', async (req, res) => {
  try {
    // Получаем токен из заголовка
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Токен не предоставлен'
      });
    }

    // Проверяем токен
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    // Получаем пользователя из базы
    const result = await db.raw(`
      SELECT * FROM users 
      WHERE id = ? AND is_active = true
      LIMIT 1
    `, [decoded.userId]);
    
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Пользователь не найден'
      });
    }

    // Получаем права
    const permissions = await db('role_permissions').where('role_id', user.role_id).pluck('permission');

    // Создаем объект пользователя тем же способом, что работал в тестах
    const userData = {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      role_id: user.role_id
    };

    console.log('DEBUG ME: user from DB:', user ? {id: user.id, email: user.email, role: user.role} : 'NO USER');
    console.log('DEBUG ME: userData created:', userData);

    return res.json({
      success: true,
      data: userData,
      user: userData, // Фронтенд также ожидает поле user
      permissions
    });

  } catch (error: any) {
    console.error('Ошибка в /me:', error);
    return res.status(401).json({
      success: false,
      error: 'Недействительный токен'
    });
  }
});

export default router;
