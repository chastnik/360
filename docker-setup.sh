#!/bin/bash
# © 2025 Бит.Цифра - Стас Чашин
# Автор: Стас Чашин @chastnik
# Скрипт автоматической установки системы 360° в Docker

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функции для вывода
log() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Проверка зависимостей
check_dependencies() {
    log "Проверка зависимостей..."
    
    if ! command -v docker &> /dev/null; then
        error "Docker не установлен. Установите Docker 20.10+"
        exit 1
    fi
    
    if ! docker compose version &> /dev/null && ! command -v docker-compose &> /dev/null; then
        error "Docker Compose не установлен. Установите Docker Compose v2"
        exit 1
    fi
    
    success "Все зависимости установлены"
}

# Создание .env файла
create_env_file() {
    if [ ! -f .env ]; then
        log "Создание .env файла из примера..."
        cp env.example .env
        
        warning "Создан файл .env из примера"
        warning "ВАЖНО: Отредактируйте .env файл перед запуском!"
        warning "Обязательно измените:"
        warning "  - DB_PASSWORD"
        warning "  - JWT_SECRET"
        warning "  - REDIS_PASSWORD"
        warning "  - MATTERMOST_TOKEN (если используется)"
        
        read -p "Нажмите Enter после редактирования .env файла..."
    else
        log ".env файл уже существует"
    fi
    
    # Проверка обязательных переменных
    source .env
    
    if [ -z "$DB_PASSWORD" ] || [ "$DB_PASSWORD" = "your_secure_db_password_here" ]; then
        error "DB_PASSWORD не настроен в .env файле"
        exit 1
    fi
    
    if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = "your-super-secret-jwt-key-change-this-in-production-minimum-32-characters" ]; then
        error "JWT_SECRET не настроен в .env файле"
        exit 1
    fi
    
    success "Переменные окружения проверены"
}

# Определение команды docker compose
DOCKER_COMPOSE_CMD="docker compose"
if ! docker compose version &> /dev/null; then
    if command -v docker-compose &> /dev/null; then
        DOCKER_COMPOSE_CMD="docker-compose"
    fi
fi

# Ожидание готовности базы данных
wait_for_database() {
    log "Ожидание готовности базы данных..."
    
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if $DOCKER_COMPOSE_CMD exec -T database pg_isready -U "${DB_USER:-assessment_user}" &> /dev/null; then
            success "База данных готова"
            return 0
        fi
        
        attempt=$((attempt + 1))
        sleep 2
    done
    
    error "База данных не готова после $max_attempts попыток"
    return 1
}

# Выполнение миграций
run_migrations() {
    log "Выполнение миграций базы данных..."
    
    if $DOCKER_COMPOSE_CMD exec -T backend npm run migrate; then
        success "Миграции выполнены успешно"
    else
        error "Ошибка при выполнении миграций"
        return 1
    fi
}

# Выполнение сидов
run_seeds() {
    log "Заполнение базы данных начальными данными..."
    
    if $DOCKER_COMPOSE_CMD exec -T backend npm run seed; then
        success "Начальные данные загружены"
    else
        warning "Предупреждение: ошибка при выполнении сидов (это нормально, если данные уже есть)"
    fi
}

# Сборка образов
build_images() {
    log "Сборка Docker образов..."
    
    if $DOCKER_COMPOSE_CMD build; then
        success "Образы собраны успешно"
    else
        error "Ошибка при сборке образов"
        return 1
    fi
}

# Запуск системы
start_system() {
    log "Запуск системы..."
    
    # Запуск базы данных и Redis
    log "Запуск базы данных и Redis..."
    $DOCKER_COMPOSE_CMD up -d database redis
    
    # Ожидание готовности базы данных
    wait_for_database
    
    # Запуск backend
    log "Запуск backend..."
    $DOCKER_COMPOSE_CMD up -d backend
    
    # Ожидание готовности backend
    log "Ожидание готовности backend..."
    sleep 10
    
    # Запуск frontend
    log "Запуск frontend..."
    $DOCKER_COMPOSE_CMD up -d frontend
    
    success "Система запущена"
}

