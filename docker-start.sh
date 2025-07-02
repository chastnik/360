#!/bin/bash

# Скрипт запуска системы 360-градусной оценки персонала в Docker
# Поддерживает как разработку, так и продакшн
#
# Copyright (c) 2024 Стас Чашин для БИТ.Цифра
# Все права защищены

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Проверка Docker
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker не установлен!"
        log_info "Установите Docker с https://docker.com/"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker не запущен или недоступен!"
        exit 1
    fi
    
    log_success "Docker найден и запущен"
}

# Проверка Docker Compose
check_docker_compose() {
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose не установлен!"
        log_info "Установите Docker Compose или используйте Docker Desktop"
        exit 1
    fi
    
    log_success "Docker Compose найден"
}

# Создание Dockerfile если не существует
create_dockerfile() {
    if [ ! -f "Dockerfile" ]; then
        log_info "Создание Dockerfile..."
        cat > Dockerfile << 'EOF'
# Dockerfile for 360-degree feedback system
# Copyright (c) 2024 Стас Чашин для БИТ.Цифра
# Все права защищены

# Многоэтапная сборка для оптимизации размера образа
FROM node:22-alpine AS base

# Установка зависимостей только когда нужно
FROM base AS deps
WORKDIR /app

# Копирование файлов зависимостей
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Сборка приложения
FROM base AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# Генерация Prisma клиента
RUN npx prisma generate

# Сборка Next.js приложения
RUN npm run build

# Продакшн образ
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Копирование необходимых файлов
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
EOF
        log_success "Dockerfile создан"
    fi
}

# Создание docker-compose.yml если не существует
create_docker_compose() {
    if [ ! -f "docker-compose.yml" ]; then
        log_info "Создание docker-compose.yml..."
        cat > docker-compose.yml << 'EOF'
# Docker Compose configuration for 360-degree feedback system
# Copyright (c) 2024 Стас Чашин для БИТ.Цифра
# Все права защищены

version: '3.8'

services:
  app:
    build: .
    ports:
      - "${PORT:-3000}:3000"
    environment:
      - NODE_ENV=${NODE_ENV:-development}
      - DATABASE_URL=${DATABASE_URL:-file:/app/data/dev.db}
      - MATTERMOST_URL=${MATTERMOST_URL:-}
      - MATTERMOST_TOKEN=${MATTERMOST_TOKEN:-}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET:-your-secret-key-here}
      - NEXTAUTH_URL=${NEXTAUTH_URL:-http://localhost:3000}
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # Опциональная PostgreSQL база данных
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-feedback360}
      POSTGRES_USER: ${POSTGRES_USER:-feedback360}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-password}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped
    profiles:
      - postgres

volumes:
  postgres_data:
EOF
        log_success "docker-compose.yml создан"
    fi
}

# Создание .dockerignore если не существует
create_dockerignore() {
    if [ ! -f ".dockerignore" ]; then
        log_info "Создание .dockerignore..."
        cat > .dockerignore << 'EOF'
# Docker ignore file for 360-degree feedback system
# Copyright (c) 2024 Стас Чашин для БИТ.Цифра

node_modules
.next
.git
.env.local
.env.development.local
.env.test.local
.env.production.local
README.md
Dockerfile
.dockerignore
npm-debug.log*
yarn-debug.log*
yarn-error.log*
coverage
.nyc_output
.cache
.DS_Store
*.log
prisma/dev.db*
data/
logs/
EOF
        log_success ".dockerignore создан"
    fi
}

# Создание health check endpoint
create_health_endpoint() {
    if [ ! -f "app/api/health/route.ts" ]; then
        log_info "Создание health check endpoint..."
        mkdir -p app/api/health
        cat > app/api/health/route.ts << 'EOF'
// Health check endpoint for 360-degree feedback system
// Copyright (c) 2024 Стас Чашин для БИТ.Цифра

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    // Проверка подключения к базе данных
    await prisma.$queryRaw`SELECT 1`;
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0'
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Database connection failed'
      },
      { status: 503 }
    );
  }
}
EOF
        log_success "Health check endpoint создан"
    fi
}

# Настройка директорий для данных
setup_data_dirs() {
    mkdir -p data logs
    chmod 755 data logs
    log_success "Директории для данных созданы"
}

