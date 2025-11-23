// © 2025 Бит.Цифра - Стас Чашин

// Автор: Стас Чашин @chastnik
import { Router } from 'express';
import axios from 'axios';
import knex from '../database/connection';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import crypto from 'crypto';

const router = Router();

// Алгоритм шифрования
// Ключ шифрования должен быть установлен в переменных окружения
// Требуется 128 бит (16 байт = 32 hex символа)
// Проверка выполняется лениво при первом использовании
const ALGORITHM = 'aes-128-cbc';

/**
 * Получить ключ шифрования с валидацией
 * @throws Error если ключ не установлен или невалиден
 */
function getEncryptionKey(): string {
  const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
  if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY must be set in environment variables. This is required for Jira integration.');
  }
  if (ENCRYPTION_KEY.length < 32) {
    throw new Error('ENCRYPTION_KEY must be at least 32 hex characters (128 bits).');
  }
  return ENCRYPTION_KEY;
}

function encrypt(text: string): string {
  if (!text) return '';
  try {
    const iv = crypto.randomBytes(16);
    const encryptionKey = getEncryptionKey().slice(0, 32); // 32 hex символа = 16 байт = 128 бит
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(encryptionKey, 'hex'), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Ошибка шифрования:', error);
    return text; // В случае ошибки возвращаем исходный текст
  }
}

function decrypt(text: string): string {
  if (!text) return '';
  try {
    const parts = text.split(':');
    if (parts.length !== 2) return text; // Не зашифровано
    const ivPart = parts[0];
    const encryptedText = parts[1];
    if (!ivPart || !encryptedText) return text;
    const iv = Buffer.from(ivPart, 'hex');
    const encryptionKey = getEncryptionKey().slice(0, 32); // 32 hex символа = 16 байт = 128 бит
    if (!encryptionKey || encryptionKey.length < 32) return text;
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(encryptionKey, 'hex'), iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Ошибка расшифровки:', error);
    return text; // В случае ошибки возвращаем исходный текст
  }
}

/**
 * Получить настройки Jira
 */
router.get('/settings', authenticateToken, async (req: AuthRequest, res): Promise<void> => {
  try {
    const user = req.user;
    
    if (user?.role !== 'admin') {
      res.status(403).json({ 
        success: false,
        error: 'Недостаточно прав доступа' 
      });
      return;
    }

    const settings = await knex('system_settings')
      .whereIn('setting_key', ['jira_url', 'jira_username', 'jira_password', 'jira_enabled', 'jira_project_key', 'jira_epic_key'])
      .where('category', 'integrations');

    const settingsMap: any = {};
    settings.forEach((setting: any) => {
      const key = setting.setting_key.replace('jira_', '');
      if (key === 'password' && setting.setting_value) {
        // Пароль всегда маскируем при отправке
        settingsMap[key] = '••••••••';
      } else if (key === 'enabled') {
        settingsMap[key] = setting.setting_value === 'true';
      } else {
        settingsMap[key] = setting.setting_value || '';
      }
    });

    res.json({
      success: true,
      data: {
        url: settingsMap.url || '',
        username: settingsMap.username || '',
        password: settingsMap.password || '',
        enabled: settingsMap.enabled || false,
        projectKey: settingsMap.project_key || '',
        epicKey: settingsMap.epic_key || ''
      }
    });
  } catch (error) {
    console.error('Ошибка получения настроек Jira:', error);
    res.status(500).json({ 
      success: false,
      error: 'Внутренняя ошибка сервера' 
    });
  }
});

/**
 * Сохранить настройки Jira
 */
