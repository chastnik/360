// © 2025 Бит.Цифра - Стас Чашин

// Автор: Стас Чашин @chastnik
/* eslint-disable no-console */
import { Router } from 'express';
import knex from '../database/connection';
import databaseService from '../services/database';
import redisService from '../services/redis';
import { authenticateToken, AuthRequest } from '../middleware/auth';
// import bcrypt from 'bcryptjs'; // Временно закомментировано

const router = Router();

// Получить все настройки по категориям
router.get('/', authenticateToken, async (req: AuthRequest, res): Promise<void> => {
  try {
    const user = req.user;
    
    // Проверить права доступа - только админы могут просматривать настройки
    if (user?.role !== 'admin') {
      res.status(403).json({ 
        success: false, 
        error: 'Недостаточно прав доступа' 
      });
      return;
    }

    const settings = await knex('system_settings')
      .select('setting_key', 'setting_value', 'setting_type', 'description', 'category', 'is_sensitive')
      .orderBy(['category', 'setting_key']);

    // Группировка настроек по категориям
    const groupedSettings = settings.reduce((acc: any, setting: any) => {
      const category = setting.category;
      if (!acc[category]) {
        acc[category] = {};
      }
      
      // Маскировка чувствительных данных
      const value = setting.is_sensitive && setting.setting_value 
        ? '••••••••' 
        : setting.setting_value;
      
      acc[category][setting.setting_key] = {
        value: convertValue(value, setting.setting_type),
        type: setting.setting_type,
        description: setting.description,
        is_sensitive: setting.is_sensitive
      };
      
      return acc;
    }, {});

    res.json({
      success: true,
      settings: groupedSettings
    });

  } catch (error) {
    console.error('Ошибка получения настроек:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Внутренняя ошибка сервера' 
    });
  }
});

// Получить настройки по категории
router.get('/category/:category', authenticateToken, async (req: AuthRequest, res): Promise<void> => {
  try {
    const user = req.user;
    const { category } = req.params;
    
    if (user?.role !== 'admin') {
      res.status(403).json({ 
        success: false, 
        error: 'Недостаточно прав доступа' 
      });
      return;
    }

    const settings = await knex('system_settings')
      .select('setting_key', 'setting_value', 'setting_type', 'description', 'is_sensitive')
      .where('category', category)
      .orderBy('setting_key');

    const result = settings.reduce((acc: any, setting: any) => {
      const value = setting.is_sensitive && setting.setting_value 
        ? '••••••••' 
        : setting.setting_value;
      
      acc[setting.setting_key] = {
        value: convertValue(value, setting.setting_type),
        type: setting.setting_type,
        description: setting.description,
        is_sensitive: setting.is_sensitive
      };
      
      return acc;
    }, {});

    res.json({
      success: true,
      settings: result
    });

  } catch (error) {
    console.error('Ошибка получения настроек категории:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Внутренняя ошибка сервера' 
    });
  }
});

// Обновить настройки
router.put('/', authenticateToken, async (req: AuthRequest, res): Promise<void> => {
  try {
    const user = req.user;
    const { settings } = req.body;
    
    if (user?.role !== 'admin') {
      res.status(403).json({ 
        success: false, 
        error: 'Недостаточно прав доступа' 
      });
      return;
    }

    if (!settings || typeof settings !== 'object') {
      res.status(400).json({ 
        success: false, 
        error: 'Неверный формат данных' 
      });
      return;
    }

    // Обработка настроек по категориям
    for (const category in settings) {
      const categorySettings = settings[category];
      
      for (const settingKey in categorySettings) {
        const settingValue = categorySettings[settingKey];
        
        // Проверить существование настройки
        const existingSetting = await knex('system_settings')
          .where({ setting_key: settingKey, category })
          .first();

        if (!existingSetting) {
          // Пропускаем настройки, которых нет в БД (например, UI-only настройки)
          continue;
        }

        // Пропустить если значение не изменилось (для чувствительных данных)
        if (existingSetting.is_sensitive && settingValue === '••••••••') {
          continue;
        }

        // Конвертировать значение в строку для сохранения
        const valueToSave = convertToString(settingValue, existingSetting.setting_type);

        await knex('system_settings')
          .where({ setting_key: settingKey, category })
          .update({
            setting_value: valueToSave,
            updated_at: knex.fn.now()
          });
      }
    }

    // Проверить, были ли изменены настройки БД или Redis
    const dbSettingsChanged = Object.keys(settings).includes('database');
    const redisSettingsChanged = Object.keys(settings).includes('cache');

    let message = 'Настройки обновлены успешно';
    const warnings = [];

    // Если изменились настройки БД - попытаться переподключиться
    if (dbSettingsChanged) {
      try {
        const reconnected = await databaseService.reconnectWithDatabaseSettings();
        if (reconnected) {
          message += '. Подключение к БД обновлено.';
        } else {
          warnings.push('Не удалось переподключиться к БД с новыми настройками');
        }
      } catch (error) {
        console.error('Ошибка переподключения к БД:', error);
        warnings.push('Ошибка переподключения к БД');
      }
    }

    // Если изменились настройки Redis - переподключиться
    if (redisSettingsChanged) {
      try {
        await redisService.reconnectWithNewSettings();
        message += ' Подключение к Redis обновлено.';
      } catch (error) {
        console.error('Ошибка переподключения к Redis:', error);
        warnings.push('Не удалось переподключиться к Redis с новыми настройками');
      }
    }

    res.json({
      success: true,
      message,
      warnings: warnings.length > 0 ? warnings : undefined
    });

  } catch (error) {
    console.error('Ошибка обновления настроек:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Внутренняя ошибка сервера' 
    });
  }
});

