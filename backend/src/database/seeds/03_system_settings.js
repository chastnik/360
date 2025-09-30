// © 2025 Бит.Цифра - Стас Чашин

// Автор: Стас Чашин @chastnik
exports.seed = async function(knex) {
  // Удаляем существующие записи
  await knex('system_settings').del();

  // Вставляем настройки по умолчанию
  await knex('system_settings').insert([
    // Общие настройки
    {
      setting_key: 'system_name',
      setting_value: 'Система 360° оценки',
      setting_type: 'string',
      description: 'Название системы',
      category: 'general',
      is_system: true
    },
    {
      setting_key: 'company_name',
      setting_value: '',
      setting_type: 'string',
      description: 'Название компании',
      category: 'general',
      is_system: true
    },
    {
      setting_key: 'admin_email',
      setting_value: '',
      setting_type: 'string',
      description: 'Email администратора',
      category: 'general',
      is_system: true
    },
    
    // Настройки базы данных
    {
      setting_key: 'db_host',
      setting_value: process.env.DB_HOST || 'localhost',
      setting_type: 'string',
      description: 'Хост базы данных PostgreSQL',
      category: 'database',
      is_system: true
    },
    {
      setting_key: 'db_port',
      setting_value: process.env.DB_PORT || '5432',
      setting_type: 'number',
      description: 'Порт базы данных PostgreSQL',
      category: 'database',
      is_system: true
    },
    {
      setting_key: 'db_name',
      setting_value: process.env.DB_NAME || 'assessment_db',
      setting_type: 'string',
      description: 'Имя базы данных PostgreSQL',
      category: 'database',
      is_system: true
    },
    {
      setting_key: 'db_user',
      setting_value: process.env.DB_USER || 'postgres',
      setting_type: 'string',
      description: 'Пользователь базы данных PostgreSQL',
      category: 'database',
      is_system: true
    },
    {
      setting_key: 'db_password',
      setting_value: process.env.DB_PASSWORD || '',
      setting_type: 'string',
      description: 'Пароль базы данных PostgreSQL',
      category: 'database',
      is_system: true,
      is_sensitive: true
    },
    
    // Настройки Redis
    {
      setting_key: 'redis_enabled',
      setting_value: 'true',
      setting_type: 'boolean',
      description: 'Включить использование Redis',
      category: 'cache',
      is_system: true
    },
    {
      setting_key: 'redis_host',
      setting_value: process.env.REDIS_HOST || 'localhost',
      setting_type: 'string',
      description: 'Хост Redis сервера',
      category: 'cache',
      is_system: true
    },
    {
      setting_key: 'redis_port',
      setting_value: process.env.REDIS_PORT || '6379',
      setting_type: 'number',
      description: 'Порт Redis сервера',
      category: 'cache',
      is_system: true
    },
    {
      setting_key: 'redis_password',
      setting_value: process.env.REDIS_PASSWORD || '',
      setting_type: 'string',
      description: 'Пароль Redis сервера',
      category: 'cache',
      is_system: true,
      is_sensitive: true
    },
    {
      setting_key: 'redis_db',
      setting_value: '0',
      setting_type: 'number',
      description: 'Номер базы данных Redis',
      category: 'cache',
      is_system: true
    },
    
    // Настройки уведомлений
    {
      setting_key: 'email_notifications',
      setting_value: 'true',
      setting_type: 'boolean',
      description: 'Включить email уведомления',
      category: 'notifications',
      is_system: true
    },
    {
      setting_key: 'mattermost_notifications',
      setting_value: 'true',
      setting_type: 'boolean',
      description: 'Включить Mattermost уведомления',
      category: 'integrations',
      is_system: true
    }
  ]);
}; 