#!/bin/bash

# Скрипт запуска системы 360-градусной оценки персонала
# Автор: Система 360
# Версия: 1.0.0

set -e  # Остановка при ошибке

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Функции для вывода
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${PURPLE}================================${NC}"
    echo -e "${PURPLE}  Система 360-градусной оценки${NC}"
    echo -e "${PURPLE}================================${NC}"
    echo
}

# Проверка наличия Node.js
check_node() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js не установлен. Установите Node.js версии 16 или выше."
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 16 ]; then
        print_error "Требуется Node.js версии 16 или выше. Текущая версия: $(node --version)"
        exit 1
    fi
    
    print_success "Node.js версии $(node --version) найден"
}

# Проверка наличия npm
check_npm() {
    if ! command -v npm &> /dev/null; then
        print_error "npm не установлен"
        exit 1
    fi
    
    print_success "npm версии $(npm --version) найден"
}

# Проверка наличия .env файла
check_env() {
    if [ ! -f ".env" ]; then
        print_warning "Файл .env не найден"
        if [ -f "env.example" ]; then
            print_info "Копирую env.example в .env..."
            cp env.example .env
            print_warning "Пожалуйста, отредактируйте файл .env с вашими настройками"
            print_info "Затем запустите скрипт снова"
            exit 1
        else
            print_error "Файл env.example не найден"
            exit 1
        fi
    fi
    
    print_success "Файл .env найден"
}

# Проверка и установка зависимостей
install_dependencies() {
    print_info "Проверка зависимостей..."
    
    # Проверка зависимостей корневого проекта
    if [ ! -d "node_modules" ]; then
        print_info "Установка зависимостей корневого проекта..."
        npm install
    fi
    
    # Проверка зависимостей backend
    if [ ! -d "backend/node_modules" ]; then
        print_info "Установка зависимостей backend..."
        cd backend && npm install && cd ..
    fi
    
    # Проверка зависимостей frontend
    if [ ! -d "frontend/node_modules" ]; then
        print_info "Установка зависимостей frontend..."
        cd frontend && npm install && cd ..
    fi
    
    print_success "Все зависимости установлены"
}

# Проверка базы данных
check_database() {
    print_info "Проверка подключения к базе данных..."
    
    # Загружаем переменные окружения
    source .env
    
    # Проверяем подключение к PostgreSQL
    if command -v psql &> /dev/null; then
        if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" &> /dev/null; then
            print_success "Подключение к PostgreSQL успешно"
        else
            print_warning "Не удалось подключиться к PostgreSQL"
            print_info "Убедитесь, что PostgreSQL запущен и настройки в .env корректны"
        fi
    else
        print_warning "psql не найден, пропускаю проверку подключения к БД"
    fi
}

# Запуск миграций
run_migrations() {
    print_info "Запуск миграций базы данных..."
    
    # Загружаем переменные окружения
    source .env
    
    if cd backend && DB_HOST="$DB_HOST" DB_NAME="$DB_NAME" DB_USER="$DB_USER" DB_PASSWORD="$DB_PASSWORD" DB_PORT="$DB_PORT" npm run migrate; then
        print_success "Миграции выполнены успешно"
    else
        print_error "Ошибка при выполнении миграций"
        exit 1
    fi
    cd ..
}

# Запуск сидов
run_seeds() {
    print_info "Запуск сидов базы данных..."
    
    # Загружаем переменные окружения
    source .env
    
    if cd backend && DB_HOST="$DB_HOST" DB_NAME="$DB_NAME" DB_USER="$DB_USER" DB_PASSWORD="$DB_PASSWORD" DB_PORT="$DB_PORT" npm run seed; then
        print_success "Сиды выполнены успешно"
    else
        print_error "Ошибка при выполнении сидов"
        exit 1
    fi
    cd ..
}

# Сборка frontend
build_frontend() {
    print_info "Сборка frontend..."
    
    if cd frontend && npm run build; then
        print_success "Frontend собран успешно"
    else
        print_error "Ошибка при сборке frontend"
        exit 1
    fi
    cd ..
}

# Сборка backend
build_backend() {
    print_info "Сборка backend..."
    
    if cd backend && npm run build; then
        print_success "Backend собран успешно"
    else
        print_error "Ошибка при сборке backend"
        exit 1
    fi
    cd ..
}

