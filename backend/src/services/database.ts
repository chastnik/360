import knex, { Knex } from 'knex';
import { config } from 'dotenv';
import path from 'path';

// Загружаем переменные окружения из корневого .env файла
config({ path: path.resolve(__dirname, '../../.env') });

interface DatabaseSettings {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

class DatabaseService {
  private envConnection: Knex | null = null;
  private runtimeConnection: Knex | null = null;
  private isInitialized: boolean = false;

  /**
   * Создать подключение на основе переменных окружения
   */
  private createEnvConnection(): Knex {
    const config = {
      client: 'postgresql',
      connection: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'assessment_db',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
      },
      pool: {
        min: 2,
        max: 10
      },
      migrations: {
        tableName: 'knex_migrations',
        directory: './migrations'
      },
      seeds: {
        directory: './seeds'
      }
    };

    return knex(config);
  }

  /**
   * Создать подключение на основе настроек из БД
   */
  private createConnectionFromSettings(settings: DatabaseSettings): Knex {
    const config = {
      client: 'postgresql',
      connection: {
        host: settings.host,
        port: settings.port,
        database: settings.database,
        user: settings.user,
        password: settings.password,
      },
      pool: {
        min: 2,
        max: 10
      },
      migrations: {
        tableName: 'knex_migrations',
        directory: './migrations'
      },
      seeds: {
        directory: './seeds'
      }
    };

    return knex(config);
  }

  /**
   * Получить настройки БД из system_settings таблицы
   */
  private async getSettingsFromDatabase(connection: Knex): Promise<DatabaseSettings | null> {
    try {
      const settings = await connection('system_settings')
        .whereIn('setting_key', ['db_host', 'db_port', 'db_name', 'db_user', 'db_password'])
        .where('category', 'database');

      if (settings.length === 0) {
        return null;
      }

      // Преобразовать в объект настроек
      const settingsMap = settings.reduce((acc: any, setting: any) => {
        acc[setting.setting_key] = setting.setting_value;
        return acc;
      }, {});

      // Проверить, что все необходимые настройки присутствуют
      if (!settingsMap.db_host || !settingsMap.db_name || !settingsMap.db_user) {
        console.warn('Неполные настройки БД в system_settings, используем .env');
        return null;
      }

      return {
        host: settingsMap.db_host,
        port: parseInt(settingsMap.db_port) || 5432,
        database: settingsMap.db_name,
        user: settingsMap.db_user,
        password: settingsMap.db_password || ''
      };
    } catch (error) {
      console.warn('Не удалось получить настройки БД из system_settings:', error);
      return null;
    }
  }

  /**
   * Инициализация подключения к БД
   */
  async initialize(): Promise<Knex> {
    if (this.isInitialized && this.getCurrentConnection()) {
      return this.getCurrentConnection()!;
    }

    try {
      // 1. Создаем подключение через .env (всегда нужно для первого запуска)
      this.envConnection = this.createEnvConnection();
      console.log('📦 Подключение к БД через .env установлено');

      // 2. Проверяем подключение
      await this.envConnection.raw('SELECT 1');

      // 3. Пытаемся получить настройки из БД
      try {
        const dbSettings = await this.getSettingsFromDatabase(this.envConnection);
        
        if (dbSettings) {
          // 4. Проверяем, отличаются ли настройки от .env
          const envSettings: DatabaseSettings = {
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432'),
            database: process.env.DB_NAME || 'assessment_db', 
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || ''
          };

          const isDifferent = this.compareSettings(envSettings, dbSettings);
          
          if (isDifferent) {
            console.log('🔄 Найдены отличающиеся настройки БД в system_settings');
            
            // 5. Создаем новое подключение с настройками из БД
            const testConnection = this.createConnectionFromSettings(dbSettings);
            await testConnection.raw('SELECT 1');
            
            this.runtimeConnection = testConnection;
            console.log('✅ Переключение на настройки БД из system_settings');
            
            this.isInitialized = true;
            return this.runtimeConnection;
          }
        }
      } catch (error) {
        console.warn('Не удалось использовать настройки из БД, используем .env:', error);
      }

      // 6. Используем .env подключение
      console.log('✅ Используется подключение через .env');
      this.isInitialized = true;
      return this.envConnection;

    } catch (error) {
      console.error('❌ Ошибка подключения к БД:', error);
      throw error;
    }
  }

  /**
   * Сравнить настройки БД
   */
  private compareSettings(env: DatabaseSettings, db: DatabaseSettings): boolean {
    return env.host !== db.host ||
           env.port !== db.port ||
           env.database !== db.database ||
           env.user !== db.user ||
           env.password !== db.password;
  }

  /**
   * Получить текущее активное подключение
   */
  getCurrentConnection(): Knex | null {
    return this.runtimeConnection || this.envConnection;
  }

  /**
   * Получить подключение через .env (для миграций и админ-операций)
   */
  getEnvConnection(): Knex | null {
    return this.envConnection;
  }

  /**
   * Переподключиться с новыми настройками из БД
   */
  async reconnectWithDatabaseSettings(): Promise<boolean> {
    try {
      if (!this.envConnection) {
        throw new Error('Нет .env подключения для чтения настроек');
      }

      const dbSettings = await this.getSettingsFromDatabase(this.envConnection);
      
      if (!dbSettings) {
        console.log('Настройки БД в system_settings не найдены');
        return false;
      }

      // Создать и протестировать новое подключение
      const newConnection = this.createConnectionFromSettings(dbSettings);
      await newConnection.raw('SELECT 1');

      // Закрыть старое runtime подключение
      if (this.runtimeConnection) {
        await this.runtimeConnection.destroy();
      }

      // Установить новое подключение
      this.runtimeConnection = newConnection;
      console.log('✅ Переподключение с новыми настройками БД выполнено');
      
      return true;
    } catch (error) {
      console.error('❌ Ошибка переподключения к БД:', error);
      return false;
    }
  }

  /**
   * Проверить подключение к БД с указанными параметрами
   */
  async testConnection(settings: DatabaseSettings): Promise<boolean> {
    let testConnection: Knex | null = null;
    
    try {
      testConnection = this.createConnectionFromSettings(settings);
      await testConnection.raw('SELECT 1');
      return true;
    } catch (error) {
      console.error('Ошибка тестирования подключения к БД:', error);
      return false;
    } finally {
      if (testConnection) {
        await testConnection.destroy();
      }
    }
  }

  /**
   * Закрыть все подключения
   */
  async disconnect(): Promise<void> {
    try {
      if (this.runtimeConnection) {
        await this.runtimeConnection.destroy();
        this.runtimeConnection = null;
      }
      
      if (this.envConnection) {
        await this.envConnection.destroy(); 
        this.envConnection = null;
      }
      
      this.isInitialized = false;
      console.log('🔌 Все подключения к БД закрыты');
    } catch (error) {
      console.error('Ошибка при закрытии подключений к БД:', error);
    }
  }
}

// Экспорт синглтона
const databaseService = new DatabaseService();

// Экспорт для обратной совместимости
export const db = new Proxy({} as Knex, {
  get(_target, prop, receiver) {
    const connection = databaseService.getCurrentConnection();
    if (!connection) {
      throw new Error('База данных не инициализирована. Вызовите databaseService.initialize() первым.');
    }
    return Reflect.get(connection, prop, receiver);
  }
});

export default databaseService;
export { DatabaseService }; 