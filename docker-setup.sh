#!/bin/bash
# © 2025 Бит.Цифра - Стас Чашин
# Автор: Стас Чашин @chastnik
# Скрипт автоматической установки системы 360° в Docker

set -euo pipefail

# ============================================================================
# КОНСТАНТЫ
# ============================================================================
readonly SCRIPT_VERSION="2.0.0"
readonly MIN_DOCKER_VERSION="20.10"
readonly MAX_DB_WAIT_ATTEMPTS=30
readonly DB_WAIT_INTERVAL=2
readonly BACKEND_WAIT_MAX_TIME=60
readonly BACKEND_WAIT_INTERVAL=2
readonly CURL_TIMEOUT=5
readonly HEALTH_CHECK_TIMEOUT=10

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

# Безопасная загрузка переменных окружения из .env файла
load_env_file() {
    local env_file="${1:-.env}"
    
    if [ ! -f "$env_file" ]; then
        error "Файл $env_file не найден"
        return 1
    fi
    
    # Безопасная загрузка переменных окружения
    # Игнорируем комментарии и пустые строки, загружаем только KEY=VALUE
    # Поддерживает значения с пробелами, кавычками и специальными символами
    set -a
    while IFS= read -r line || [ -n "$line" ]; do
        # Пропускаем комментарии и пустые строки
        [[ "$line" =~ ^[[:space:]]*# ]] && continue
        [[ -z "${line// }" ]] && continue
        
        # Убираем ведущие и завершающие пробелы
        line="${line#"${line%%[![:space:]]*}"}"
        line="${line%"${line##*[![:space:]]}"}"
        
        # Проверяем формат KEY=VALUE
        if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
            local key="${BASH_REMATCH[1]}"
            local value="${BASH_REMATCH[2]}"
            
            # Убираем кавычки если значение обернуто в них (только если кавычки на начале и конце)
            # Обрабатываем двойные кавычки
            if [[ "$value" =~ ^\"(.*)\"$ ]]; then
                value="${BASH_REMATCH[1]}"
            # Обрабатываем одинарные кавычки
            elif [[ "$value" =~ ^\'(.*)\'$ ]]; then
                value="${BASH_REMATCH[1]}"
            fi
            
            # Экспортируем переменную с правильным экранированием
            export "$key=$value"
        fi
    done < "$env_file"
    set +a
}

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

# Проверка версии Docker
check_docker_version() {
    local docker_version
    # Используем grep -oE вместо -oP для совместимости с macOS (BSD grep)
    docker_version=$(docker --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+' | head -1)
    
    if [ -z "$docker_version" ]; then
        error "Не удалось определить версию Docker"
        return 1
    fi
    
    # Сравнение версий (простое сравнение строк для формата X.Y)
    # Используем grep -oE вместо -oP для совместимости с macOS
    local min_version_parts=(${MIN_DOCKER_VERSION//./ })
    local current_version_parts=(${docker_version//./ })
    
    if [ "${current_version_parts[0]}" -lt "${min_version_parts[0]}" ] || \
       ([ "${current_version_parts[0]}" -eq "${min_version_parts[0]}" ] && \
        [ "${current_version_parts[1]}" -lt "${min_version_parts[1]}" ]); then
        error "Требуется Docker версии ${MIN_DOCKER_VERSION} или выше. Установлена версия: ${docker_version}"
        return 1
    fi
    
    return 0
}

# Проверка прав доступа к Docker
check_docker_access() {
    if ! docker info &> /dev/null; then
        error "Нет доступа к Docker. Убедитесь, что:"
        error "  1. Docker запущен (systemctl start docker)"
        error "  2. Ваш пользователь в группе docker (sudo usermod -aG docker \$USER)"
        error "  3. Вы выполнили 'newgrp docker' или перелогинились"
        return 1
    fi
    return 0
}

# ============================================================================
# ПРОВЕРКА ЗАВИСИМОСТЕЙ
# ============================================================================
check_dependencies() {
    log "Проверка зависимостей..."
    
    if ! command -v docker &> /dev/null; then
        error "Docker не установлен. Установите Docker ${MIN_DOCKER_VERSION}+"
        exit 1
    fi
    
    if ! check_docker_version; then
        exit 1
    fi
    
    if ! check_docker_access; then
        exit 1
    fi
    
    if ! detect_docker_compose_cmd; then
        error "Docker Compose не установлен. Установите Docker Compose v2"
        exit 1
    fi
    
    # Проверка наличия docker-compose.yml
    if [ ! -f docker-compose.yml ]; then
        error "Файл docker-compose.yml не найден. Убедитесь, что вы находитесь в корне проекта"
        exit 1
    fi
    
    if ! command -v curl &> /dev/null; then
        warning "curl не установлен. Некоторые проверки здоровья могут не работать"
    fi
    
    success "Все зависимости установлены"
    log "Используется команда: $DOCKER_COMPOSE_CMD"
}

# ============================================================================
# РАБОТА С .ENV ФАЙЛОМ
# ============================================================================
create_env_file() {
    if [ ! -f .env ]; then
        if [ ! -f env.example ]; then
            error "Файл env.example не найден. Убедитесь, что вы находитесь в корне проекта"
            exit 1
        fi
        
        log "Создание .env файла из примера..."
        cp env.example .env
        
        warning "Создан файл .env из примера"
        warning "ВАЖНО: Отредактируйте .env файл перед запуском!"
        warning "Обязательно измените:"
        warning "  - DB_PASSWORD"
        warning "  - JWT_SECRET"
        warning "  - REDIS_PASSWORD"
        warning "  - MATTERMOST_TOKEN (если используется)"
        
        if [ "$NON_INTERACTIVE" = false ]; then
            read -p "Нажмите Enter после редактирования .env файла..."
        else
            warning "Неинтерактивный режим: пропуск ожидания редактирования .env"
        fi
    else
        log ".env файл уже существует"
    fi
    
    # Безопасная загрузка переменных окружения
    if ! load_env_file .env; then
        error "Ошибка при загрузке .env файла"
        exit 1
    fi
    
    # Проверка обязательных переменных
    if [ -z "${DB_PASSWORD:-}" ] || [ "$DB_PASSWORD" = "your_secure_db_password_here" ]; then
        error "DB_PASSWORD не настроен в .env файле"
        exit 1
    fi
    
    if [ -z "${JWT_SECRET:-}" ] || [ "$JWT_SECRET" = "your-super-secret-jwt-key-change-this-in-production-minimum-32-characters" ]; then
        error "JWT_SECRET не настроен в .env файле"
        exit 1
    fi
    
    success "Переменные окружения проверены"
}

# ============================================================================
# ОЖИДАНИЕ ГОТОВНОСТИ СЕРВИСОВ
# ============================================================================

# Ожидание готовности базы данных
wait_for_database() {
    log "Ожидание готовности базы данных..."
    
    local max_attempts=${MAX_DB_WAIT_ATTEMPTS}
    local attempt=0
    local db_user="${DB_USER:-assessment_user}"
    local last_error=""
    
    while [ $attempt -lt $max_attempts ]; do
        if $DOCKER_COMPOSE_CMD exec -T database pg_isready -U "$db_user" &> /dev/null 2>&1; then
            success "База данных готова"
            return 0
        fi
        
        # Сохраняем последнюю ошибку для отладки
        last_error=$($DOCKER_COMPOSE_CMD exec -T database pg_isready -U "$db_user" 2>&1 || true)
        
        attempt=$((attempt + 1))
        if [ $attempt -lt $max_attempts ]; then
            sleep ${DB_WAIT_INTERVAL}
        fi
    done
    
    error "База данных не готова после $max_attempts попыток"
    if [ -n "$last_error" ]; then
        error "Последняя ошибка: $last_error"
    fi
    error "Проверьте логи: $DOCKER_COMPOSE_CMD logs database"
    return 1
}

# Ожидание готовности backend через health check
wait_for_backend() {
    local backend_url="${1:-http://localhost:5000}"
    local max_time=${BACKEND_WAIT_MAX_TIME}
    local elapsed=0
    
    log "Ожидание готовности backend..."
    
    while [ $elapsed -lt $max_time ]; do
        if curl -f --max-time ${CURL_TIMEOUT} "${backend_url}/health" &> /dev/null 2>&1; then
            success "Backend готов"
            return 0
        fi
        
        sleep ${BACKEND_WAIT_INTERVAL}
        elapsed=$((elapsed + BACKEND_WAIT_INTERVAL))
    done
    
    warning "Backend не ответил на health check в течение ${max_time} секунд"
    warning "Проверьте логи: $DOCKER_COMPOSE_CMD logs backend"
    return 1
}

# ============================================================================
# ОПЕРАЦИИ С БАЗОЙ ДАННЫХ
# ============================================================================

# Выполнение миграций
# Исправление предупреждений PostgreSQL о collation версии
fix_postgres_collation() {
    log "Исправление предупреждений PostgreSQL о collation версии..."
    
    # Загружаем переменные окружения если они не загружены
    if [ -f .env ]; then
        load_env_file .env || true
    fi
    
    local db_name="${DB_NAME:-assessment360}"
    local db_user="${DB_USER:-assessment_user}"
    local db_password="${DB_PASSWORD:-}"
    
    # Ждем готовности базы данных
    if ! wait_for_database; then
        warning "База данных не готова, пропускаю исправление collation"
        return 0
    fi
    
    # Выполняем ALTER DATABASE ... REFRESH COLLATION VERSION для всех баз данных
    # В docker-compose.yml используется POSTGRES_USER из .env или значение по умолчанию
    # Используем POSTGRES_USER из docker-compose (это DB_USER из .env)
    local postgres_user="${DB_USER:-assessment_user}"
    
    # Проверяем, что имя базы данных не пустое и не равно имени пользователя
    if [ -z "$db_name" ] || [ "$db_name" = "$db_user" ]; then
        warning "Имя базы данных не установлено или равно имени пользователя, пропускаю исправление collation"
        return 0
    fi
    
    # Исправляем collation для основной базы данных
    # Используем PGPASSWORD для аутентификации через переменную окружения docker-compose
    if $DOCKER_COMPOSE_CMD exec -T -e PGPASSWORD="$db_password" database psql -U "$postgres_user" -d postgres -c "ALTER DATABASE $db_name REFRESH COLLATION VERSION;" 2>/dev/null; then
        log "Collation для базы данных $db_name обновлен"
    else
        # Пробуем с postgres пользователем (суперпользователь)
        if $DOCKER_COMPOSE_CMD exec -T database psql -U postgres -d postgres -c "ALTER DATABASE $db_name REFRESH COLLATION VERSION;" 2>/dev/null; then
            log "Collation для базы данных $db_name обновлен (через postgres)"
        else
            warning "Не удалось обновить collation для $db_name (база может не существовать или нет прав, не критично)"
        fi
    fi
    
    # Исправляем collation для template1 (только через postgres пользователя)
    if $DOCKER_COMPOSE_CMD exec -T database psql -U postgres -d postgres -c "ALTER DATABASE template1 REFRESH COLLATION VERSION;" 2>/dev/null; then
        log "Collation для template1 обновлен"
    else
        warning "Не удалось обновить collation для template1 (не критично)"
    fi
    
    log "Исправление collation завершено"
}

run_migrations() {
    log "Выполнение миграций базы данных..."
    
    # Загружаем переменные окружения если они не загружены
    if [ -f .env ]; then
        load_env_file .env || true
    fi
    
    # Исправляем предупреждения о collation перед миграциями
    fix_postgres_collation
    
    # Выполняем миграции с явным указанием окружения
    # Переменные окружения уже переданы через docker-compose.yml, но NODE_ENV нужно установить явно
    # Knex ищет knexfile.js в текущей директории, поэтому просто переходим в /app
    # Выводим диагностическую информацию для отладки
    log "Проверка наличия knexfile.js в контейнере..."
    $DOCKER_COMPOSE_CMD exec -T backend sh -c "cd /app && pwd && ls -la knexfile.js 2>&1 || echo 'Файл knexfile.js не найден!'" || true
    
    if $DOCKER_COMPOSE_CMD exec -T backend sh -c "cd /app && NODE_ENV=production npx knex migrate:latest"; then
        success "Миграции выполнены успешно"
        return 0
    else
        error "Ошибка при выполнении миграций"
        error "Проверьте логи: $DOCKER_COMPOSE_CMD logs backend"
        return 1
    fi
}

# Выполнение сидов
run_seeds() {
    log "Заполнение базы данных начальными данными..."
    
    # Загружаем переменные окружения если они не загружены
    if [ -f .env ]; then
        load_env_file .env || true
    fi
    
    # Выполняем сиды с явным указанием окружения
    # Переменные окружения уже переданы через docker-compose.yml, но NODE_ENV нужно установить явно
    # Knex ищет knexfile.js в текущей директории, поэтому просто переходим в /app
    if $DOCKER_COMPOSE_CMD exec -T backend sh -c "cd /app && NODE_ENV=production npx knex seed:run"; then
        success "Начальные данные загружены"
        return 0
    else
        warning "Предупреждение: ошибка при выполнении сидов (это нормально, если данные уже есть)"
        warning "Проверьте логи: $DOCKER_COMPOSE_CMD logs backend"
        return 1
    fi
}

# ============================================================================
# ОПЕРАЦИИ С DOCKER
# ============================================================================

# Сборка образов
build_images() {
    log "Сборка Docker образов..."
    
    if $DOCKER_COMPOSE_CMD build; then
        success "Образы собраны успешно"
        return 0
    else
        error "Ошибка при сборке образов"
        error "Проверьте логи: $DOCKER_COMPOSE_CMD logs"
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
    if ! wait_for_database; then
        error "Не удалось дождаться готовности базы данных"
        return 1
    fi
    
    # Запуск backend
    log "Запуск backend..."
    if ! $DOCKER_COMPOSE_CMD up -d backend; then
        error "Ошибка при запуске backend"
        return 1
    fi
    
    # Ожидание готовности backend через health check
    local backend_port="${BACKEND_PORT:-5000}"
    local backend_url="http://localhost:${backend_port}"
    wait_for_backend "$backend_url" || true  # Не критично, продолжаем
    
    # Запуск frontend
    log "Запуск frontend..."
    if ! $DOCKER_COMPOSE_CMD up -d frontend; then
        error "Ошибка при запуске frontend"
        return 1
    fi
    
    success "Система запущена"
}

# ============================================================================
# ПРОВЕРКА СТАТУСА
# ============================================================================
check_status() {
    log "Проверка статуса системы..."
    
    # Загружаем переменные окружения если они не загружены
    if [ -f .env ]; then
        load_env_file .env || true
    fi
    
    # Получаем порты из переменных окружения с значениями по умолчанию
    local backend_port="${BACKEND_PORT:-5000}"
    local frontend_port="${FRONTEND_PORT:-80}"
    
    # Формируем URL для frontend (порт 80 не указываем в URL)
    local frontend_url
    if [ "$frontend_port" = "80" ]; then
        frontend_url="http://localhost"
    else
        frontend_url="http://localhost:${frontend_port}"
    fi
    
    # Формируем URL для backend
    local backend_url="http://localhost:${backend_port}"
    
    echo ""
    echo "=== Статус контейнеров ==="
    $DOCKER_COMPOSE_CMD ps
    
    echo ""
    echo "=== Проверка здоровья ==="
    
    # Проверка базы данных
    local db_user="${DB_USER:-assessment_user}"
    if $DOCKER_COMPOSE_CMD exec -T database pg_isready -U "$db_user" &> /dev/null 2>&1; then
        success "База данных: работает"
    else
        error "База данных: не работает"
        error "Проверьте логи: $DOCKER_COMPOSE_CMD logs database"
    fi
    
    # Проверка backend
    if command -v curl &> /dev/null; then
        if curl -f --max-time ${CURL_TIMEOUT} "${backend_url}/health" &> /dev/null 2>&1; then
            success "Backend: работает"
        else
            warning "Backend: не отвечает на health check"
            warning "Проверьте логи: $DOCKER_COMPOSE_CMD logs backend"
        fi
    else
        warning "curl не установлен, пропуск проверки backend"
    fi
    
    # Проверка frontend
    if command -v curl &> /dev/null; then
        if curl -f --max-time ${CURL_TIMEOUT} "${frontend_url}/health" &> /dev/null 2>&1; then
            success "Frontend: работает"
        else
            warning "Frontend: не отвечает на health check"
            warning "Проверьте логи: $DOCKER_COMPOSE_CMD logs frontend"
        fi
    else
        warning "curl не установлен, пропуск проверки frontend"
    fi
    
    echo ""
    echo "=== Доступные URL ==="
    echo "Frontend: ${frontend_url}"
    echo "Backend API: ${backend_url}/api"
    echo ""
    
    # Проверка выполнения миграций
    local db_user="${DB_USER:-assessment_user}"
    if $DOCKER_COMPOSE_CMD exec -T database psql -U "$db_user" -d "${DB_NAME:-assessment360}" -c "SELECT 1 FROM system_settings LIMIT 1;" &> /dev/null 2>&1; then
        echo "=== Учетные данные по умолчанию (после seed) ==="
        echo "Email: admin@company.com / Пароль: admin123"
        echo "Email: manager@company.com / Пароль: manager123"
        echo "Email: user@company.com / Пароль: user123"
    else
        warning ""
        warning "⚠️  ВНИМАНИЕ: Миграции базы данных не выполнены!"
        warning "Выполните миграции командой: $0 migrate"
        warning "После миграций выполните seed: $0 seed"
        warning ""
    fi
}

# ============================================================================
# ОСНОВНАЯ ФУНКЦИЯ УСТАНОВКИ
# ============================================================================
install() {
    log "Начало автоматической установки системы 360°"
    log "Версия скрипта: ${SCRIPT_VERSION}"
    echo "=========================================="
    
    check_dependencies
    create_env_file
    build_images
    start_system
    
    log "Ожидание полной готовности системы..."
    sleep 5  # Минимальная задержка для стабилизации
    
    # Исправление предупреждений PostgreSQL о collation перед миграциями
    fix_postgres_collation
    
    # Выполнение миграций
    if ! run_migrations; then
        error "Установка завершена с ошибками при выполнении миграций"
        check_status
        exit 1
    fi
    
    # Выполнение сидов
    if [ "$NON_INTERACTIVE" = false ]; then
        read -p "Выполнить заполнение базы данных начальными данными? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            run_seeds
        fi
    else
        log "Неинтерактивный режим: пропуск seed (выполните '$0 seed' вручную при необходимости)"
    fi
    
    check_status
    
    echo ""
    success "Установка завершена!"
    echo ""
    log "Для просмотра логов используйте: $DOCKER_COMPOSE_CMD logs -f"
    log "Для остановки системы используйте: $DOCKER_COMPOSE_CMD down"
}

# ============================================================================
# ФУНКЦИЯ ПОМОЩИ
# ============================================================================
show_help() {
    echo "Использование: $0 [КОМАНДА] [ОПЦИИ]"
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
    echo "Опции:"
    echo "  --non-interactive, -y  Неинтерактивный режим (для CI/CD)"
    echo ""
    echo "Примеры:"
    echo "  $0                      # Полная установка"
    echo "  $0 migrate              # Только миграции"
    echo "  $0 logs backend         # Логи backend"
    echo "  $0 install --non-interactive  # Установка без интерактивных запросов"
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
            --non-interactive|-y)
                NON_INTERACTIVE=true
                shift
                ;;
            *)
                break
                ;;
        esac
    done
    
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
            detect_docker_compose_cmd || exit 1
            start_system
            check_status
            ;;
        stop)
            detect_docker_compose_cmd || exit 1
            log "Остановка системы..."
            $DOCKER_COMPOSE_CMD down
            success "Система остановлена"
            ;;
        restart)
            detect_docker_compose_cmd || exit 1
            log "Перезапуск системы..."
            $DOCKER_COMPOSE_CMD restart
            sleep 5
            check_status
            ;;
        migrate)
            detect_docker_compose_cmd || exit 1
            wait_for_database
            run_migrations
            ;;
        seed)
            detect_docker_compose_cmd || exit 1
            wait_for_database
            run_seeds
            ;;
        status)
            detect_docker_compose_cmd || exit 1
            check_status
            ;;
        logs)
            detect_docker_compose_cmd || exit 1
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