# Вывод справки
show_help() {
    echo "Скрипт запуска системы 360-градусной оценки персонала в Docker"
    echo ""
    echo "Использование: $0 [КОМАНДА] [ОПЦИИ]"
    echo ""
    echo "Команды:"
    echo "  build      Сборка Docker образа"
    echo "  up         Запуск контейнеров"
    echo "  down       Остановка контейнеров"
    echo "  restart    Перезапуск контейнеров"
    echo "  logs       Просмотр логов"
    echo "  shell      Подключение к контейнеру"
    echo "  clean      Очистка Docker ресурсов"
    echo ""
    echo "Опции:"
    echo "  --prod     Запуск в продакшн режиме"
    echo "  --postgres Использовать PostgreSQL вместо SQLite"
    echo "  --port     Указать порт (по умолчанию 3000)"
    echo "  --build    Пересобрать образ при запуске"
    echo ""
    echo "Примеры:"
    echo "  $0 up                 # Запуск в режиме разработки"
    echo "  $0 up --prod          # Запуск в продакшн режиме"
    echo "  $0 up --postgres      # Запуск с PostgreSQL"
    echo "  $0 logs               # Просмотр логов"
}

# Обработка аргументов
COMMAND=""
USE_POSTGRES=false
USE_PROD=false
FORCE_BUILD=false
PORT=3000

while [[ $# -gt 0 ]]; do
    case $1 in
        build|up|down|restart|logs|shell|clean)
            COMMAND=$1
            shift
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        --postgres)
            USE_POSTGRES=true
            shift
            ;;
        --prod)
            USE_PROD=true
            shift
            ;;
        --build)
            FORCE_BUILD=true
            shift
            ;;
        --port)
            PORT="$2"
            shift 2
            ;;
        *)
            log_error "Неизвестная опция: $1"
            show_help
            exit 1
            ;;
    esac
done

# Установка переменных окружения
setup_env() {
    export PORT=$PORT
    
    if [ "$USE_PROD" = true ]; then
        export NODE_ENV=production
    else
        export NODE_ENV=development
    fi
    
    if [ "$USE_POSTGRES" = true ]; then
        export DATABASE_URL="postgresql://feedback360:password@postgres:5432/feedback360"
        COMPOSE_PROFILES="postgres"
    else
        export DATABASE_URL="file:/app/data/dev.db"
        COMPOSE_PROFILES=""
    fi
}

# Основные команды
docker_build() {
    log_info "Сборка Docker образа..."
    docker build -t 360-feedback:latest .
    log_success "Образ собран"
}

docker_up() {
    local BUILD_FLAG=""
    if [ "$FORCE_BUILD" = true ]; then
        BUILD_FLAG="--build"
    fi
    
    local PROFILE_FLAG=""
    if [ -n "$COMPOSE_PROFILES" ]; then
        PROFILE_FLAG="--profile $COMPOSE_PROFILES"
    fi
    
    log_info "Запуск контейнеров..."
    docker-compose $PROFILE_FLAG up -d $BUILD_FLAG
    
    log_success "Контейнеры запущены"
    log_info "Приложение доступно по адресу: http://localhost:$PORT"
    
    # Ожидание готовности
    log_info "Ожидание готовности сервиса..."
    for i in {1..30}; do
        if curl -sf http://localhost:$PORT/api/health > /dev/null 2>&1; then
            log_success "Сервис готов!"
            break
        fi
        sleep 2
    done
}

docker_down() {
    log_info "Остановка контейнеров..."
    docker-compose down
    log_success "Контейнеры остановлены"
}

docker_restart() {
    docker_down
    docker_up
}

docker_logs() {
    log_info "Просмотр логов..."
    docker-compose logs -f app
}

docker_shell() {
    log_info "Подключение к контейнеру..."
    docker-compose exec app sh
}

docker_clean() {
    log_warning "Очистка Docker ресурсов..."
    docker-compose down -v
    docker system prune -f
    log_success "Очистка завершена"
}

# Основная логика
main() {
    if [ -z "$COMMAND" ]; then
        show_help
        exit 1
    fi
    
    log_info "🐳 Docker запуск системы 360-градусной оценки персонала"
    echo ""
    
    check_docker
    check_docker_compose
    setup_env
    
    case $COMMAND in
        build)
            create_dockerfile
            create_dockerignore
            docker_build
            ;;
        up)
            create_dockerfile
            create_docker_compose
            create_dockerignore
            create_health_endpoint
            setup_data_dirs
            docker_up
            ;;
        down)
            docker_down
            ;;
        restart)
            docker_restart
            ;;
        logs)
            docker_logs
            ;;
        shell)
            docker_shell
            ;;
        clean)
            docker_clean
            ;;
        *)
            log_error "Неизвестная команда: $COMMAND"
            show_help
            exit 1
            ;;
    esac
}

main "$@" 