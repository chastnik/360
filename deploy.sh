#!/bin/bash
# Автор: Стас Чашин @chastnik

# Скрипт для развертывания системы 360° оценки

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция для вывода логов
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

# Функция для проверки зависимостей
check_dependencies() {
    log "Проверка зависимостей..."
    
    if ! command -v docker &> /dev/null; then
        error "Docker не установлен. Пожалуйста, установите Docker"
        exit 1
    fi
    
    if ! docker compose version &> /dev/null && ! command -v docker-compose &> /dev/null; then
        error "Docker Compose не установлен. Установите Docker Compose v2 (docker compose) или v1 (docker-compose)"
        exit 1
    fi
    
    success "Все зависимости установлены"
}

# Функция для создания .env файла
create_env_file() {
    if [ ! -f .env ]; then
        log "Создание .env файла..."
        cp env.example .env
        warning "Создан .env файл из примера. Пожалуйста, настройте переменные окружения"
        warning "Особенно важно изменить: DB_PASSWORD, JWT_SECRET, MATTERMOST_TOKEN"
    else
        log ".env файл уже существует"
    fi
}

# Функция для создания директорий
create_directories() {
    log "Создание необходимых директорий..."
    
    mkdir -p backend/uploads
    mkdir -p backend/logs
    mkdir -p postgres_data
    mkdir -p redis_data
    
    success "Директории созданы"
}

# Функция для сборки образов
build_images() {
    log "Сборка Docker образов..."
    
    # Сборка backend
    log "Сборка backend..."
    if docker compose version &> /dev/null; then docker compose build backend; else docker-compose build backend; fi
    
    # Сборка frontend
    log "Сборка frontend..."
    if docker compose version &> /dev/null; then docker compose build frontend; else docker-compose build frontend; fi
    
    success "Образы собраны"
}

# Функция для запуска системы
start_system() {
    log "Запуск системы..."
    
    # Запуск базы данных
    log "Запуск базы данных..."
    if docker compose version &> /dev/null; then docker compose up -d database; else docker-compose up -d database; fi
    
    # Ждем готовности базы данных
    log "Ожидание готовности базы данных..."
    sleep 30
    
    # Запуск Redis
    log "Запуск Redis..."
    if docker compose version &> /dev/null; then docker compose up -d redis; else docker-compose up -d redis; fi
    
    # Запуск backend
    log "Запуск backend..."
    if docker compose version &> /dev/null; then docker compose up -d backend; else docker-compose up -d backend; fi
    
    # Ждем готовности backend
    log "Ожидание готовности backend..."
    sleep 20
    
    # Запуск frontend
    log "Запуск frontend..."
    if docker compose version &> /dev/null; then docker compose up -d frontend; else docker-compose up -d frontend; fi
    
    success "Система запущена"
}

# Функция для остановки системы
stop_system() {
    log "Остановка системы..."
    if docker compose version &> /dev/null; then docker compose down; else docker-compose down; fi
    success "Система остановлена"
}

# Функция для перезапуска системы
restart_system() {
    log "Перезапуск системы..."
    stop_system
    start_system
}

# Функция для просмотра логов
view_logs() {
    service=${1:-}
    if [ -z "$service" ]; then
        if docker compose version &> /dev/null; then docker compose logs -f; else docker-compose logs -f; fi
    else
        if docker compose version &> /dev/null; then docker compose logs -f $service; else docker-compose logs -f $service; fi
    fi
}