router.put('/settings', authenticateToken, async (req: AuthRequest, res): Promise<void> => {
  try {
    const user = req.user;
    
    if (user?.role !== 'admin') {
      res.status(403).json({ 
        success: false,
        error: 'Недостаточно прав доступа' 
      });
      return;
    }

    const { url, username, password, enabled, projectKey, epicKey } = req.body;

    if (!url || !url.trim()) {
      res.status(400).json({ 
        success: false,
        error: 'Укажите адрес Jira сервера' 
      });
      return;
    }

    if (!username || !username.trim()) {
      res.status(400).json({ 
        success: false,
        error: 'Укажите имя пользователя' 
      });
      return;
    }

    if (enabled) {
      if (!projectKey || !projectKey.trim()) {
        res.status(400).json({ 
          success: false,
          error: 'Укажите проект для создания задач' 
        });
        return;
      }
      if (!epicKey || !epicKey.trim()) {
        res.status(400).json({ 
          success: false,
          error: 'Укажите эпик для создания задач' 
        });
        return;
      }
    }

    // Обновляем или создаем настройки
    const settingsToUpdate = [
      { key: 'jira_url', value: url.trim(), type: 'string' },
      { key: 'jira_username', value: username.trim(), type: 'string' },
      { key: 'jira_enabled', value: enabled ? 'true' : 'false', type: 'boolean' },
      { key: 'jira_project_key', value: (projectKey || '').trim(), type: 'string' },
      { key: 'jira_epic_key', value: (epicKey || '').trim(), type: 'string' }
    ];

    // Пароль обновляем только если он был изменен (не маскирован)
    if (password && password !== '••••••••') {
      const encryptedPassword = encrypt(password);
      settingsToUpdate.push({ key: 'jira_password', value: encryptedPassword, type: 'string' });
    }

    for (const setting of settingsToUpdate) {
      const existing = await knex('system_settings')
        .where({ setting_key: setting.key, category: 'integrations' })
        .first();

      if (existing) {
        await knex('system_settings')
          .where({ setting_key: setting.key, category: 'integrations' })
          .update({
            setting_value: setting.value,
            updated_at: knex.fn.now()
          });
      } else {
        await knex('system_settings').insert({
          setting_key: setting.key,
          setting_value: setting.value,
          setting_type: setting.type,
          category: 'integrations',
          is_sensitive: setting.key === 'jira_password',
          description: `Jira ${setting.key.replace('jira_', '').replace('_', ' ')}`
        });
      }
    }

    res.json({
      success: true,
      message: 'Настройки успешно сохранены'
    });
  } catch (error) {
    console.error('Ошибка сохранения настроек Jira:', error);
    res.status(500).json({ 
      success: false,
      error: 'Внутренняя ошибка сервера' 
    });
  }
});

/**
 * Тестирование подключения к Jira
 */
