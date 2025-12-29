#!/bin/bash
# © 2025 Бит.Цифра - Стас Чашин
# Автор: Стас Чашин @chastnik
# Скрипт автоматического обновления системы 360° в production

set -euo pipefail

# ============================================================================
# КОНСТАНТЫ
# ============================================================================
readonly SCRIPT_VERSION="1.0.0"
readonly BACKUP_DIR="backups"
readonly GIT_BRANCH="${GIT_BRANCH:-main}"

# ============================================================================
# ЦВЕТА ДЛЯ ВЫВОДА
# ============================================================================
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

# ============================================================================
# ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
# ============================================================================
DOCKER_COMPOSE_CMD=""
SKIP_BACKUP=false
SKIP_MIGRATIONS=false
NON_INTERACTIVE=false

# ============================================================================
# ФУНКЦИИ ДЛЯ ВЫВОДА
# ============================================================================
log() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# ============================================================================
# ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
# ============================================================================

# Определение команды docker compose
detect_docker_compose_cmd() {
    if docker compose version &> /dev/null 2>&1; then
        DOCKER_COMPOSE_CMD="docker compose"
        return 0
    elif command -v docker-compose &> /dev/null; then
        DOCKER_COMPOSE_CMD="docker-compose"
        return 0
    else
        return 1
    fi
}