# Функция для проверки статуса
check_status() {
    log "Проверка статуса системы..."
    
    echo ""
    echo "=== Статус контейнеров ==="
    if docker compose version &> /dev/null; then docker compose ps; else docker-compose ps; fi
    
    echo ""
    echo "=== Проверка здоровья ==="
    
    # Проверка базы данных
    if (docker compose version &> /dev/null && docker compose exec database pg_isready -U ${DB_USER:-assessment_user} -d ${DB_NAME:-assessment360} &> /dev/null) || \
       (command -v docker-compose &> /dev/null && docker-compose exec database pg_isready -U ${DB_USER:-assessment_user} -d ${DB_NAME:-assessment360} &> /dev/null); then
        success "База данных: работает"
    else
        error "База данных: не работает"
    fi
    
    # Проверка backend
    if curl -f http://localhost:5000/health &> /dev/null; then
        success "Backend: работает"
    else
        error "Backend: не работает"
    fi
    
    # Проверка frontend
    if curl -f http://localhost/health &> /dev/null; then
        success "Frontend: работает"
    else
        error "Frontend: не работает"
    fi
    
    echo ""
    echo "=== Доступные URL ==="
    echo "Frontend: http://localhost"
    echo "Backend API: http://localhost:5000/api"
    echo "Database: localhost:5432"
    echo "Redis: localhost:6379"
}

# Функция для обновления системы
update_system() {
    log "Обновление системы..."
    
    # Останавливаем систему
    stop_system
    
    # Обновляем код
    log "Обновление кода..."
    # git pull origin main
    
    # Пересобираем образы
    build_images
    
    # Запускаем систему
    start_system
    
    success "Система обновлена"
}

# Функция для резервного копирования
backup_database() {
    log "Создание резервной копии базы данных..."
    
    backup_file="backup_$(date +%Y%m%d_%H%M%S).sql"
    if docker compose version &> /dev/null; then docker compose exec database pg_dump -U ${DB_USER:-assessment_user} ${DB_NAME:-assessment360} > $backup_file; else docker-compose exec database pg_dump -U ${DB_USER:-assessment_user} ${DB_NAME:-assessment360} > $backup_file; fi
    
    success "Резервная копия создана: $backup_file"
}

# Функция для восстановления базы данных
restore_database() {
    backup_file=$1
    if [ -z "$backup_file" ]; then
        error "Укажите файл резервной копии"
        exit 1
    fi
    
    log "Восстановление базы данных из $backup_file..."
    
    if docker compose version &> /dev/null; then docker compose exec -T database psql -U ${DB_USER:-assessment_user} -d ${DB_NAME:-assessment360} < $backup_file; else docker-compose exec -T database psql -U ${DB_USER:-assessment_user} -d ${DB_NAME:-assessment360} < $backup_file; fi
    
    success "База данных восстановлена"
}

# Функция для очистки системы
cleanup() {
    log "Очистка системы..."
    
    # Останавливаем и удаляем контейнеры
    if docker compose version &> /dev/null; then docker compose down -v; else docker-compose down -v; fi
    
    # Удаляем образы
    if docker compose version &> /dev/null; then docker compose down --rmi all; else docker-compose down --rmi all; fi
    
    # Удаляем volumes
    docker volume prune -f
    
    success "Система очищена"
}

# Функция для помощи
show_help() {
    echo "Использование: $0 [КОМАНДА]"
    echo ""
    echo "Команды:"
    echo "  start          Запустить систему"
    echo "  stop           Остановить систему"
    echo "  restart        Перезапустить систему"
    echo "  build          Собрать образы"
    echo "  status         Проверить статус"
    echo "  logs [service] Просмотр логов"
    echo "  update         Обновить систему"
    echo "  backup         Создать резервную копию БД"
    echo "  restore <file> Восстановить БД"
    echo "  cleanup        Очистить систему"
    echo "  help           Показать эту справку"
    echo ""
    echo "Примеры:"
    echo "  $0 start"
    echo "  $0 logs backend"
    echo "  $0 restore backup_20240101_120000.sql"
}

# Основная логика
main() {
    case "${1:-}" in
        start)
            check_dependencies
            create_env_file
            create_directories
            build_images
            start_system
            check_status
            ;;
        stop)
            stop_system
            ;;
        restart)
            restart_system
            ;;
        build)
            check_dependencies
            build_images
            ;;
        status)
            check_status
            ;;
        logs)
            view_logs $2
            ;;
        update)
            update_system
            ;;
        backup)
            backup_database
            ;;
        restore)
            restore_database $2
            ;;
        cleanup)
            cleanup
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            error "Неизвестная команда: ${1:-}"
            show_help
            exit 1
            ;;
    esac
}

# Запуск скрипта
main "$@" 