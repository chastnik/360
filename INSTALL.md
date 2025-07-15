# Инструкция по установке и настройке системы 360° Assessment

## Требования к системе

- **Node.js** v16.0.0 или выше
- **PostgreSQL** v12.0 или выше
- **npm** v7.0.0 или выше
- **Git**

## Пошаговая установка

### 1. Клонирование репозитория

```bash
git clone https://github.com/your-org/360-assessment-system.git
cd 360-assessment-system
```

### 2. Установка зависимостей

```bash
# Установка зависимостей для всех частей проекта
npm run install:all

# Или по отдельности:
npm install                    # Основные зависимости
cd backend && npm install     # Backend зависимости
cd ../frontend && npm install # Frontend зависимости
```

### 3. Настройка базы данных PostgreSQL

#### Создание базы данных

```sql
-- Подключитесь к PostgreSQL под суперпользователем
sudo -u postgres psql

-- Создайте пользователя для приложения
CREATE USER assessment_user WITH PASSWORD 'your_password';

-- Создайте базу данных
CREATE DATABASE assessment_db OWNER assessment_user;

-- Предоставьте права пользователю
GRANT ALL PRIVILEGES ON DATABASE assessment_db TO assessment_user;

-- Выход из psql
\q
```

### 4. Конфигурация переменных окружения

#### Backend (.env)

Создайте файл `.env` в папке `backend/`:

```bash
cd backend
cp env.example .env
```

Отредактируйте файл `.env`:

```env
# База данных
DB_HOST=localhost
DB_PORT=5432
DB_NAME=assessment_db
DB_USER=assessment_user
DB_PASSWORD=your_password

# JWT секрет (сгенерируйте надежный ключ)
JWT_SECRET=your-super-secret-jwt-key-here

# Сервер
PORT=5000
NODE_ENV=development

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Mattermost настройки
MATTERMOST_URL=https://your-mattermost-instance.com
MATTERMOST_TOKEN=your-bot-token-here
```

#### Frontend (.env)

Создайте файл `.env` в папке `frontend/`:

```env
REACT_APP_API_URL=http://localhost:5000/api
```

### 5. Настройка интеграции с Mattermost

#### Создание бота в Mattermost

1. Войдите в Mattermost как администратор
2. Перейдите в **System Console** → **Integrations** → **Bot Accounts**
3. Включите Bot Accounts если они отключены
4. Создайте нового бота:
   - **Username**: `assessment-bot`
   - **Display Name**: `360° Assessment Bot`
   - **Description**: `Бот для системы 360-градусной оценки`
   - **Role**: `System Admin` (или создайте специальную роль)

5. Скопируйте токен бота и добавьте в `.env` файл

#### Настройка разрешений

1. Убедитесь, что бот имеет права на:
   - Отправку прямых сообщений
   - Поиск пользователей по email
   - Создание постов в каналах

### 6. Инициализация базы данных

```bash
# Из корневой папки проекта
npm run db:migrate   # Применить миграции
npm run db:seed     # Заполнить базу тестовыми данными
```

### 7. Запуск приложения

#### Режим разработки

```bash
# Запуск backend и frontend одновременно
npm run dev

# Или по отдельности:
npm run backend:dev   # Backend на порту 5000
npm run frontend:dev  # Frontend на порту 3000
```

#### Производственный режим

```bash
# Сборка frontend
npm run build

# Запуск backend в продакшен режиме
npm start
```

## Проверка установки

1. Откройте браузер и перейдите на `http://localhost:3000`
2. Вы должны увидеть страницу входа в систему
3. Попробуйте зарегистрировать нового пользователя
4. Проверьте, что пароль приходит в Mattermost

## Пользователи по умолчанию

После выполнения seed команды будут созданы следующие пользователи:

- **admin@company.com** - Администратор (пароль: `admin123`)
- **manager@company.com** - Менеджер (пароль: `manager123`)
- **user@company.com** - Пользователь (пароль: `user123`)

## Структура проекта

```
360-assessment-system/
├── backend/                 # Backend API (Node.js + Express)
│   ├── src/
│   │   ├── controllers/    # Контроллеры API
│   │   ├── database/       # Миграции и seeds
│   │   ├── middleware/     # Middleware функции
│   │   ├── routes/         # Маршруты API
│   │   ├── services/       # Бизнес-логика
│   │   └── types/          # TypeScript типы
│   ├── knexfile.js         # Конфигурация Knex
│   └── package.json
├── frontend/               # Frontend приложение (React)
│   ├── src/
│   │   ├── components/     # React компоненты
│   │   ├── contexts/       # React контексты
│   │   ├── pages/          # Страницы приложения
│   │   ├── services/       # API сервисы
│   │   └── styles/         # Стили
│   ├── public/
│   ├── tailwind.config.js  # Конфигурация Tailwind
│   └── package.json
├── README.md
├── INSTALL.md
└── package.json
```

## Возможные проблемы и решения

### База данных

**Проблема**: Ошибка подключения к PostgreSQL
**Решение**: 
- Убедитесь, что PostgreSQL запущен
- Проверьте настройки подключения в `.env`
- Проверьте права пользователя базы данных

### Mattermost

**Проблема**: Бот не может отправлять сообщения
**Решение**:
- Проверьте токен бота
- Убедитесь, что бот имеет необходимые разрешения
- Проверьте URL Mattermost сервера

### Порты

**Проблема**: Порт уже используется
**Решение**:
- Измените порт в переменных окружения
- Остановите процесс, использующий порт: `lsof -ti:5000 | xargs kill`

## Дополнительные настройки

### Настройка HTTPS

Для продакшен среды рекомендуется настроить HTTPS:

1. Получите SSL сертификат
2. Настройте reverse proxy (nginx/Apache)
3. Обновите переменные окружения

### Мониторинг и логирование

Для продакшен среды рекомендуется:

1. Настроить логирование в файлы
2. Использовать PM2 для управления процессами
3. Настроить мониторинг производительности

### Резервное копирование

Настройте автоматическое резервное копирование базы данных:

```bash
# Создание бэкапа
pg_dump -h localhost -U assessment_user assessment_db > backup.sql

# Восстановление из бэкапа
psql -h localhost -U assessment_user assessment_db < backup.sql
```

## Поддержка

Если у вас возникли проблемы:

1. Проверьте логи приложения
2. Убедитесь, что все зависимости установлены
3. Проверьте конфигурационные файлы
4. Обратитесь к документации или создайте issue

## Лицензия

MIT License - смотрите файл LICENSE для подробностей. 