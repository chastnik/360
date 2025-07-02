#!/bin/bash

# Скрипт запуска системы 360-градусной оценки персонала
# Поддерживает Linux/macOS
# 
# Copyright (c) 2025 Стас Чашин для БИТ.Цифра
# Все права защищены

set -e  # Остановка при ошибке

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция логирования
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

# Проверка Node.js
check_node() {
    if ! command -v node &> /dev/null; then
        log_error "Node.js не установлен!"
        log_info "Установите Node.js версии 18+ с https://nodejs.org/"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1)
    
    if [ "$MAJOR_VERSION" -lt 18 ]; then
        log_error "Требуется Node.js версии 18+, установлена версия $NODE_VERSION"
        exit 1
    fi
    
    log_success "Node.js версии $NODE_VERSION найдена"
}

# Проверка npm
check_npm() {
    if ! command -v npm &> /dev/null; then
        log_error "npm не установлен!"
        exit 1
    fi
    
    NPM_VERSION=$(npm --version)
    log_success "npm версии $NPM_VERSION найдена"
}

# Установка зависимостей
install_dependencies() {
    if [ ! -d "node_modules" ]; then
        log_info "Установка зависимостей..."
        npm install
        log_success "Зависимости установлены"
    else
        log_info "Зависимости уже установлены, проверяем обновления..."
        npm ci
    fi
}

# Настройка базы данных
setup_database() {
    log_info "Настройка базы данных..."
    
    # Генерация Prisma клиента
    npx prisma generate
    
    # Проверка существования базы данных
    if [ ! -f "prisma/dev.db" ]; then
        log_info "Создание базы данных..."
        npx prisma db push
        
        log_info "Заполнение базы данных тестовыми данными..."
        npx prisma db seed
        
        log_success "База данных создана и заполнена"
    else
        log_info "База данных уже существует"
        
        # Применение миграций если есть изменения
        npx prisma db push
        log_success "База данных обновлена"
    fi
}

# Проверка переменных окружения
check_env() {
    if [ ! -f ".env" ]; then
        log_warning ".env файл не найден, создаю из примера..."
        cp .env.example .env 2>/dev/null || {
            log_info "Создаю .env файл с базовыми настройками..."
            cat > .env << EOF
# База данных
DATABASE_URL="file:./dev.db"

# Mattermost интеграция (опционально)
MATTERMOST_URL=""
MATTERMOST_TOKEN=""

# Настройки приложения
NODE_ENV="development"
PORT=3000

# Секретный ключ для сессий
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
EOF
            log_success ".env файл создан"
        }
    fi
    
    log_success "Переменные окружения настроены"
}

# Запуск в режиме разработки
start_dev() {
    log_info "Запуск в режиме разработки..."
    npm run dev
}

# Запуск в продакшн режиме
start_prod() {
    log_info "Сборка приложения для продакшн..."
    npm run build
    
    log_info "Запуск в продакшн режиме..."
    npm start
}

# Проверка портов
check_port() {
    PORT=${1:-3000}
    if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        log_warning "Порт $PORT уже занят!"
        log_info "Попытка найти процесс:"
        lsof -Pi :$PORT -sTCP:LISTEN
        read -p "Хотите завершить процесс и продолжить? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            kill -9 $(lsof -Pi :$PORT -sTCP:LISTEN -t) 2>/dev/null || true
            log_success "Процесс завершен"
        else
            log_error "Выберите другой порт или завершите процесс вручную"
            exit 1
        fi
    fi
}

# Вывод справки
show_help() {
    echo "Скрипт запуска системы 360-градусной оценки персонала"
    echo ""
    echo "Использование: $0 [ОПЦИИ]"
    echo ""
    echo "Опции:"
    echo "  -h, --help     Показать справку"
    echo "  -d, --dev      Запуск в режиме разработки (по умолчанию)"
    echo "  -p, --prod     Запуск в продакшн режиме"
    echo "  -c, --check    Только проверка зависимостей"
    echo "  -s, --setup    Только настройка без запуска"
    echo "  --port PORT    Указать порт (по умолчанию 3000)"
    echo "  --skip-deps    Пропустить установку зависимостей"
    echo "  --force-seed   Пересоздать базу данных с тестовыми данными"
    echo ""
    echo "Примеры:"
    echo "  $0                    # Запуск в режиме разработки"
    echo "  $0 --prod             # Запуск в продакшн режиме"
    echo "  $0 --port 8080        # Запуск на порту 8080"
    echo "  $0 --setup            # Только настройка"
}

# Обработка аргументов командной строки
MODE="dev"
SKIP_DEPS=false
FORCE_SEED=false
SETUP_ONLY=false
CHECK_ONLY=false
PORT=3000

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -d|--dev)
            MODE="dev"
            shift
            ;;
        -p|--prod)
            MODE="prod"
            shift
            ;;
        -c|--check)
            CHECK_ONLY=true
            shift
            ;;
        -s|--setup)
            SETUP_ONLY=true
            shift
            ;;
        --port)
            PORT="$2"
            shift 2
            ;;
        --skip-deps)
            SKIP_DEPS=true
            shift
            ;;
        --force-seed)
            FORCE_SEED=true
            shift
            ;;
        *)
            log_error "Неизвестная опция: $1"
            show_help
            exit 1
            ;;
    esac
done

# Основная логика
main() {
    log_info "🚀 Запуск системы 360-градусной оценки персонала"
    log_info "Режим: $MODE, Порт: $PORT"
    echo ""
    
    # Проверки
    check_node
    check_npm
    
    if [ "$CHECK_ONLY" = true ]; then
        log_success "Все проверки пройдены!"
        exit 0
    fi
    
    # Настройка
    check_env
    
    if [ "$SKIP_DEPS" = false ]; then
        install_dependencies
    fi
    
    # Пересоздание базы данных если нужно
    if [ "$FORCE_SEED" = true ]; then
        log_warning "Пересоздание базы данных..."
        rm -f prisma/dev.db
    fi
    
    setup_database
    
    if [ "$SETUP_ONLY" = true ]; then
        log_success "Настройка завершена!"
        exit 0
    fi
    
    # Проверка портов
    check_port $PORT
    
    # Запуск
    echo ""
    log_success "🎉 Настройка завершена! Запуск приложения..."
    log_info "Приложение будет доступно по адресу: http://localhost:$PORT"
    log_info "Для остановки нажмите Ctrl+C"
    echo ""
    
    if [ "$MODE" = "prod" ]; then
        start_prod
    else
        start_dev
    fi
}

# Обработка сигналов для graceful shutdown
cleanup() {
    echo ""
    log_info "Получен сигнал остановки..."
    log_info "Завершение работы..."
    exit 0
}

trap cleanup SIGINT SIGTERM

# Запуск
main "$@" 