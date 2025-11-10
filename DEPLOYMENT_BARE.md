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
git clone <repo-url>
cd 360
```

### 2) Переменные окружения
Создайте `.env` в корне на основе `env.example`:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=assessment360
DB_USER=assessment_user
DB_PASSWORD=change_me

JWT_SECRET=change_me_long_secret
FRONTEND_URL=http://localhost:3000

REDIS_PASSWORD=change_me_redis
REDIS_PORT=6379

REACT_APP_API_URL=http://localhost:5000/api
```

Важно: сервер загружает `.env` из корня, фронтенд использует `REACT_APP_API_URL` при сборке.

### 3) Установка зависимостей
```bash
npm install
(cd backend && npm install)
(cd frontend && npm install)
```

### 4) База данных
Создайте пользователя и БД (пример в `INSTALL.md`). Примените миграции и сиды:
```bash
(cd backend && npm run migrate && npm run seed)
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
- Проверьте соответствие портов и `REACT_APP_API_URL`.
- Убедитесь, что `.env` в корне содержит `FRONTEND_URL` для корректного CORS.
- Эндпоинт здоровья бэкенда: `/health` (не `/api/health`).