# Проверка статуса
check_status() {
    log "Проверка статуса системы..."
    
    # Загружаем переменные окружения если они не загружены
    if [ -f .env ]; then
        source .env
    fi
    
    # Получаем порты из переменных окружения с значениями по умолчанию
    BACKEND_PORT=${BACKEND_PORT:-5000}
    FRONTEND_PORT=${FRONTEND_PORT:-80}
    
    # Формируем URL для frontend (порт 80 не указываем в URL)
    if [ "$FRONTEND_PORT" = "80" ]; then
        FRONTEND_URL="http://localhost"
    else
        FRONTEND_URL="http://localhost:${FRONTEND_PORT}"
    fi
    
    # Формируем URL для backend
    BACKEND_URL="http://localhost:${BACKEND_PORT}"
    
    echo ""
    echo "=== Статус контейнеров ==="
    $DOCKER_COMPOSE_CMD ps
    
    echo ""
    echo "=== Проверка здоровья ==="
    
    # Проверка базы данных
    if $DOCKER_COMPOSE_CMD exec -T database pg_isready -U "${DB_USER:-assessment_user}" &> /dev/null; then
        success "База данных: работает"
    else
        error "База данных: не работает"
    fi
    
    # Проверка backend
    sleep 5
    if curl -f "${BACKEND_URL}/health" &> /dev/null 2>&1; then
        success "Backend: работает"
    else
        warning "Backend: проверьте логи ($DOCKER_COMPOSE_CMD logs backend)"
    fi
    
    # Проверка frontend
    if curl -f "${FRONTEND_URL}/health" &> /dev/null 2>&1; then
        success "Frontend: работает"
    else
        warning "Frontend: проверьте логи ($DOCKER_COMPOSE_CMD logs frontend)"
    fi
    
    echo ""
    echo "=== Доступные URL ==="
    echo "Frontend: ${FRONTEND_URL}"
    echo "Backend API: ${BACKEND_URL}/api"
    echo ""
    echo "=== Учетные данные по умолчанию (после seed) ==="
    echo "Email: admin@company.com / Пароль: admin123"
    echo "Email: manager@company.com / Пароль: manager123"
    echo "Email: user@company.com / Пароль: user123"
}

# Основная функция установки
install() {
    log "Начало автоматической установки системы 360°"
    echo "=========================================="
    
    check_dependencies
    create_env_file
    build_images
    start_system
    
    log "Ожидание полной готовности системы..."
    sleep 15
    
    # Выполнение миграций
    run_migrations
    
    # Выполнение сидов
    read -p "Выполнить заполнение базы данных начальными данными? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        run_seeds
    fi
    
    check_status
    
    echo ""
    success "Установка завершена!"
    echo ""
    log "Для просмотра логов используйте: $DOCKER_COMPOSE_CMD logs -f"
    log "Для остановки системы используйте: $DOCKER_COMPOSE_CMD down"
}

# Функция помощи
show_help() {
    echo "Использование: $0 [КОМАНДА]"
    echo ""
    echo "Команды:"
    echo "  install       Полная автоматическая установка (по умолчанию)"
    echo "  build         Собрать Docker образы"
    echo "  start         Запустить систему"
    echo "  stop          Остановить систему"
    echo "  restart       Перезапустить систему"
    echo "  migrate       Выполнить миграции базы данных"
    echo "  seed          Заполнить базу данных начальными данными"
    echo "  status        Проверить статус системы"
    echo "  logs [service] Просмотр логов"
    echo "  help          Показать эту справку"
    echo ""
    echo "Примеры:"
    echo "  $0              # Полная установка"
    echo "  $0 migrate       # Только миграции"
    echo "  $0 logs backend  # Логи backend"
}

# Основная логика
main() {
    case "${1:-install}" in
        install)
            install
            ;;
        build)
            check_dependencies
            create_env_file
            build_images
            ;;
        start)
            start_system
            check_status
            ;;
        stop)
            log "Остановка системы..."
            $DOCKER_COMPOSE_CMD down
            success "Система остановлена"
            ;;
        restart)
            log "Перезапуск системы..."
            $DOCKER_COMPOSE_CMD restart
            check_status
            ;;
        migrate)
            wait_for_database
            run_migrations
            ;;
        seed)
            wait_for_database
            run_seeds
            ;;
        status)
            check_status
            ;;
        logs)
            $DOCKER_COMPOSE_CMD logs -f ${2:-}
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            error "Неизвестная команда: $1"
            show_help
            exit 1
            ;;
    esac
}

# Запуск скрипта
main "$@"

