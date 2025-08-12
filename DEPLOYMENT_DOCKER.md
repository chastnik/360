<!-- Автор: Стас Чашин @chastnik -->
# 🚀 Развертывание с Docker (Compose)

Этот документ описывает production-развертывание системы 360° с использованием Docker Compose.

## Требования
- Docker 20.10+
- Docker Compose v2 (команда `docker compose`)
- Порты: 80 (frontend), 5000 (backend), 5432 (PostgreSQL), 6379 (Redis)

## Структура
- `docker-compose.yml`
- `backend/Dockerfile`
- `frontend/Dockerfile`
- `nginx.conf` (используется во фронтенд-образе)

## Шаги

### 1) Клонирование и каталог
```bash
git clone <repo-url>
cd 360
```

### 2) Переменные окружения
Создайте `.env` в корне (см. `env.example`):
```env
DB_NAME=assessment360
DB_USER=assessment_user
DB_PASSWORD=change_me
JWT_SECRET=change_me_long_secret
REDIS_PASSWORD=change_me_redis
FRONTEND_URL=http://localhost
```

Примечания:
- Бэкенд слушает порт 5000 внутри контейнера, публикуется на хост `5000:5000`.
- Фронтенд отдаётся Nginx на 80 порту и проксирует `/api` на `backend:5000`.

### 3) Сборка и запуск
```bash
# Сборка образов и запуск
docker compose up -d --build

# Просмотр статуса
docker compose ps | cat

# Логи (при необходимости)
docker compose logs -f | cat
```

### 4) Инициализация БД
Миграции/сиды вызываются командами npm внутри контейнера backend:
```bash
docker compose exec backend npm run migrate
docker compose exec backend npm run seed
```

### 5) Проверка здоровья
```bash
# Backend
curl -f http://localhost:5000/health

# Frontend (ответ от Nginx)
curl -f http://localhost/health
```

## Резервное копирование
```bash
# Бэкап
docker compose exec database pg_dump -U "$DB_USER" "$DB_NAME" > backup_$(date +%F_%H%M%S).sql

# Восстановление
docker compose exec -T database psql -U "$DB_USER" -d "$DB_NAME" < backup.sql
```

## Обновление
```bash
docker compose pull
docker compose build
docker compose up -d
```

## Масштабирование
```yaml
# docker-compose.override.yml
services:
  backend:
    deploy:
      replicas: 2
  frontend:
    deploy:
      replicas: 2
```

## Частые проблемы
- Используйте `docker compose`, а не `docker-compose`, если установлен плагин v2.
- Убедитесь, что `.env` в корне содержит `FRONTEND_URL` — он нужен для CORS и ссылок в уведомлениях.


