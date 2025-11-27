# © 2025 Бит.Цифра - Стас Чашин

#!/bin/bash
# Автор: Стас Чашин @chastnik

# Скрипт запуска системы 360-градусной оценки персонала
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
    if [ ! -d "backend/node_modules" ] || [ ! -d "backend/node_modules/node-cron" ] || [ ! -f "backend/node_modules/node-cron/package.json" ]; then
        print_info "Установка зависимостей backend..."
        cd backend && npm install && cd ..
    fi
    
    # Проверка зависимостей frontend
    if [ ! -d "frontend/node_modules" ] || [ ! -f "frontend/node_modules/.bin/react-scripts" ]; then
        print_info "Установка зависимостей frontend..."
        cd frontend && npm install && cd ..
    fi
    
    print_success "Все зависимости установлены"
}

# Проверка статуса PostgreSQL
check_postgres_status() {
    print_info "Проверка статуса PostgreSQL..."
    
    # Проверяем, запущен ли PostgreSQL
    if pgrep -x "postgres" > /dev/null; then
        print_success "PostgreSQL запущен"
        return 0
    else
        print_warning "PostgreSQL не запущен"
        return 1
    fi
}

# Запуск PostgreSQL
start_postgres() {
    print_info "Запуск PostgreSQL..."
    
    # Пытаемся запустить PostgreSQL через service
    if command -v service &> /dev/null; then
        if service postgresql start 2>/dev/null; then
            print_success "PostgreSQL запущен через service"
            # Ждем немного, чтобы PostgreSQL полностью запустился
            sleep 3
            return 0
        fi
    fi
    
    # Пытаемся запустить через systemctl (если доступен)
    if command -v systemctl &> /dev/null; then
        if systemctl start postgresql 2>/dev/null; then
            print_success "PostgreSQL запущен через systemctl"
            sleep 3
            return 0
        fi
    fi
    
    # Пытаемся запустить напрямую
    if command -v pg_ctl &> /dev/null; then
        # Ищем директорию данных PostgreSQL
        for data_dir in /var/lib/postgresql/*/main /usr/local/var/postgres; do
            if [ -d "$data_dir" ]; then
                if pg_ctl start -D "$data_dir" -l /tmp/postgres.log 2>/dev/null; then
                    print_success "PostgreSQL запущен через pg_ctl"
                    sleep 3
                    return 0
                fi
            fi
        done
    fi
    
    print_error "Не удалось запустить PostgreSQL автоматически"
    print_info "Попробуйте запустить PostgreSQL вручную:"
    print_info "  sudo service postgresql start"
    print_info "  или"
    print_info "  sudo systemctl start postgresql"
    return 1
}

# Проверка и запуск PostgreSQL
ensure_postgres_running() {
    if ! check_postgres_status; then
        if ! start_postgres; then
            print_error "Не удалось запустить PostgreSQL"
            exit 1
        fi
        
        # Повторная проверка после запуска
        if ! check_postgres_status; then
            print_error "PostgreSQL не запустился"
            exit 1
        fi
    fi
}

# Проверка статуса Redis
check_redis_status() {
    print_info "Проверка статуса Redis..."
    
    # Проверяем, запущен ли Redis
    if pgrep -x "redis-server" > /dev/null; then
        print_success "Redis запущен"
        return 0
    else
        print_warning "Redis не запущен"
        return 1
    fi
}

# Запуск Redis
start_redis() {
    print_info "Запуск Redis..."
    
    # Пытаемся запустить Redis через service
    if command -v service &> /dev/null; then
        if service redis-server start 2>/dev/null; then
            print_success "Redis запущен через service"
            # Ждем немного, чтобы Redis полностью запустился
            sleep 2
            return 0
        fi
    fi
    
    # Пытаемся запустить через systemctl (если доступен)
    if command -v systemctl &> /dev/null; then
        if systemctl start redis 2>/dev/null || systemctl start redis-server 2>/dev/null; then
            print_success "Redis запущен через systemctl"
            sleep 2
            return 0
        fi
    fi
    
    # Пытаемся запустить напрямую
    if command -v redis-server &> /dev/null; then
        if redis-server --daemonize yes 2>/dev/null; then
            print_success "Redis запущен напрямую"
            sleep 2
            return 0
        fi
    fi
    
    print_error "Не удалось запустить Redis автоматически"
    print_info "Попробуйте запустить Redis вручную:"
    print_info "  sudo service redis-server start"
    print_info "  или"
    print_info "  sudo systemctl start redis"
    return 1
}

# Проверка и запуск Redis
ensure_redis_running() {
    if ! check_redis_status; then
        if ! start_redis; then
            print_error "Не удалось запустить Redis"
            exit 1
        fi
        
        # Повторная проверка после запуска
        if ! check_redis_status; then
            print_error "Redis не запустился"
            exit 1
        fi
    fi
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
    
    # Исправляем имя переименованной миграции, если необходимо
    if [ -f "backend/scripts/fix-migration-name.js" ]; then
        print_info "Проверка и исправление имени миграции..."
        cd backend && node scripts/fix-migration-name.js > /dev/null 2>&1 && cd ..
    fi
    
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
    
    # Проверка наличия react-scripts
    if [ ! -f "frontend/node_modules/.bin/react-scripts" ]; then
        print_info "react-scripts не найден, устанавливаю зависимости frontend..."
        cd frontend && npm install && cd ..
    fi
    
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
    
    # Проверка наличия node-cron
    if [ ! -d "backend/node_modules/node-cron" ] || [ ! -f "backend/node_modules/node-cron/package.json" ]; then
        print_info "node-cron не найден, устанавливаю зависимости backend..."
        cd backend && npm install && cd ..
    fi
    
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

# Создание nginx конфигурации для production
create_nginx_config() {
    print_info "Создание конфигурации nginx для production..."
    
    # Загружаем переменные окружения
    source .env
    
    local backend_port="${PORT:-5000}"
    local frontend_build_dir="$(pwd)/frontend/build"
    
    # Создаем временную конфигурацию nginx для bare-metal
    local nginx_config="/tmp/nginx-360-production.conf"
    
    cat > "$nginx_config" <<EOF
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    sendfile on;
    tcp_nopush on;
    keepalive_timeout 65;
    
    # Gzip сжатие
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    server {
        listen 80;
        server_name localhost;
        root ${frontend_build_dir};
        index index.html;
        
        # Основное приложение
        location / {
            try_files \$uri \$uri/ /index.html;
        }
        
        # API прокси на backend
        location /api/ {
            proxy_pass http://127.0.0.1:${backend_port};
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
            proxy_cache_bypass \$http_upgrade;
        }
        
        # Health check
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
        
        # Кэширование статических файлов
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
        
        error_page 404 /index.html;
    }
}
EOF
    
    echo "$nginx_config"
}

# Запуск в продакшн режиме
start_production() {
    print_info "Запуск в продакшн режиме..."
    
    # Загружаем переменные окружения
    source .env
    
    local backend_port="${PORT:-5000}"
    
    # Проверка наличия nginx
    if ! command -v nginx &> /dev/null; then
        print_error "nginx не установлен. Установите nginx для production режима:"
        print_info "  sudo apt-get install nginx  # Ubuntu/Debian"
        print_info "  sudo yum install nginx      # CentOS/RHEL"
        exit 1
    fi
    
    # Сборка проектов
    build_backend
    build_frontend
    
    # Проверка что frontend собран
    if [ ! -d "frontend/build" ]; then
        print_error "Frontend не собран. Директория frontend/build не найдена"
        exit 1
    fi
    
    # Создание конфигурации nginx
    local nginx_config=$(create_nginx_config)
    
    # Проверка и установка зависимостей backend перед запуском
    # Используем npm list для надежной проверки установки node-cron
    if ! cd backend && npm list node-cron &> /dev/null; then
        print_info "node-cron не установлен, устанавливаю зависимости backend..."
        npm install
        cd ..
    else
        cd ..
    fi
    
    # Запуск backend
    print_info "Запуск backend на порту ${backend_port}..."
    cd backend && npm start &
    BACKEND_PID=$!
    cd ..
    
    # Ожидание запуска backend
    sleep 3
    
    # Проверка что backend запустился
    if curl -s "http://localhost:${backend_port}/health" &> /dev/null; then
        print_success "Backend запущен успешно на порту ${backend_port}"
    else
        print_error "Backend не запустился на порту ${backend_port}"
        kill $BACKEND_PID 2>/dev/null
        exit 1
    fi
    
    # Запуск nginx
    print_info "Запуск nginx..."
    nginx_test_output=$(sudo nginx -t -c "$nginx_config" 2>&1)
    if [ $? -eq 0 ]; then
        # Останавливаем существующий nginx если запущен
        sudo nginx -s quit 2>/dev/null || true
        sleep 1
        
        # Запускаем nginx с нашей конфигурацией
        if sudo nginx -c "$nginx_config"; then
            print_success "Nginx запущен успешно"
        else
            print_error "Не удалось запустить nginx"
            kill $BACKEND_PID 2>/dev/null
            exit 1
        fi
    else
        print_error "Ошибка в конфигурации nginx:"
        echo "$nginx_test_output"
        kill $BACKEND_PID 2>/dev/null
        exit 1
    fi
    
    print_info "Система запущена!"
    print_info "Backend: http://localhost:${backend_port}/api"
    print_info "Frontend: http://localhost (через nginx)"
    print_info "Для остановки нажмите Ctrl+C"
    
    # Ожидание сигнала завершения
    trap "echo; print_info 'Остановка системы...'; kill $BACKEND_PID 2>/dev/null; sudo nginx -s quit 2>/dev/null; rm -f $nginx_config; exit 0" INT TERM
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
    echo "  --postgres          Только проверка и запуск PostgreSQL"
    echo "  --redis             Только проверка и запуск Redis"
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
    POSTGRES_ONLY=false
    REDIS_ONLY=false
    
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
            --postgres)
                POSTGRES_ONLY=true
                shift
                ;;
            --redis)
                REDIS_ONLY=true
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
    
    if [ "$POSTGRES_ONLY" = true ]; then
        ensure_postgres_running
        print_success "Проверка PostgreSQL завершена"
        exit 0
    fi
    
    if [ "$REDIS_ONLY" = true ]; then
        ensure_redis_running
        print_success "Проверка Redis завершена"
        exit 0
    fi
    
    # Установка зависимостей
    install_dependencies
    
    if [ "$INSTALL_ONLY" = true ]; then
        print_success "Установка зависимостей завершена"
        exit 0
    fi
    
    # Проверка и запуск PostgreSQL
    ensure_postgres_running
    
    # Проверка и запуск Redis
    ensure_redis_running
    
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