router.post('/test-connection', authenticateToken, async (req: AuthRequest, res): Promise<void> => {
  try {
    const user = req.user;
    
    if (user?.role !== 'admin') {
      res.status(403).json({ 
        success: false,
        error: 'Недостаточно прав доступа' 
      });
      return;
    }

    // Получаем настройки из БД
    const settings = await knex('system_settings')
      .whereIn('setting_key', ['jira_url', 'jira_username', 'jira_password'])
      .where('category', 'integrations');

    if (settings.length === 0) {
      res.status(400).json({ 
        success: false,
        error: 'Настройки Jira не найдены. Сначала сохраните настройки.' 
      });
      return;
    }

    const settingsMap: any = {};
    settings.forEach((setting: any) => {
      const key = setting.setting_key.replace('jira_', '');
      if (key === 'password') {
        settingsMap[key] = decrypt(setting.setting_value);
      } else {
        settingsMap[key] = setting.setting_value || '';
      }
    });

    if (!settingsMap.url || !settingsMap.username || !settingsMap.password) {
      res.status(400).json({ 
        success: false,
        error: 'Не все настройки заполнены' 
      });
      return;
    }

    // Тестируем подключение к Jira
    // Пробуем разные эндпоинты для совместимости с разными версиями Jira
    try {
      const jiraUrl = settingsMap.url.replace(/\/$/, ''); // Убираем завершающий слеш
      const auth = Buffer.from(`${settingsMap.username}:${settingsMap.password}`).toString('base64');
      const headers = {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      };
      
      // Сначала пробуем получить информацию о сервере (более универсальный эндпоинт)
      let response;
      let userData: any = null;
      
      try {
        // Пробуем API v3 serverInfo
        response = await axios.get(`${jiraUrl}/rest/api/3/serverInfo`, {
          headers,
          timeout: 10000
        });
      } catch (error: any) {
        // Если API v3 не работает, пробуем API v2
        if (error.response?.status === 404) {
          try {
            response = await axios.get(`${jiraUrl}/rest/api/2/serverInfo`, {
              headers,
              timeout: 10000
            });
          } catch (error2: any) {
            // Если и v2 не работает, пробуем latest
            response = await axios.get(`${jiraUrl}/rest/api/latest/serverInfo`, {
              headers,
              timeout: 10000
            });
          }
        } else {
          throw error;
        }
      }
      
      // Если serverInfo успешно, пробуем получить информацию о пользователе
      if (response.status === 200) {
        try {
          // Пробуем разные эндпоинты для получения информации о пользователе
          const myselfEndpoints = [
            '/rest/api/3/myself',
            '/rest/api/2/myself',
            '/rest/api/latest/myself'
          ];
          
          for (const endpoint of myselfEndpoints) {
            try {
              const myselfResponse = await axios.get(`${jiraUrl}${endpoint}`, {
                headers,
                timeout: 10000
              });
              if (myselfResponse.status === 200 && myselfResponse.data) {
                userData = myselfResponse.data;
                break;
              }
            } catch (e) {
              // Продолжаем пробовать следующий эндпоинт
              continue;
            }
          }
        } catch (e) {
          // Игнорируем ошибку получения информации о пользователе
        }
        
        const serverInfo = response.data;
        const userName = userData?.displayName || userData?.name || settingsMap.username;
        const serverVersion = serverInfo?.version || serverInfo?.versionNumbers?.join('.') || 'неизвестна';
        
        res.json({
          success: true,
          data: {
            connected: true,
            message: `Подключение успешно. Пользователь: ${userName}. Версия Jira: ${serverVersion}`
          }
        });
      } else {
        res.json({
          success: true,
          data: {
            connected: false,
            message: `Ошибка подключения: ${response.status} ${response.statusText}`
          }
        });
      }
    } catch (error: any) {
      console.error('Ошибка подключения к Jira:', error);
      let errorMessage = 'Не удалось установить соединение';
      
      if (error.response) {
        // Сервер ответил с кодом ошибки
        errorMessage = `Ошибка подключения: ${error.response.status} ${error.response.statusText}`;
        if (error.response.data) {
          const errorData = typeof error.response.data === 'string' 
            ? error.response.data 
            : JSON.stringify(error.response.data);
          errorMessage += `. ${errorData.substring(0, 200)}`;
        }
      } else if (error.request) {
        // Запрос был отправлен, но ответа не получено
        errorMessage = 'Не удалось получить ответ от сервера Jira. Проверьте URL и доступность сервера.';
      } else if (error.message) {
        errorMessage = `Ошибка: ${error.message}`;
      }
      
      res.json({
        success: true,
        data: {
          connected: false,
          message: errorMessage
        }
      });
    }
  } catch (error) {
    console.error('Ошибка тестирования подключения:', error);
    res.status(500).json({ 
      success: false,
      error: 'Внутренняя ошибка сервера' 
    });
  }
});

/**
 * Получить список проектов Jira
 */
router.get('/projects', authenticateToken, async (req: AuthRequest, res): Promise<void> => {
  try {
    const user = req.user;
    
    if (user?.role !== 'admin') {
      res.status(403).json({ 
        success: false,
        error: 'Недостаточно прав доступа' 
      });
      return;
    }

    // Получаем настройки подключения
    const settings = await knex('system_settings')
      .whereIn('setting_key', ['jira_url', 'jira_username', 'jira_password'])
      .where('category', 'integrations');

    const settingsMap: any = {};
    settings.forEach((setting: any) => {
      const key = setting.setting_key.replace('jira_', '');
      if (key === 'password') {
        settingsMap[key] = decrypt(setting.setting_value);
      } else {
        settingsMap[key] = setting.setting_value || '';
      }
    });

    if (!settingsMap.url || !settingsMap.username || !settingsMap.password) {
      res.status(400).json({ 
        success: false,
        error: 'Настройки подключения не заполнены' 
      });
      return;
    }

    try {
      const jiraUrl = settingsMap.url.replace(/\/$/, '');
      const auth = Buffer.from(`${settingsMap.username}:${settingsMap.password}`).toString('base64');
      const headers = {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      };
      
      // Пробуем разные версии API для совместимости
      let response;
      const projectEndpoints = [
        '/rest/api/3/project',
        '/rest/api/2/project',
        '/rest/api/latest/project'
      ];
      
      let lastError: any = null;
      for (const endpoint of projectEndpoints) {
        try {
          response = await axios.get(`${jiraUrl}${endpoint}`, {
            headers,
            timeout: 10000
          });
          if (response.status === 200) {
            break;
          }
        } catch (error: any) {
          lastError = error;
          // Продолжаем пробовать следующий эндпоинт
          continue;
        }
      }
      
      if (!response || response.status !== 200) {
        throw lastError || new Error('Не удалось получить список проектов');
      }

      const projects = Array.isArray(response.data) ? response.data.map((p: any) => ({
        key: p.key,
        name: p.name,
        id: p.id
      })) : [];

      res.json({
        success: true,
        data: projects
      });
    } catch (error: any) {
      console.error('Ошибка получения проектов Jira:', error);
      let errorMessage = 'Не удалось получить список проектов';
      if (error.response) {
        errorMessage += `: ${error.response.status} ${error.response.statusText}`;
      } else if (error.message) {
        errorMessage += `: ${error.message}`;
      }
      res.status(500).json({ 
        success: false,
        error: errorMessage
      });
    }
  } catch (error) {
    console.error('Ошибка получения проектов:', error);
    res.status(500).json({ 
      success: false,
      error: 'Внутренняя ошибка сервера' 
    });
  }
});

