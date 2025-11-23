<!-- Автор: Стас Чашин @chastnik -->
# Инструкция по установке и настройке системы 360° Assessment

## Требования к системе

### Для установки с Docker (рекомендуется)

- **Docker** 20.10+ и **Docker Compose** v2
- Порты: 80 (frontend), 5000 (backend), 5432 (PostgreSQL), 6379 (Redis)

### Для установки без Docker

- **Node.js** v16.0.0 или выше
- **PostgreSQL** v12.0 или выше
- **npm** v7.0.0 или выше
- **Git**

## Пошаговая установка

### Вариант 1: Установка с Docker (рекомендуется)

#### 1. Клонирование репозитория

```bash
git clone https://github.com/chastnik/360.git
cd 360
```

#### 2. Настройка переменных окружения

```bash
# Создание .env файла из примера
cp env.example .env

# Редактирование .env файла
nano .env  # или используйте любой редактор
```

**Обязательно измените следующие переменные:**
- `DB_PASSWORD` - пароль для базы данных
- `JWT_SECRET` - секретный ключ для JWT (минимум 32 символа)
- `REDIS_PASSWORD` - пароль для Redis
- `ENCRYPTION_KEY` - ключ шифрования для Jira (128-bit, 32 hex символа)
  - Генерация: `openssl rand -hex 16`
- `MATTERMOST_TOKEN` - токен бота Mattermost (если используется)

#### 3. Автоматическая установка

```bash
# Запуск скрипта автоматической установки
./docker-setup.sh

# Скрипт выполнит:
# - Проверку зависимостей
# - Сборку Docker образов
# - Запуск всех сервисов
# - Выполнение миграций базы данных
# - Заполнение начальными данными (опционально)
```

#### 4. Проверка установки

```bash
# Проверка статуса
./docker-setup.sh status

# Просмотр логов
docker compose logs -f
```

Система будет доступна по адресам:
- **Frontend**: http://localhost
- **Backend API**: http://localhost:5000/api

**Учетные данные по умолчанию** (после выполнения seed):
- Email: `admin@company.com` / Пароль: `admin123`
- Email: `manager@company.com` / Пароль: `manager123`
- Email: `user@company.com` / Пароль: `user123`

#### 5. Управление системой

```bash
# Остановка
./docker-setup.sh stop
# или
docker compose down

# Запуск
./docker-setup.sh start
# или
docker compose up -d

# Перезапуск
./docker-setup.sh restart

# Выполнение миграций
./docker-setup.sh migrate

# Заполнение начальными данными
./docker-setup.sh seed
```

Подробнее см. [DEPLOYMENT_DOCKER.md](DEPLOYMENT_DOCKER.md)

### Вариант 2: Установка без Docker

#### 1. Клонирование репозитория

```bash
git clone https://github.com/chastnik/360.git
cd 360
```

#### 2. Установка зависимостей

```bash
# Установка зависимостей для всех частей проекта
npm run install:all

# Или по отдельности:
npm install                    # Основные зависимости
cd backend && npm install     # Backend зависимости
cd ../frontend && npm install # Frontend зависимости
```

#### 3. Настройка переменных окружения

```bash
# Создание .env файла в корне проекта
cp env.example .env

# Редактирование файла
nano .env
```

**Важно:** Система использует только один `.env` файл в корне проекта. Backend автоматически загружает переменные окружения из корневого `.env` файла.

#### 4. Настройка базы данных PostgreSQL

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

#### 5. Настройка интеграции с Mattermost

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

#### 6. Инициализация базы данных

```bash
# Из корневой папки проекта
# Автоматическое развертывание (рекомендуется)
cd backend && ./scripts/deploy-migrations.sh --with-seeds

# Или вручную
cd backend
# Для development окружения
NODE_ENV=development npm run migrate   # Применить миграции
# Для production окружения
NODE_ENV=production npm run migrate
npm run seed      # Заполнить базу тестовыми данными

# Важно: Миграция 20250131000000_add_performance_indexes.js добавляет
# индексы для оптимизации производительности запросов
```

#### 7. Запуск приложения

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

### Для Docker установки

1. Откройте браузер и перейдите на `http://localhost`
2. Вы должны увидеть страницу входа в систему
3. Войдите с учетными данными по умолчанию (см. выше)
4. Проверьте работу API: `http://localhost:5000/api`

### Для установки без Docker

1. Откройте браузер и перейдите на `http://localhost:3000`
2. Вы должны увидеть страницу входа в систему
3. Попробуйте зарегистрировать нового пользователя
4. Проверьте, что пароль приходит в Mattermost (если настроено)

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