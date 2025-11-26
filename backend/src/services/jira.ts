// © 2025 Бит.Цифра - Стас Чашин

// Автор: Стас Чашин @chastnik
import axios from 'axios';
import knex from '../database/connection';
import crypto from 'crypto';

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

function decrypt(text: string): string {
  if (!text) return '';
  try {
    const parts = text.split(':');
    if (parts.length !== 2) return text;
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
    return text;
  }
}

interface JiraSettings {
  url: string;
  username: string;
  password: string;
  enabled: boolean;
  projectKey: string;
  epicKey: string;
}

class JiraService {
  /**
   * Получить настройки Jira из БД
   */
  private async getSettings(): Promise<JiraSettings | null> {
    try {
      // Проверяем существование таблицы перед запросом
      const hasTable = await knex.schema.hasTable('system_settings');
      if (!hasTable) {
        // Таблица не существует - это нормально при первом запуске до выполнения миграций
        return null;
      }

      const settings = await knex('system_settings')
        .whereIn('setting_key', ['jira_url', 'jira_username', 'jira_password', 'jira_enabled', 'jira_project_key', 'jira_epic_key'])
        .where('category', 'integrations');

      if (settings.length === 0) {
        return null;
      }

      const settingsMap: any = {};
      settings.forEach((setting: any) => {
        const key = setting.setting_key.replace('jira_', '');
        if (key === 'password') {
          settingsMap[key] = decrypt(setting.setting_value);
        } else if (key === 'enabled') {
          settingsMap[key] = setting.setting_value === 'true';
        } else if (key === 'project_key') {
          settingsMap.projectKey = setting.setting_value || '';
        } else if (key === 'epic_key') {
          settingsMap.epicKey = setting.setting_value || '';
        } else {
          settingsMap[key] = setting.setting_value || '';
        }
      });

      if (!settingsMap.url || !settingsMap.username || !settingsMap.password) {
        return null;
      }

      return {
        url: settingsMap.url,
        username: settingsMap.username,
        password: settingsMap.password,
        enabled: settingsMap.enabled || false,
        projectKey: settingsMap.projectKey || '',
        epicKey: settingsMap.epicKey || ''
      };
    } catch (error: any) {
      // Проверяем, является ли ошибка отсутствием таблицы (это нормально при первом запуске)
      if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
        // Таблица не существует - это нормально до выполнения миграций
        return null;
      }
      console.error('Ошибка получения настроек Jira:', error?.message || error);
      return null;
    }
  }

  /**
   * Найти пользователя Jira по email
   */
  private async findUserByEmail(email: string, settings: JiraSettings): Promise<string | null> {
    try {
      const jiraUrl = settings.url.replace(/\/$/, '');
      const auth = Buffer.from(`${settings.username}:${settings.password}`).toString('base64');
      const headers = {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      };

      // Пробуем разные версии API для совместимости
      const userSearchEndpoints = [
        '/rest/api/3/user/search',
        '/rest/api/2/user/search',
        '/rest/api/latest/user/search'
      ];
      
      let response;
      for (const endpoint of userSearchEndpoints) {
        try {
          response = await axios.get(`${jiraUrl}${endpoint}`, {
            headers,
            params: {
              query: email
            },
            timeout: 10000
          });
          if (response.status === 200) {
            break;
          }
        } catch (error: any) {
          // Продолжаем пробовать следующий эндпоинт
          continue;
        }
      }

      if (!response || response.status !== 200) {
        return null;
      }

      if (Array.isArray(response.data) && response.data.length > 0) {
        // В API v3 используется accountId, в v2 может быть key или name
        return response.data[0].accountId || response.data[0].key || response.data[0].name || null;
      }

      return null;
    } catch (error) {
      console.error('Ошибка поиска пользователя Jira:', error);
      return null;
    }
  }

  /**
   * Создать задачу в Jira для респондента
   */
  async createTaskForRespondent(
    participantName: string,
    respondentEmail: string
  ): Promise<{ success: boolean; taskKey?: string; taskUrl?: string; error?: string }> {
    try {
      const settings = await this.getSettings();

      if (!settings || !settings.enabled) {
        return { success: false, error: 'Интеграция с Jira выключена' };
      }

      if (!settings.projectKey || !settings.epicKey) {
        return { success: false, error: 'Проект или эпик не настроены' };
      }

      const jiraUrl = settings.url.replace(/\/$/, '');
      const auth = Buffer.from(`${settings.username}:${settings.password}`).toString('base64');

      // Найти пользователя Jira по email
      const assigneeAccountId = await this.findUserByEmail(respondentEmail, settings);
      if (!assigneeAccountId) {
        return { success: false, error: `Пользователь с email ${respondentEmail} не найден в Jira` };
      }

      // Создать задачу
      const taskTitle = `360 оценка сотрудника ${participantName}`;
      
      const taskData: any = {
        fields: {
          project: {
            key: settings.projectKey
          },
          summary: taskTitle,
          description: {
            type: 'doc',
            version: 1,
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: `Задача создана автоматически для проведения 360° оценки сотрудника ${participantName}.`
                  }
                ]
              }
            ]
          },
          issuetype: {
            name: 'Task'
          },
          assignee: {
            accountId: assigneeAccountId
          }
        }
      };

      // Установить Epic Link через customfield (для Jira Cloud обычно customfield_10011)
      // Если поле не существует, Jira вернет ошибку, которую мы обработаем
      taskData.fields['customfield_10011'] = settings.epicKey; // Epic Link (ключ эпика)

      // Пробуем разные версии API для совместимости
      const issueEndpoints = [
        '/rest/api/3/issue',
        '/rest/api/2/issue',
        '/rest/api/latest/issue'
      ];
      
      let response;
      let lastError: any = null;
      for (const endpoint of issueEndpoints) {
        try {
          response = await axios.post(`${jiraUrl}${endpoint}`, taskData, {
            headers: {
              'Authorization': `Basic ${auth}`,
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            timeout: 10000
          });
          if (response.status === 200 || response.status === 201) {
            break;
          }
        } catch (error: any) {
          lastError = error;
          // Продолжаем пробовать следующий эндпоинт
          continue;
        }
      }
      
      if (!response || (response.status !== 200 && response.status !== 201)) {
        throw lastError || new Error('Не удалось создать задачу');
      }

      if (response.data && response.data.key) {
        const taskKey = response.data.key;
        const taskUrl = `${jiraUrl}/browse/${taskKey}`;
        return { success: true, taskKey, taskUrl };
      }

      return { success: false, error: 'Не удалось создать задачу' };
    } catch (error: any) {
      console.error('Ошибка создания задачи в Jira:', error);
      let errorMessage = 'Ошибка создания задачи в Jira';
      if (error.response) {
        errorMessage += `: ${error.response.status} ${error.response.statusText}`;
        if (error.response.data && error.response.data.errors) {
          errorMessage += ` - ${JSON.stringify(error.response.data.errors)}`;
        }
      } else if (error.message) {
        errorMessage += `: ${error.message}`;
      }
      return { success: false, error: errorMessage };
    }
  }
}

export default new JiraService();

