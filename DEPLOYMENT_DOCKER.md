<!-- Автор: Стас Чашин @chastnik -->
# 🚀 Развертывание с Docker (Compose)

Этот документ описывает production-развертывание системы 360° с использованием Docker Compose.

## Требования
- Docker 20.10+
- Docker Compose v2 (команда `docker compose`)
- Порты: 80 (frontend), 5000 (backend), 5432 (PostgreSQL), 6379 (Redis)

## Структура
- `docker-compose.yml` - конфигурация всех сервисов
- `docker-setup.sh` - скрипт автоматической установки
- `backend/Dockerfile` - образ backend
- `frontend/Dockerfile` - образ frontend
- `nginx.conf` - конфигурация Nginx для frontend
- `.dockerignore` - исключения при сборке образов

## Быстрая установка (рекомендуется)

### Автоматическая установка

```bash
# 1. Клонирование репозитория
git clone https://github.com/chastnik/360.git
cd 360

# 2. Настройка переменных окружения
cp env.example .env
# Отредактируйте .env файл, обязательно измените:
# - DB_PASSWORD
# - JWT_SECRET
# - REDIS_PASSWORD

# 3. Автоматическая установка
./docker-setup.sh

# Скрипт выполнит:
# - Проверку зависимостей
# - Сборку Docker образов
# - Запуск всех сервисов
# - Выполнение миграций
# - Заполнение начальными данными (опционально)
```

### Ручная установка

#### 1) Клонирование и каталог
```bash
git clone https://github.com/chastnik/360.git
cd 360
```

#### 2) Переменные окружения
Создайте `.env` в корне (см. `env.example`):
```env
DB_NAME=assessment360
DB_USER=assessment_user
DB_PASSWORD=change_me_secure_password
JWT_SECRET=change_me_long_secret_minimum_32_characters
REDIS_PASSWORD=change_me_redis_password
FRONTEND_URL=http://localhost
MATTERMOST_URL=https://your-mattermost-server.com
MATTERMOST_TOKEN=your-mattermost-token
MATTERMOST_TEAM_ID=your-team-id
MATTERMOST_BOT_USERNAME=360-assessment-bot
```

**ВАЖНО:** Обязательно измените пароли и секреты перед запуском!

#### 3) Сборка и запуск
```bash
# Сборка образов и запуск
docker compose up -d --build

# Просмотр статуса
docker compose ps

# Логи (при необходимости)
docker compose logs -f
```

#### 4) Инициализация БД
Миграции/сиды вызываются командами npm внутри контейнера backend:
```bash
# Выполнение миграций
docker compose exec backend npm run migrate

# Заполнение начальными данными
docker compose exec backend npm run seed
```

#### 5) Проверка здоровья
```bash
# Backend
curl -f http://localhost:5000/health

# Frontend (ответ от Nginx)
curl -f http://localhost/health

# Проверка статуса всех сервисов
./docker-setup.sh status
```

## Управление системой

### Основные команды

```bash
# Запуск системы
./docker-setup.sh start
# или
docker compose up -d

# Остановка системы
./docker-setup.sh stop
# или
docker compose down

# Перезапуск системы
./docker-setup.sh restart
# или
docker compose restart

# Проверка статуса
./docker-setup.sh status
# или
docker compose ps

# Просмотр логов
./docker-setup.sh logs
# или
docker compose logs -f

# Просмотр логов конкретного сервиса
./docker-setup.sh logs backend
docker compose logs -f backend
```

### Выполнение миграций

```bash
# Автоматически через скрипт
./docker-setup.sh migrate

# Или вручную
docker compose exec backend npm run migrate
docker compose exec backend npm run seed
```

## Резервное копирование

```bash
# Создание резервной копии
docker compose exec database pg_dump -U "${DB_USER:-assessment_user}" "${DB_NAME:-assessment360}" > backup_$(date +%F_%H%M%S).sql

# Восстановление из резервной копии
docker compose exec -T database psql -U "${DB_USER:-assessment_user}" -d "${DB_NAME:-assessment360}" < backup.sql
```

## Обновление

```bash
# Остановка системы
docker compose down

# Обновление кода (если используется git)
git pull origin main

# Пересборка образов
docker compose build

# Запуск системы
docker compose up -d

# Выполнение миграций (если есть новые)
./docker-setup.sh migrate
```

## Масштабирование

Для масштабирования создайте файл `docker-compose.override.yml`:

```yaml
version: "3.9"
services:
  backend:
    deploy:
      replicas: 2
  frontend:
    deploy:
      replicas: 2
```

**Примечание:** Для полноценного масштабирования рекомендуется использовать Docker Swarm или Kubernetes.

## Healthchecks

Все сервисы имеют настроенные healthchecks:
- **database**: проверка готовности PostgreSQL
- **redis**: проверка доступности Redis
- **backend**: проверка эндпоинта `/health`
- **frontend**: проверка доступности Nginx

Проверить статус healthchecks:
```bash
docker compose ps
```

## Частые проблемы

### Проблема: Контейнеры не запускаются

**Решение:**
```bash
# Проверьте логи
docker compose logs

# Проверьте статус
docker compose ps

# Пересоберите образы
docker compose build --no-cache
```

### Проблема: База данных недоступна

**Решение:**
```bash
# Проверьте, что база данных запущена
docker compose ps database

# Проверьте логи базы данных
docker compose logs database

# Перезапустите базу данных
docker compose restart database
```

### Проблема: Backend не может подключиться к базе данных

**Решение:**
- Убедитесь, что в `.env` файле правильно указаны `DB_HOST=database`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- Проверьте, что база данных полностью запущена (healthcheck показывает healthy)
- Проверьте логи backend: `docker compose logs backend`

### Проблема: Frontend не отображается

**Решение:**
```bash
# Проверьте логи frontend
docker compose logs frontend

# Проверьте, что backend доступен
curl http://localhost:5000/health

# Перезапустите frontend
docker compose restart frontend
```

### Важные замечания

- Используйте `docker compose` (v2), а не `docker-compose` (v1)
- Убедитесь, что `.env` в корне содержит `FRONTEND_URL` — он нужен для CORS и ссылок в уведомлениях
- Все пароли и секреты должны быть изменены перед запуском в production
- Healthchecks автоматически проверяют готовность сервисов перед запуском зависимых контейнеров