# Безопасная загрузка переменных окружения из .env файла
load_env_file() {
    local env_file="${1:-.env}"
    
    if [ ! -f "$env_file" ]; then
        error "Файл $env_file не найден"
        return 1
    fi
    
    set -a
    while IFS= read -r line || [ -n "$line" ]; do
        [[ "$line" =~ ^[[:space:]]*# ]] && continue
        [[ -z "${line// }" ]] && continue
        
        line="${line#"${line%%[![:space:]]*}"}"
        line="${line%"${line##*[![:space:]]}"}"
        
        if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
            local key="${BASH_REMATCH[1]}"
            local value="${BASH_REMATCH[2]}"
            
            if [[ "$value" =~ ^\"(.*)\"$ ]]; then
                value="${BASH_REMATCH[1]}"
            elif [[ "$value" =~ ^\'(.*)\'$ ]]; then
                value="${BASH_REMATCH[1]}"
            fi
            
            export "$key=$value"
        fi
    done < "$env_file"
    set +a
}

# Проверка зависимостей
check_dependencies() {
    log "Проверка зависимостей..."
    
    if ! command -v docker &> /dev/null; then
        error "Docker не установлен"
        exit 1
    fi
    
    if ! detect_docker_compose_cmd; then
        error "Docker Compose не установлен"
        exit 1
    fi
    
    if ! command -v git &> /dev/null; then
        error "Git не установлен"
        exit 1
    fi
    
    if [ ! -f docker-compose.yml ]; then
        error "Файл docker-compose.yml не найден. Убедитесь, что вы находитесь в корне проекта"
        exit 1
    fi
    
    if [ ! -f .env ]; then
        error ".env файл не найден"
        exit 1
    fi
    
    success "Все зависимости установлены"
}

# Создание резервной копии базы данных
backup_database() {
    if [ "$SKIP_BACKUP" = true ]; then
        warning "Пропуск создания резервной копии (--skip-backup)"
        return 0
    fi
    
    log "Создание резервной копии базы данных..."
    
    # Загружаем переменные окружения
    load_env_file .env || true
    
    local db_user="${DB_USER:-assessment_user}"
    local db_name="${DB_NAME:-assessment360}"
    
    # Создаем директорию для бэкапов если её нет
    mkdir -p "$BACKUP_DIR"
    
    local backup_file="${BACKUP_DIR}/backup_$(date +%Y%m%d_%H%M%S).sql"
    
    # Проверяем, что база данных запущена
    if ! $DOCKER_COMPOSE_CMD ps database | grep -q "Up"; then
        warning "База данных не запущена. Запускаем..."
        $DOCKER_COMPOSE_CMD up -d database
        log "Ожидание готовности базы данных..."
        sleep 10
    fi
    
    if $DOCKER_COMPOSE_CMD exec -T database pg_dump -U "$db_user" "$db_name" > "$backup_file" 2>/dev/null; then
        local backup_size=$(du -h "$backup_file" | cut -f1)
        success "Резервная копия создана: $backup_file (размер: $backup_size)"
        return 0
    else
        error "Ошибка при создании резервной копии"
        return 1
    fi
}

# Обновление кода из репозитория
update_code() {
    log "Обновление кода из репозитория..."
    
    # Проверяем, что это git репозиторий
    if [ ! -d .git ]; then
        error "Текущая директория не является git репозиторием"
        return 1
    fi
    
    # Сохраняем текущую ветку
    local current_branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "$GIT_BRANCH")
    
    log "Текущая ветка: $current_branch"
    
    # Проверяем наличие изменений
    if ! git diff-index --quiet HEAD -- 2>/dev/null; then
        warning "Обнаружены незакоммиченные изменения"
        if [ "$NON_INTERACTIVE" = false ]; then
            read -p "Продолжить обновление? (y/n) " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                error "Обновление отменено"
                return 1
            fi
        else
            warning "Неинтерактивный режим: продолжаем обновление"
        fi
    fi
    
    # Получаем последние изменения
    log "Получение изменений из origin/$current_branch..."
    if git fetch origin "$current_branch" 2>/dev/null; then
        # Проверяем, есть ли новые коммиты
        local local_commit=$(git rev-parse HEAD 2>/dev/null)
        local remote_commit=$(git rev-parse "origin/$current_branch" 2>/dev/null)
        
        if [ "$local_commit" = "$remote_commit" ]; then
            success "Код уже актуален (нет новых изменений)"
            return 0
        fi
        
        # Выполняем pull
        if git pull origin "$current_branch"; then
            success "Код успешно обновлен"
            log "Изменения:"
            git log --oneline "$local_commit..HEAD" 2>/dev/null || true
            return 0
        else
            error "Ошибка при обновлении кода"
            return 1
        fi
    else
        error "Ошибка при получении изменений из репозитория"
        return 1
    fi
}

# Пересборка образов
rebuild_images() {
    log "Пересборка Docker образов..."
    
    if $DOCKER_COMPOSE_CMD build --no-cache; then
        success "Образы успешно пересобраны"
        return 0
    else
        error "Ошибка при пересборке образов"
        return 1
    fi
}

# Остановка системы
stop_system() {
    log "Остановка системы..."
    
    if $DOCKER_COMPOSE_CMD down; then
        success "Система остановлена"
        return 0
    else
        error "Ошибка при остановке системы"
        return 1
    fi
}

# Запуск системы
start_system() {
    log "Запуск системы..."
    
    # Запуск базы данных и Redis
    log "Запуск базы данных и Redis..."
    if ! $DOCKER_COMPOSE_CMD up -d database redis; then
        error "Ошибка при запуске database и redis"
        return 1
    fi
    
    # Ожидание готовности базы данных
    log "Ожидание готовности базы данных..."
    local db_user="${DB_USER:-assessment_user}"
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if $DOCKER_COMPOSE_CMD exec -T database pg_isready -U "$db_user" &> /dev/null 2>&1; then
            success "База данных готова"
            break
        fi
        attempt=$((attempt + 1))
        sleep 2
    done
    
    if [ $attempt -eq $max_attempts ]; then
        error "База данных не готова после $max_attempts попыток"
        return 1
    fi
    
    # Запуск backend
    log "Запуск backend..."
    if ! $DOCKER_COMPOSE_CMD up -d backend; then
        error "Ошибка при запуске backend"
        return 1
    fi
    
    # Ожидание готовности backend
    log "Ожидание готовности backend..."
    local backend_port="${BACKEND_PORT:-5000}"
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if command -v curl &> /dev/null; then
            if curl -f --max-time 5 "http://localhost:${backend_port}/health" &> /dev/null 2>&1; then
                success "Backend готов"
                break
            fi
        else
            # Если curl нет, просто ждем
            sleep 5
            break
        fi
        attempt=$((attempt + 1))
        sleep 2
    done
    
    # Запуск frontend
    log "Запуск frontend..."
    if ! $DOCKER_COMPOSE_CMD up -d frontend; then
        error "Ошибка при запуске frontend"
        return 1
    fi
    
    success "Система запущена"
}

# Выполнение миграций
run_migrations() {
    if [ "$SKIP_MIGRATIONS" = true ]; then
        warning "Пропуск выполнения миграций (--skip-migrations)"
        return 0
    fi
    
    log "Выполнение миграций базы данных..."
    
    if $DOCKER_COMPOSE_CMD exec -T backend sh -c "cd /app && NODE_ENV=production npx knex migrate:latest"; then
        success "Миграции выполнены успешно"
        return 0
    else
        error "Ошибка при выполнении миграций"
        warning "Проверьте логи: $DOCKER_COMPOSE_CMD logs backend"
        return 1
    fi
}

# Проверка статуса системы
check_status() {
    log "Проверка статуса системы..."
    
    echo ""
    echo "=== Статус контейнеров ==="
    $DOCKER_COMPOSE_CMD ps
    
    echo ""
    echo "=== Проверка здоровья ==="
    
    # Загружаем переменные окружения
    load_env_file .env || true
    
    local db_user="${DB_USER:-assessment_user}"
    local backend_port="${BACKEND_PORT:-5000}"
    
    # Проверка базы данных
    if $DOCKER_COMPOSE_CMD exec -T database pg_isready -U "$db_user" &> /dev/null 2>&1; then
        success "База данных: работает"
    else
        error "База данных: не работает"
    fi
    
    # Проверка backend
    if command -v curl &> /dev/null; then
        if curl -f --max-time 5 "http://localhost:${backend_port}/health" &> /dev/null 2>&1; then
            success "Backend: работает"
        else
            warning "Backend: не отвечает на health check"
        fi
    else
        warning "curl не установлен, пропуск проверки backend"
    fi
    
    # Проверка frontend
    if command -v curl &> /dev/null; then
        local frontend_port="${FRONTEND_PORT:-443}"
        local frontend_url
        if [ "$frontend_port" = "443" ]; then
            frontend_url="https://localhost"
        else
            frontend_url="https://localhost:${frontend_port}"
        fi
        
        if curl -f --max-time 5 -k "${frontend_url}/health" &> /dev/null 2>&1; then
            success "Frontend: работает"
        else
            warning "Frontend: не отвечает на health check"
        fi
    else
        warning "curl не установлен, пропуск проверки frontend"
    fi
    
    echo ""
}

# Основная функция обновления
update_production() {
    log "Начало автоматического обновления системы 360°"
    log "Версия скрипта: ${SCRIPT_VERSION}"
    echo "=========================================="
    
    # Проверка зависимостей
    check_dependencies
    
    # Загрузка переменных окружения
    load_env_file .env || true
    
    # Создание резервной копии
    if ! backup_database; then
        if [ "$NON_INTERACTIVE" = false ]; then
            read -p "Продолжить обновление без резервной копии? (y/n) " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                error "Обновление отменено"
                exit 1
            fi
        else
            error "Не удалось создать резервную копию. Обновление прервано."
            exit 1
        fi
    fi
    
    # Остановка системы
    if ! stop_system; then
        error "Не удалось остановить систему"
        exit 1
    fi
    
    # Обновление кода
    if ! update_code; then
        error "Не удалось обновить код"
        exit 1
    fi
    
    # Пересборка образов
    if ! rebuild_images; then
        error "Не удалось пересобрать образы"
        exit 1
    fi
    
    # Запуск системы
    if ! start_system; then
        error "Не удалось запустить систему"
        exit 1
    fi
    
    # Выполнение миграций
    if ! run_migrations; then
        warning "Ошибка при выполнении миграций. Проверьте логи."
    fi
    
    # Проверка статуса
    check_status
    
    echo ""
    success "Обновление завершено успешно!"
    echo ""
    log "Для просмотра логов используйте: $DOCKER_COMPOSE_CMD logs -f"
    log "Для проверки статуса используйте: $DOCKER_COMPOSE_CMD ps"
}

# Функция помощи
show_help() {
    echo "Использование: $0 [ОПЦИИ]"
    echo ""
    echo "Скрипт автоматического обновления системы 360° в production"
    echo ""
    echo "Опции:"
    echo "  --skip-backup        Пропустить создание резервной копии БД"
    echo "  --skip-migrations    Пропустить выполнение миграций"
    echo "  --non-interactive     Неинтерактивный режим (для CI/CD)"
    echo "  --branch BRANCH      Указать ветку для обновления (по умолчанию: main)"
    echo "  --help, -h           Показать эту справку"
    echo ""
    echo "Примеры:"
    echo "  $0                                    # Полное обновление"
    echo "  $0 --skip-backup                     # Обновление без бэкапа"
    echo "  $0 --non-interactive                 # Неинтерактивное обновление"
    echo "  $0 --branch develop                  # Обновление из ветки develop"
    echo ""
    echo "Версия скрипта: ${SCRIPT_VERSION}"
}

# ============================================================================
# ОБРАБОТКА СИГНАЛОВ
# ============================================================================
cleanup() {
    error ""
    error "Прерывание выполнения скрипта..."
    exit 130
}

trap cleanup INT TERM

# ============================================================================
# ОСНОВНАЯ ЛОГИКА
# ============================================================================
main() {
    # Парсинг опций
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-backup)
                SKIP_BACKUP=true
                shift
                ;;
            --skip-migrations)
                SKIP_MIGRATIONS=true
                shift
                ;;
            --non-interactive)
                NON_INTERACTIVE=true
                shift
                ;;
            --branch)
                GIT_BRANCH="$2"
                shift 2
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                error "Неизвестная опция: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    update_production
}

# Запуск скрипта
main "$@"

