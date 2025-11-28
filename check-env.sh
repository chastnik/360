#!/bin/bash
# © 2025 Бит.Цифра - Стас Чашин
# Автор: Стас Чашин @chastnik
# Скрипт для проверки .env файла и переменных окружения

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

echo "=========================================="
echo "Проверка .env файла и переменных окружения"
echo "=========================================="
echo ""

# Проверка наличия .env файла
if [ ! -f .env ]; then
    error ".env файл не найден в текущей директории!"
    echo ""
    log "Создайте .env файл из примера:"
    log "  cp env.example .env"
    log "Затем отредактируйте .env файл и установите правильные значения:"
    log "  - DB_NAME=assessment360 (или другое имя базы данных)"
    log "  - DB_USER=chastnik (или другое имя пользователя)"
    log "  - DB_PASSWORD=your_password"
    exit 1
fi

success ".env файл найден"

# Загрузка переменных окружения
set -a
source .env 2>/dev/null || true
set +a

echo ""
log "Проверка переменных окружения:"
echo ""

# Проверка DB_NAME
if [ -z "${DB_NAME:-}" ]; then
    error "DB_NAME не установлен в .env файле"
    echo "  Добавьте в .env: DB_NAME=assessment360"
    exit 1
else
    success "DB_NAME=$DB_NAME"
fi

# Проверка DB_USER
if [ -z "${DB_USER:-}" ]; then
    error "DB_USER не установлен в .env файле"
    echo "  Добавьте в .env: DB_USER=chastnik (или другое имя пользователя)"
    exit 1
else
    success "DB_USER=$DB_USER"
fi

# Проверка DB_PASSWORD
if [ -z "${DB_PASSWORD:-}" ] || [ "$DB_PASSWORD" = "your_secure_db_password_here" ]; then
    error "DB_PASSWORD не установлен или использует значение по умолчанию"
    echo "  Установите правильный пароль в .env файле"
    exit 1
else
    success "DB_PASSWORD установлен (скрыт)"
fi

# Проверка, что DB_NAME и DB_USER не совпадают
if [ "$DB_NAME" = "$DB_USER" ]; then
    error "DB_NAME и DB_USER не должны совпадать!"
    error "  DB_NAME=$DB_NAME"
    error "  DB_USER=$DB_USER"
    echo "  Измените одно из значений в .env файле"
    exit 1
fi

success "DB_NAME и DB_USER различаются"

echo ""
log "Проверка переменных для Docker Compose:"
echo ""

# Проверка, что переменные будут правильно подставлены
if [ -z "${DB_NAME:-}" ] || [ -z "${DB_USER:-}" ]; then
    error "Переменные DB_NAME или DB_USER пусты"
    exit 1
fi

success "Все необходимые переменные установлены"
echo ""
log "Пример использования в docker-compose.yml:"
log "  POSTGRES_DB: \${DB_NAME:-assessment360} -> $DB_NAME"
log "  POSTGRES_USER: \${DB_USER:-assessment_user} -> $DB_USER"
echo ""
success "Проверка завершена успешно!"
echo ""
log "ВАЖНО: Перед запуском docker compose убедитесь, что переменные окружения загружены:"
log "  export \$(cat .env | grep -v '^#' | xargs)"
log "Или используйте скрипт docker-setup.sh, который загружает переменные автоматически:"
log "  ./docker-setup.sh start"

