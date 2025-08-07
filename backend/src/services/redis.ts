import databaseService from './database';

class RedisService {
  private client: any = null;
  // private isInitialized: boolean = false; // Временно закомментировано
  private settings: any = null;

  /**
   * Инициализация Redis клиента с настройками из базы данных
   */
  async initialize(): Promise<void> {
    try {
      // Получить настройки Redis из базы данных
      const connection = databaseService.getCurrentConnection();
      if (!connection) {
        console.log('База данных не инициализирована, пропускаю настройку Redis');
        return;
      }
      
      const redisSettings = await connection('system_settings')
        .whereIn('setting_key', [
          'redis_enabled', 'redis_host', 'redis_port', 
          'redis_password', 'redis_db'
        ])
        .where('category', 'cache');

      // Преобразовать в удобный объект
      this.settings = redisSettings.reduce((acc: any, setting: any) => {
        acc[setting.setting_key] = this.convertValue(setting.setting_value, setting.setting_type);
        return acc;
      }, {});

      // Проверить, включен ли Redis
      if (!this.settings.redis_enabled) {
        console.log('Redis отключен в настройках');
        return;
      }

      // Настройки подключения
      const options: any = {
        socket: {
          host: this.settings.redis_host || 'localhost',
          port: this.settings.redis_port || 6379
        },
        database: this.settings.redis_db || 0
      };

      // Добавить пароль если указан
      if (this.settings.redis_password) {
        options.password = this.settings.redis_password;
      }

      // Создать клиент
      const { createClient } = require('redis');
      this.client = createClient(options);

      // Обработчики событий
      this.client.on('error', (err: Error) => {
        console.error('Ошибка Redis:', err);
      });

      this.client.on('connect', () => {
        console.log('📦 Подключение к Redis установлено');
      });

      this.client.on('ready', () => {
        console.log('✅ Redis готов к работе');
      });

      this.client.on('end', () => {
        console.log('🔌 Соединение с Redis закрыто');
      });

      // Подключиться
      await this.client.connect();

    } catch (error) {
      console.error('Ошибка инициализации Redis:', error);
      this.client = null;
    }
  }

  /**
   * Проверить, доступен ли Redis
   */
  isAvailable(): boolean {
    return this.client !== null && this.client.isOpen;
  }

  /**
   * Получить значение по ключу
   */
  async get(key: string): Promise<string | null> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      return await this.client!.get(key);
    } catch (error) {
      console.error('Ошибка чтения из Redis:', error);
      return null;
    }
  }

  /**
   * Установить значение с TTL
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      if (ttlSeconds) {
        await this.client!.setEx(key, ttlSeconds, value);
      } else {
        await this.client!.set(key, value);
      }
      return true;
    } catch (error) {
      console.error('Ошибка записи в Redis:', error);
      return false;
    }
  }

  /**
   * Удалить ключ
   */
  async del(key: string): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const result = await this.client!.del(key);
      return result > 0;
    } catch (error) {
      console.error('Ошибка удаления из Redis:', error);
      return false;
    }
  }

  /**
   * Проверить существование ключа
   */
  async exists(key: string): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const result = await this.client!.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Ошибка проверки существования ключа в Redis:', error);
      return false;
    }
  }

  /**
   * Установить TTL для ключа
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const result = await this.client!.expire(key, seconds);
      return result;
    } catch (error) {
      console.error('Ошибка установки TTL в Redis:', error);
      return false;
    }
  }

  /**
   * Получить JSON значение
   */
  async getJson<T>(key: string): Promise<T | null> {
    const value = await this.get(key);
    if (!value) return null;

    try {
      return JSON.parse(value) as T;
    } catch (error) {
      console.error('Ошибка парсинга JSON из Redis:', error);
      return null;
    }
  }

  /**
   * Установить JSON значение
   */
  async setJson(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    try {
      const jsonString = JSON.stringify(value);
      return await this.set(key, jsonString, ttlSeconds);
    } catch (error) {
      console.error('Ошибка сериализации JSON для Redis:', error);
      return false;
    }
  }

  /**
   * Переподключиться с новыми настройками
   */
  async reconnectWithNewSettings(): Promise<void> {
    // Закрыть текущее соединение
    if (this.client && this.client.isOpen) {
      await this.client.quit();
    }
    
    this.client = null;
    this.settings = null;

    // Инициализировать заново
    await this.initialize();
  }

  /**
   * Закрыть соединение
   */
  async disconnect(): Promise<void> {
    if (this.client && this.client.isOpen) {
      await this.client.quit();
    }
    this.client = null;
  }

  /**
   * Преобразование типов значений
   */
  private convertValue(value: string, type: string): any {
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
}

// Экспорт синглтона
const redisService = new RedisService();
export default redisService; 