// Тестировать подключение к базе данных
router.post('/test-database', authenticateToken, async (req: AuthRequest, res): Promise<void> => {
  try {
    const user = req.user;
    const { host, port, database, username, password } = req.body;
    
    if (user?.role !== 'admin') {
      res.status(403).json({ 
        success: false, 
        error: 'Недостаточно прав доступа' 
      });
      return;
    }

    // Создание временного подключения для проверки
    const testKnex = require('knex')({
      client: 'postgresql',
      connection: {
        host,
        port: parseInt(port),
        database,
        user: username,
        password
      },
      pool: { min: 1, max: 1 }
    });

    try {
      await testKnex.raw('SELECT 1');
      res.json({
        success: true,
        message: 'Подключение к базе данных успешно'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: `Ошибка подключения к базе данных: ${error.message}`
      });
    } finally {
      await testKnex.destroy();
    }

  } catch (error) {
    console.error('Ошибка тестирования подключения к БД:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Внутренняя ошибка сервера' 
    });
  }
});

// Тестировать подключение к Redis
router.post('/test-redis', authenticateToken, async (req: AuthRequest, res): Promise<void> => {
  try {
    const user = req.user;
    const { host, port, password, db } = req.body;
    
    if (user?.role !== 'admin') {
      res.status(403).json({ 
        success: false, 
        error: 'Недостаточно прав доступа' 
      });
      return;
    }

    const Redis = require('redis');
    const client = Redis.createClient({
      host,
      port: parseInt(port),
      password: password || undefined,
      db: parseInt(db) || 0
    });

    try {
      await client.connect();
      await client.ping();
      
      res.json({
        success: true,
        message: 'Подключение к Redis успешно'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: `Ошибка подключения к Redis: ${error.message}`
      });
    } finally {
      if (client.isOpen) {
        await client.quit();
      }
    }

  } catch (error) {
    console.error('Ошибка тестирования подключения к Redis:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Внутренняя ошибка сервера' 
    });
  }
});

// Сбросить настройки к значениям по умолчанию
router.post('/reset', authenticateToken, async (req: AuthRequest, res): Promise<void> => {
  try {
    const user = req.user;
    
    if (user?.role !== 'admin') {
      res.status(403).json({ 
        success: false, 
        error: 'Недостаточно прав доступа' 
      });
      return;
    }

    // Выполнить seed снова для сброса настроек
    await knex.seed.run();

    // Попытаться переподключиться с обновленными настройками
    const warnings = [];
    
    try {
      await databaseService.reconnectWithDatabaseSettings();
    } catch (error) {
      warnings.push('Не удалось переподключиться к БД после сброса');
    }

    try {
      await redisService.reconnectWithNewSettings();  
    } catch (error) {
      warnings.push('Не удалось переподключиться к Redis после сброса');
    }

    res.json({
      success: true,
      message: 'Настройки сброшены к значениям по умолчанию',
      warnings: warnings.length > 0 ? warnings : undefined
    });

  } catch (error) {
    console.error('Ошибка сброса настроек:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Внутренняя ошибка сервера' 
    });
  }
});

// Утилиты для конвертации типов
function convertValue(value: string, type: string): any {
  if (!value) return type === 'boolean' ? false : '';
  
  switch (type) {
    case 'boolean':
      return value.toLowerCase() === 'true';
    case 'number':
      return parseInt(value) || 0;
    case 'json':
      try {
        return JSON.parse(value);
      } catch {
        return {};
      }
    default:
      return value;
  }
}

function convertToString(value: any, type: string): string {
  if (value === null || value === undefined) return '';
  
  switch (type) {
    case 'boolean':
      return String(Boolean(value));
    case 'number':
      return String(Number(value) || 0);
    case 'json':
      return JSON.stringify(value);
    default:
      return String(value);
  }
}

export default router; 