/**
 * Получить список эпиков для проекта
 */
router.get('/projects/:projectKey/epics', authenticateToken, async (req: AuthRequest, res): Promise<void> => {
  try {
    const user = req.user;
    const { projectKey } = req.params;
    
    if (user?.role !== 'admin') {
      res.status(403).json({ 
        success: false,
        error: 'Недостаточно прав доступа' 
      });
      return;
    }

    // Получаем настройки подключения
    const settings = await knex('system_settings')
      .whereIn('setting_key', ['jira_url', 'jira_username', 'jira_password'])
      .where('category', 'integrations');

    const settingsMap: any = {};
    settings.forEach((setting: any) => {
      const key = setting.setting_key.replace('jira_', '');
      if (key === 'password') {
        settingsMap[key] = decrypt(setting.setting_value);
      } else {
        settingsMap[key] = setting.setting_value || '';
      }
    });

    if (!settingsMap.url || !settingsMap.username || !settingsMap.password) {
      res.status(400).json({ 
        success: false,
        error: 'Настройки подключения не заполнены' 
      });
      return;
    }

    try {
      const jiraUrl = settingsMap.url.replace(/\/$/, '');
      const auth = Buffer.from(`${settingsMap.username}:${settingsMap.password}`).toString('base64');
      const headers = {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      };
      
      // Получаем эпики через JQL запрос
      const jql = `project = ${projectKey} AND issuetype = Epic ORDER BY summary ASC`;
      
      // Пробуем разные версии API для совместимости
      let response;
      const searchEndpoints = [
        '/rest/api/3/search',
        '/rest/api/2/search',
        '/rest/api/latest/search'
      ];
      
      let lastError: any = null;
      for (const endpoint of searchEndpoints) {
        try {
          response = await axios.get(`${jiraUrl}${endpoint}`, {
            headers,
            params: {
              jql: jql,
              fields: 'key,summary,id'
            },
            timeout: 10000
          });
          if (response.status === 200) {
            break;
          }
        } catch (error: any) {
          lastError = error;
          // Продолжаем пробовать следующий эндпоинт
          continue;
        }
      }
      
      if (!response || response.status !== 200) {
        throw lastError || new Error('Не удалось получить список эпиков');
      }

      const epics = Array.isArray(response.data.issues) ? response.data.issues.map((issue: any) => ({
        key: issue.key,
        name: issue.fields.summary,
        id: issue.id
      })) : [];

      res.json({
        success: true,
        data: epics
      });
    } catch (error: any) {
      console.error('Ошибка получения эпиков Jira:', error);
      let errorMessage = 'Не удалось получить список эпиков';
      if (error.response) {
        errorMessage += `: ${error.response.status} ${error.response.statusText}`;
      } else if (error.message) {
        errorMessage += `: ${error.message}`;
      }
      res.status(500).json({ 
        success: false,
        error: errorMessage
      });
    }
  } catch (error) {
    console.error('Ошибка получения эпиков:', error);
    res.status(500).json({ 
      success: false,
      error: 'Внутренняя ошибка сервера' 
    });
  }
});

export default router;

