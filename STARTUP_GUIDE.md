# Руководство по запуску системы 360°

## Проблема "курицы и яйца" 🐔🥚

Система использует **двухуровневую архитектуру настроек**:

1. **Уровень 1**: `.env` файлы - для первоначального подключения к БД
2. **Уровень 2**: Настройки в БД - для runtime конфигурации через админ-панель

## Последовательность первого запуска

### 1. Настройка переменных окружения

Создайте файл `backend/.env` на основе `backend/env.example`:

```bash
# База данных (ОБЯЗАТЕЛЬНО для первого запуска)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=assessment_db
DB_USER=postgres
DB_PASSWORD=your_password

# JWT секрет (ОБЯЗАТЕЛЬНО)
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters

# Redis (опционально - для первоначальных настроек в БД)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# Mattermost (опционально)
MATTERMOST_URL=https://your-mattermost-server.com
MATTERMOST_TOKEN=your-token

# Сервер
PORT=5000
FRONTEND_URL=http://localhost:3000
```

### 2. Подготовка базы данных

```bash
cd backend

# Установка зависимостей
npm install

# Создание таблиц (использует .env настройки)
npm run migrate

# Заполнение начальными данными (копирует .env в system_settings)
npm run seed
```

### 3. Создание администратора

```bash
# Создайте пользователя-администратора через API или напрямую в БД
# Или используйте регистрацию и вручную смените роль на 'admin'
```

### 4. Запуск системы

```bash
# Backend
cd backend
npm run dev

# Frontend (в новом терминале)
cd frontend  
npm start
```

### 5. Настройка через админ-панель

1. Войдите как администратор
2. Перейдите в **Администрирование** → **Настройки системы**
3. Настройте подключения к **внешним** серверам БД/Redis если нужно
4. Сохраните и перезапустите приложение

## Архитектура настроек

### Файл connection.ts (текущий)
```typescript
// ❌ Проблема: всегда использует .env
const knexConfig = {
  client: 'postgresql',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'assessment_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
  }
};
```

### Нужно: Умное подключение
```typescript
// ✅ Решение: сначала .env, потом настройки из БД
async function createDatabaseConnection() {
  // 1. Первоначальное подключение через .env
  const envConnection = createEnvConnection();
  
  try {
    // 2. Попытка получить настройки из БД
    const dbSettings = await getSettingsFromDatabase(envConnection);
    
    // 3. Если есть настройки в БД - использовать их
    if (dbSettings) {
      return createConnectionFromSettings(dbSettings);
    }
  } catch (error) {
    console.warn('Используются настройки из .env');
  }
  
  // 4. Fallback на .env
  return envConnection;
}
```

## Сценарии использования

### 🏠 Локальная разработка
```bash
# .env файл - все локально
DB_HOST=localhost
DB_PORT=5432
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 🏢 Продакшн с внешними сервисами
```bash
# .env файл - только для первого запуска/миграций  
DB_HOST=localhost
DB_PORT=5432

# Админ-панель - продакшн настройки
БД: production-db.company.com:5432
Redis: redis.company.com:6379
```

### ☁️ Облачное развертывание
```bash
# .env файл - переменные окружения контейнера
DB_HOST=${DATABASE_URL_HOST}
DB_PORT=${DATABASE_URL_PORT}

# Админ-панель - managed сервисы
БД: managed-postgres.aws.com:5432  
Redis: elasticache.aws.com:6379
```

## Часто задаваемые вопросы

### ❓ Можно ли полностью убрать .env настройки БД?
**Нет**. Они нужны для миграций и первого запуска.

### ❓ Что происходит при изменении настроек в админ-панели?
Новые настройки сохраняются в БД, но **требуется перезапуск** приложения для применения настроек БД.

### ❓ Как переключиться на внешнюю БД?
1. Настройте подключение через админ-панель
2. Протестируйте подключение  
3. Перезапустите приложение
4. Приложение автоматически переключится на новые настройки

### ❓ Что если настройки в БД некорректны?
Система автоматически вернется к настройкам из `.env` файла как fallback.

### ❓ Как сделать бэкап настроек?
```sql
-- Экспорт настроек
pg_dump -t system_settings assessment_db > settings_backup.sql

-- Импорт настроек  
psql assessment_db < settings_backup.sql
```

## Улучшения архитектуры

В будущем можно реализовать:
- 🔄 Hot reload настроек БД без перезапуска
- 🔄 Connection pooling с динамическим переключением
- 📊 Мониторинг состояния подключений
- 🔐 Шифрование чувствительных настроек 