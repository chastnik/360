<!-- Автор: Стас Чашин @chastnik -->
# 🚀 Развертывание без Docker (Bare-metal)

Этот документ описывает развертывание системы 360° на хосте без контейнеров.

## Требования
- Node.js >= 16
- npm >= 7
- PostgreSQL >= 12
- Redis >= 6 (если требуется рассылка/планировщик)
- Nginx (рекомендуется как reverse proxy и для статического фронтенда)

## Шаги

### 1) Клонирование
```bash
git clone https://github.com/chastnik/360.git
cd 360
```

### 2) Переменные окружения

**Важно:** Для установки без Docker нужны два `.env` файла:

#### Корневой `.env` файл
Создайте `.env` в корне на основе `env.example`:
```bash
cp env.example .env
```

Отредактируйте `.env`:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=assessment360
DB_USER=assessment_user
DB_PASSWORD=change_me_secure_password

JWT_SECRET=change_me_long_secret_minimum_32_characters
FRONTEND_URL=http://localhost:3000

REDIS_PASSWORD=change_me_redis
REDIS_PORT=6379

REACT_APP_API_URL=http://localhost:5000/api
```

#### Backend `.env` файл
Создайте `backend/.env` на основе `backend/env.example`:
```bash
cp backend/env.example backend/.env
```

Отредактируйте `backend/.env`:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=assessment360
DB_USER=assessment_user
DB_PASSWORD=change_me_secure_password

JWT_SECRET=change_me_long_secret_minimum_32_characters
PORT=5000
NODE_ENV=development

FRONTEND_URL=http://localhost:3000

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=change_me_redis

MATTERMOST_URL=https://your-mattermost-server.com
MATTERMOST_TOKEN=your-mattermost-token
```

**Примечание:** Backend использует `backend/.env`, фронтенд использует `REACT_APP_API_URL` из корневого `.env` при сборке.

### 3) Установка зависимостей
```bash
# Установка всех зависимостей (рекомендуется)
npm run install:all

# Или по отдельности:
npm install                    # Основные зависимости
cd backend && npm install     # Backend зависимости
cd ../frontend && npm install # Frontend зависимости
```

### 4) База данных

Создайте пользователя и БД (подробные инструкции см. в [INSTALL.md](INSTALL.md)):
```sql
-- Подключитесь к PostgreSQL под суперпользователем
sudo -u postgres psql

-- Создайте пользователя для приложения
CREATE USER assessment_user WITH PASSWORD 'your_password';

-- Создайте базу данных
CREATE DATABASE assessment360 OWNER assessment_user;

-- Предоставьте права пользователю
GRANT ALL PRIVILEGES ON DATABASE assessment360 TO assessment_user;

-- Выход из psql
\q
```

Примените миграции и сиды:
```bash
cd backend
npm run migrate  # Применить миграции
npm run seed      # Заполнить начальными данными
```

### 5) Сборка и запуск
```bash
# Сборка
cd backend && npm run build
cd ../frontend && npm run build

# Запуск backend
cd ../backend && npm start &

# Отдача фронтенда
# Вариант А: разверните содержимое frontend/build в ваш Nginx/статический хостинг
# Вариант Б: временно через любой static-server, например:
cd ../frontend && npx serve -s build -l 3000
```

**Или используйте скрипты:**
```bash
# Режим разработки
./dev.sh

# Продакшн режим
./start.sh --production
```

### 6) Reverse proxy (рекомендуется)
Минимальный конфиг Nginx (пример):
```nginx
server {
  listen 80;
  server_name _;

  root /var/www/assessment360;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location /api/ {
    proxy_pass http://127.0.0.1:5000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location /health {
    access_log off;
    return 200 "healthy\n";
    add_header Content-Type text/plain;
  }
}
```

### 7) Проверка здоровья
```bash
curl -f http://localhost:5000/health
curl -f http://localhost/health
```

### 8) Автозапуск (systemd + PM2, опционально)
- Рекомендуется использовать PM2 для управления процессом Node.js (`pm2 start backend/dist/server.js`).
- Создайте systemd unit для PM2 либо для вашего startup-скрипта.

### Резервное копирование
```bash
pg_dump -h localhost -U "$DB_USER" "$DB_NAME" > backup.sql
psql -h localhost -U "$DB_USER" "$DB_NAME" < backup.sql
```

### Частые проблемы

#### Проблема: Backend не может подключиться к базе данных
- Проверьте, что PostgreSQL запущен: `sudo systemctl status postgresql`
- Убедитесь, что в `backend/.env` правильно указаны `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- Проверьте права пользователя базы данных

#### Проблема: Frontend не может подключиться к API
- Проверьте соответствие портов и `REACT_APP_API_URL` в корневом `.env`
- Убедитесь, что backend запущен и доступен на порту 5000
- Проверьте CORS настройки в backend

#### Проблема: CORS ошибки
- Убедитесь, что в `backend/.env` правильно указан `FRONTEND_URL`
- Проверьте, что `FRONTEND_URL` соответствует URL, с которого открывается frontend

#### Проблема: Порт уже используется
```bash
# Найти процесс на порту
lsof -i :5000  # Backend
lsof -i :3000  # Frontend

# Остановить процесс
kill -9 <PID>
```

#### Другие замечания
- Эндпоинт здоровья бэкенда: `/health` (не `/api/health`)
- Для продакшн режима используйте `NODE_ENV=production` в `backend/.env`
- Рекомендуется использовать PM2 для управления процессами Node.js

## Дополнительные ресурсы

- [INSTALL.md](INSTALL.md) - подробная инструкция по установке
- [STARTUP_GUIDE.md](STARTUP_GUIDE.md) - руководство по первому запуску
- [LAUNCH_SCRIPTS.md](LAUNCH_SCRIPTS.md) - описание скриптов запуска
- [DEPLOYMENT_DOCKER.md](DEPLOYMENT_DOCKER.md) - развертывание с Docker (рекомендуется)
- [DEPLOYMENT.md](DEPLOYMENT.md) - общая документация по развертыванию

**Примечание:** Для развертывания с Docker рекомендуется использовать улучшенный скрипт `docker-setup.sh` версии 2.0.0, который автоматически проверяет зависимости, безопасно загружает переменные окружения и поддерживает неинтерактивный режим для автоматизации.