# Запуск в режиме разработки
start_dev() {
    print_info "Запуск в режиме разработки..."
    print_info "Backend будет доступен на http://localhost:3001"
    print_info "Frontend будет доступен на http://localhost:3000"
    print_info "Для остановки нажмите Ctrl+C"
    echo
    
    npm run dev
}

# Запуск в продакшн режиме
start_production() {
    print_info "Запуск в продакшн режиме..."
    
    # Сборка проектов
    build_backend
    build_frontend
    
    # Запуск backend
    print_info "Запуск backend..."
    cd backend && npm start &
    BACKEND_PID=$!
    cd ..
    
    # Ожидание запуска backend
    sleep 3
    
    # Проверка что backend запустился
    if curl -s http://localhost:3001/api/health &> /dev/null; then
        print_success "Backend запущен успешно"
    else
        print_error "Backend не запустился"
        kill $BACKEND_PID 2>/dev/null
        exit 1
    fi
    
    print_info "Система запущена!"
    print_info "Backend: http://localhost:3001"
    print_info "Frontend: http://localhost:80 (через nginx)"
    print_info "Для остановки нажмите Ctrl+C"
    
    # Ожидание сигнала завершения
    trap "echo; print_info 'Остановка системы...'; kill $BACKEND_PID 2>/dev/null; exit 0" INT TERM
    wait
}

# Показать справку
show_help() {
    echo "Использование: $0 [опции]"
    echo
    echo "Опции:"
    echo "  -h, --help          Показать эту справку"
    echo "  -d, --dev           Запуск в режиме разработки"
    echo "  -p, --production    Запуск в продакшн режиме"
    echo "  -i, --install       Только установка зависимостей"
    echo "  -m, --migrate       Только выполнение миграций"
    echo "  -s, --seed          Только выполнение сидов"
    echo "  -b, --build         Только сборка проектов"
    echo "  -c, --check         Только проверка окружения"
    echo
    echo "Примеры:"
    echo "  $0 --dev            # Запуск в режиме разработки"
    echo "  $0 --production     # Запуск в продакшн режиме"
    echo "  $0 --install        # Установка зависимостей"
    echo
}

# Основная функция
main() {
    print_header
    
    # Парсинг аргументов
    MODE="dev"
    INSTALL_ONLY=false
    MIGRATE_ONLY=false
    SEED_ONLY=false
    BUILD_ONLY=false
    CHECK_ONLY=false
    
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
            -p|--production)
                MODE="production"
                shift
                ;;
            -i|--install)
                INSTALL_ONLY=true
                shift
                ;;
            -m|--migrate)
                MIGRATE_ONLY=true
                shift
                ;;
            -s|--seed)
                SEED_ONLY=true
                shift
                ;;
            -b|--build)
                BUILD_ONLY=true
                shift
                ;;
            -c|--check)
                CHECK_ONLY=true
                shift
                ;;
            *)
                print_error "Неизвестная опция: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # Проверки окружения
    check_node
    check_npm
    check_env
    
    if [ "$CHECK_ONLY" = true ]; then
        print_success "Проверка окружения завершена"
        exit 0
    fi
    
    # Установка зависимостей
    install_dependencies
    
    if [ "$INSTALL_ONLY" = true ]; then
        print_success "Установка зависимостей завершена"
        exit 0
    fi
    
    # Проверка базы данных
    check_database
    
    # Выполнение миграций
    if [ "$MIGRATE_ONLY" = true ]; then
        run_migrations
        print_success "Миграции выполнены"
        exit 0
    fi
    
    # Выполнение сидов
    if [ "$SEED_ONLY" = true ]; then
        run_seeds
        print_success "Сиды выполнены"
        exit 0
    fi
    
    # Сборка проектов
    if [ "$BUILD_ONLY" = true ]; then
        build_backend
        build_frontend
        print_success "Сборка завершена"
        exit 0
    fi
    
    # Выполнение миграций и сидов для полного запуска
    if [ "$MODE" = "production" ]; then
        run_migrations
        run_seeds
    fi
    
    # Запуск системы
    if [ "$MODE" = "dev" ]; then
        start_dev
    elif [ "$MODE" = "production" ]; then
        start_production
    fi
}

# Запуск основной функции
main "$@" 