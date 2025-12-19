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

# Определение корневой директории проекта
# Ищет директорию, содержащую backend/ и frontend/
get_project_root() {
    local current_dir="$1"
    local max_depth=5
    local depth=0
    
    # Начинаем с директории скрипта или текущей директории
    while [ "$depth" -lt "$max_depth" ] && [ "$current_dir" != "/" ]; do
        # Проверяем наличие характерных директорий проекта (backend и frontend обязательны)
        if [ -d "$current_dir/backend" ] && [ -d "$current_dir/frontend" ]; then
            echo "$current_dir"
            return 0
        fi
        # Переходим на уровень выше
        current_dir="$(dirname "$current_dir")"
        depth=$((depth + 1))
    done
    
    # Если не нашли, пробуем использовать текущую рабочую директорию
    if [ -d "$(pwd)/backend" ] && [ -d "$(pwd)/frontend" ]; then
        echo "$(pwd)"
        return 0
    fi
    
    # Если не нашли, возвращаем директорию скрипта
    echo "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    return 1
}

print_header() {
    echo -e "${PURPLE}================================${NC}"
    echo -e "${PURPLE}  Система 360-градусной оценки${NC}"
    echo -e "${PURPLE}================================${NC}"
    echo
}

# Функция установки/обновления Node.js через NVM
install_or_update_nodejs() {
    local required_version="20"
    local current_version=""
    
    if command -v node &> /dev/null; then
        current_version=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
        
        if [ "$current_version" -ge "$required_version" ]; then
            return 0
        fi
    fi
    
    print_warning "Требуется Node.js версии $required_version или выше"
    print_info "Текущая версия: $(node -v 2>/dev/null || echo 'не установлена')"
    
    read -p "Хотите установить/обновить Node.js через NVM? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Обновление Node.js отменено. Установите Node.js $required_version+ вручную."
        exit 1
    fi
    
    # Проверка наличия NVM
    if [ ! -s "$HOME/.nvm/nvm.sh" ]; then
        print_info "Установка NVM..."
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
        
        # Загрузка NVM
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
        [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
    else
        # Загрузка NVM если уже установлен
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
        [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
    fi
    
    # Установка последней LTS версии Node.js
    print_info "Установка последней LTS версии Node.js..."
    nvm install --lts
    nvm use --lts
    nvm alias default lts/*
    
    # Проверка установки
    if command -v node &> /dev/null; then
        print_success "Node.js установлен: $(node -v)"
        print_success "npm установлен: $(npm -v)"
    else
        print_error "Не удалось установить Node.js"
        exit 1
    fi
}

# Проверка наличия Node.js
check_node() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js не установлен."
        install_or_update_nodejs
        return
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 20 ]; then
        print_warning "Рекомендуется Node.js версии 20 или выше. Текущая версия: $(node --version)"
        install_or_update_nodejs
        return
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
    
    # Определяем корневую директорию проекта
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    local project_root=$(get_project_root "$script_dir")
    local backend_dir="$project_root/backend"
    
    # Проверка зависимостей backend
    if [ ! -d "$backend_dir/node_modules" ] || [ ! -d "$backend_dir/node_modules/node-cron" ] || [ ! -f "$backend_dir/node_modules/node-cron/package.json" ]; then
        print_info "Установка зависимостей backend..."
        (cd "$backend_dir" && npm install)
    fi
    
    # Обновление устаревших пакетов backend (опционально, только если есть обновления)
    if [ -d "$backend_dir/node_modules" ]; then
        print_info "Проверка обновлений пакетов backend..."
        outdated_count=$(cd "$backend_dir" && npm outdated 2>/dev/null | wc -l)
        if [ "$outdated_count" -gt 1 ]; then
            print_info "Найдены устаревшие пакеты. Обновление..."
            (cd "$backend_dir" && npm update)
        fi
    fi
    
    # Определяем корневую директорию проекта
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    local project_root=$(get_project_root "$script_dir")
    local frontend_dir="$project_root/frontend"
    
    # Проверка зависимостей frontend
    if [ ! -d "$frontend_dir/node_modules" ] || [ ! -f "$frontend_dir/node_modules/.bin/react-scripts" ]; then
        print_info "Установка зависимостей frontend..."
        (cd "$frontend_dir" && npm install)
    fi
    
    # Обновление устаревших пакетов frontend (опционально, только если есть обновления)
    if [ -d "$frontend_dir/node_modules" ]; then
        print_info "Проверка обновлений пакетов frontend..."
        outdated_count=$(cd "$frontend_dir" && npm outdated 2>/dev/null | wc -l)
        if [ "$outdated_count" -gt 1 ]; then
            print_info "Найдены устаревшие пакеты. Обновление..."
            (cd "$frontend_dir" && npm update)
        fi
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
    
    # Определяем корневую директорию проекта
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    local project_root=$(get_project_root "$script_dir")
    local backend_dir="$project_root/backend"
    
    # Проверяем наличие директории backend
    if [ ! -d "$backend_dir" ]; then
        print_error "Директория backend не найдена: $backend_dir"
        print_info "Убедитесь, что скрипт запускается из корня проекта"
        exit 1
    fi
    
    # Загружаем переменные окружения
    if [ -f "$project_root/.env" ]; then
        source "$project_root/.env"
    else
        print_error "Файл .env не найден в $project_root"
        exit 1
    fi
    
    # Исправляем имя переименованной миграции, если необходимо
    if [ -f "$backend_dir/scripts/fix-migration-name.js" ]; then
        print_info "Проверка и исправление имени миграции..."
        (cd "$backend_dir" && node scripts/fix-migration-name.js > /dev/null 2>&1) || true
    fi
    
    # Выполняем миграции
    if (cd "$backend_dir" && DB_HOST="$DB_HOST" DB_NAME="$DB_NAME" DB_USER="$DB_USER" DB_PASSWORD="$DB_PASSWORD" DB_PORT="$DB_PORT" npm run migrate); then
        print_success "Миграции выполнены успешно"
    else
        print_error "Ошибка при выполнении миграций"
        exit 1
    fi
}

# Запуск сидов
run_seeds() {
    print_info "Запуск сидов базы данных..."
    
    # Определяем корневую директорию проекта
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    local project_root=$(get_project_root "$script_dir")
    local backend_dir="$project_root/backend"
    
    # Проверяем наличие директории backend
    if [ ! -d "$backend_dir" ]; then
        print_error "Директория backend не найдена: $backend_dir"
        print_info "Убедитесь, что скрипт запускается из корня проекта"
        exit 1
    fi
    
    # Загружаем переменные окружения
    if [ -f "$project_root/.env" ]; then
        source "$project_root/.env"
    else
        print_error "Файл .env не найден в $project_root"
        exit 1
    fi
    
    # Выполняем сиды
    if (cd "$backend_dir" && DB_HOST="$DB_HOST" DB_NAME="$DB_NAME" DB_USER="$DB_USER" DB_PASSWORD="$DB_PASSWORD" DB_PORT="$DB_PORT" npm run seed); then
        print_success "Сиды выполнены успешно"
    else
        print_error "Ошибка при выполнении сидов"
        exit 1
    fi
}

# Сборка frontend
build_frontend() {
    local project_root="${1:-}"
    
    print_info "Сборка frontend..."
    
    # Если project_root не передан, определяем его
    if [ -z "$project_root" ]; then
        # Сначала пробуем текущую рабочую директорию (pwd), так как скрипт должен запускаться из корня проекта
        if [ -d "$(pwd)/backend" ] && [ -d "$(pwd)/frontend" ]; then
            project_root="$(pwd)"
        else
            # Если не нашли в текущей директории, используем get_project_root
            local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
            project_root=$(get_project_root "$script_dir")
            
            # Если и это не помогло, пробуем get_project_root с текущей директорией
            if [ ! -d "$project_root/backend" ] || [ ! -d "$project_root/frontend" ]; then
                project_root=$(get_project_root "$(pwd)")
            fi
        fi
    fi
    
    local frontend_dir="$project_root/frontend"
    
    # Проверяем наличие директории frontend
    if [ ! -d "$frontend_dir" ]; then
        print_error "Директория frontend не найдена: $frontend_dir"
        print_info "Убедитесь, что скрипт запускается из корня проекта"
        print_info "Текущая рабочая директория: $(pwd)"
        print_info "Корень проекта: $project_root"
        print_info "Ожидаемая структура: $project_root/frontend/"
        print_info "Проверка директорий:"
        print_info "  backend существует: $([ -d "$project_root/backend" ] && echo "да" || echo "нет")"
        print_info "  frontend существует: $([ -d "$project_root/frontend" ] && echo "да" || echo "нет")"
        exit 1
    fi
    
    # Проверка наличия react-scripts
    if [ ! -f "$frontend_dir/node_modules/.bin/react-scripts" ]; then
        print_info "react-scripts не найден, устанавливаю зависимости frontend..."
        (cd "$frontend_dir" && npm install)
    fi
    
    # Выполняем сборку
    if (cd "$frontend_dir" && npm run build); then
        print_success "Frontend собран успешно"
    else
        print_error "Ошибка при сборке frontend"
        exit 1
    fi
}

# Сборка backend
build_backend() {
    local project_root="${1:-}"
    
    print_info "Сборка backend..."
    
    # Если project_root не передан, определяем его
    if [ -z "$project_root" ]; then
        local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
        project_root=$(get_project_root "$script_dir")
        
        # Если не нашли через get_project_root, пробуем текущую директорию
        if [ ! -d "$project_root/backend" ] || [ ! -d "$project_root/frontend" ]; then
            if [ -d "$(pwd)/backend" ] && [ -d "$(pwd)/frontend" ]; then
                project_root="$(pwd)"
            fi
        fi
    fi
    
    local backend_dir="$project_root/backend"
    
    # Проверка наличия node-cron
    if [ ! -d "$backend_dir/node_modules/node-cron" ] || [ ! -f "$backend_dir/node_modules/node-cron/package.json" ]; then
        print_info "node-cron не найден, устанавливаю зависимости backend..."
        (cd "$backend_dir" && npm install)
    fi
    
    if (cd "$backend_dir" && npm run build); then
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
    
    # Определяем корневую директорию проекта
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    local project_root=$(get_project_root "$script_dir")
    
    # Проверка наличия SSL сертификатов
    # Используем пути из .env или значения по умолчанию относительно корня проекта
    local ssl_cert_path="${SSL_CERT_PATH:-$project_root/ssl/ssl.crt}"
    local ssl_key_path="${SSL_KEY_PATH:-$project_root/ssl/ssl.key}"
    
    # Преобразуем относительные пути в абсолютные
    if [[ "$ssl_cert_path" != /* ]]; then
        ssl_cert_path="$project_root/$ssl_cert_path"
    fi
    if [[ "$ssl_key_path" != /* ]]; then
        ssl_key_path="$project_root/$ssl_key_path"
    fi
    
    if [ ! -f "$ssl_cert_path" ] || [ ! -f "$ssl_key_path" ]; then
        print_error "SSL сертификаты не найдены!"
        print_info "Ожидаемые пути:"
        print_info "  Сертификат: $ssl_cert_path"
        print_info "  Ключ: $ssl_key_path"
        print_info ""
        print_info "Сертификаты должны быть созданы в директории ssl/ проекта."
        print_info "Для создания самоподписанного сертификата:"
        print_info "  mkdir -p $project_root/ssl"
        print_info "  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \\"
        print_info "    -keyout $project_root/ssl/ssl.key \\"
        print_info "    -out $project_root/ssl/ssl.crt \\"
        print_info "    -subj \"/C=RU/ST=Moscow/L=Moscow/O=Bit.Cifra/OU=IT/CN=localhost\""
        exit 1
    fi
    
    # Определяем корневую директорию проекта (если еще не определена)
    if [ -z "$project_root" ]; then
        local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
        project_root=$(get_project_root "$script_dir")
    fi
    local frontend_dir="$project_root/frontend"
    
    local backend_port="${PORT:-5000}"
    local frontend_build_dir="$frontend_dir/build"
    
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
        listen 443 ssl http2;
        server_name localhost;
        root ${frontend_build_dir};
        index index.html;
        
        # SSL конфигурация
        ssl_certificate ${ssl_cert_path};
        ssl_certificate_key ${ssl_key_path};
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;
        
        # Настройки безопасности
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload";
        
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
    
    # Определяем корневую директорию проекта
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    local project_root=$(get_project_root "$script_dir")
    
    # Если не нашли через get_project_root, пробуем текущую директорию
    if [ ! -d "$project_root/backend" ] || [ ! -d "$project_root/frontend" ]; then
        if [ -d "$(pwd)/backend" ] && [ -d "$(pwd)/frontend" ]; then
            project_root="$(pwd)"
        fi
    fi
    
    local frontend_dir="$project_root/frontend"
    
    # Сборка проектов (передаем project_root как параметр)
    build_backend "$project_root"
    build_frontend "$project_root"
    
    # Проверка что frontend собран
    if [ ! -d "$frontend_dir/build" ]; then
        print_error "Frontend не собран. Директория $frontend_dir/build не найдена"
        exit 1
    fi
    
    # Создание конфигурации nginx
    local nginx_config=$(create_nginx_config)
    
    # Используем тот же project_root, который был определен выше и передан в build_backend/build_frontend
    # Не определяем заново, чтобы избежать проблем с неправильным определением корня
    local backend_dir="$project_root/backend"
    
    # Проверка и установка зависимостей backend перед запуском
    # Проверяем наличие файла, который требуется для работы
    if [ ! -f "$backend_dir/node_modules/node-cron/dist/cjs/node-cron.js" ]; then
        print_info "node-cron не установлен полностью, переустанавливаю зависимости backend..."
        # Проверяем, установлен ли пакет вообще
        if [ ! -d "$backend_dir/node_modules/node-cron" ]; then
            print_info "Пакет node-cron отсутствует, устанавливаю..."
            (cd "$backend_dir" && npm install node-cron@^4.2.1)
        else
            print_info "Пакет node-cron найден, но файлы отсутствуют. Переустанавливаю..."
            (cd "$backend_dir" && rm -rf node_modules/node-cron && npm install node-cron@^4.2.1 --force)
        fi
        # Проверяем еще раз после установки
        if [ ! -f "$backend_dir/node_modules/node-cron/dist/cjs/node-cron.js" ]; then
            print_error "Не удалось установить node-cron полностью."
            print_info "Попробуйте выполнить вручную:"
            print_info "  cd $backend_dir"
            print_info "  rm -rf node_modules package-lock.json"
            print_info "  npm install"
            exit 1
        fi
        print_success "node-cron установлен успешно"
    fi
    
    # Проверка занятости порта перед запуском backend
    if command -v lsof &> /dev/null; then
        if lsof -Pi :${backend_port} -sTCP:LISTEN -t >/dev/null 2>&1; then
            print_warning "Порт ${backend_port} уже занят"
            print_info "Попытка остановить процесс на порту ${backend_port}..."
            lsof -ti :${backend_port} | xargs kill -9 2>/dev/null || true
            sleep 2
        fi
    elif command -v netstat &> /dev/null; then
        if netstat -tuln | grep -q ":${backend_port} "; then
            print_warning "Порт ${backend_port} уже занят"
            print_info "Найдите и остановите процесс вручную:"
            print_info "  lsof -i :${backend_port}  # или netstat -tulpn | grep :${backend_port}"
            exit 1
        fi
    fi
    
    # Используем тот же project_root, который был определен выше
    # Не определяем заново, чтобы избежать проблем с неправильным определением корня
    local backend_dir="$project_root/backend"
    
    # Запуск backend
    print_info "Запуск backend на порту ${backend_port}..."
    (cd "$backend_dir" && npm start > /tmp/backend.log 2>&1) &
    BACKEND_PID=$!
    
    # Ожидание запуска backend
    sleep 3
    
    # Проверка что backend запустился
    if curl -s "http://localhost:${backend_port}/health" &> /dev/null; then
        print_success "Backend запущен успешно на порту ${backend_port}"
    else
        print_error "Backend не запустился на порту ${backend_port}"
        print_info "Проверьте логи: tail -f /tmp/backend.log"
        if [ -f /tmp/backend.log ]; then
            print_info "Последние строки лога:"
            tail -20 /tmp/backend.log
        fi
        kill $BACKEND_PID 2>/dev/null
        exit 1
    fi
    
    # Запуск nginx
    print_info "Запуск nginx..."
    nginx_test_output=$(sudo nginx -t -c "$nginx_config" 2>&1)
    nginx_test_status=$?
    
    if [ $nginx_test_status -eq 0 ]; then
        # Останавливаем существующий nginx если запущен
        sudo nginx -s quit 2>/dev/null || true
        sleep 1
        
        # Запускаем nginx с нашей конфигурацией в фоне
        if sudo nginx -c "$nginx_config" 2>&1; then
            sleep 1
            # Проверяем, что nginx запустился
            if pgrep -x nginx > /dev/null; then
                print_success "Nginx запущен успешно"
            else
                print_error "Nginx не запустился (процесс не найден)"
                print_info "Проверьте логи nginx: sudo tail -f /var/log/nginx/error.log"
                kill $BACKEND_PID 2>/dev/null
                exit 1
            fi
        else
            print_error "Не удалось запустить nginx"
            print_info "Проверьте логи nginx: sudo tail -f /var/log/nginx/error.log"
            kill $BACKEND_PID 2>/dev/null
            exit 1
        fi
    else
        print_error "Ошибка в конфигурации nginx:"
        echo "$nginx_test_output"
        kill $BACKEND_PID 2>/dev/null
        exit 1
    fi
    
    echo ""
    print_success "=========================================="
    print_success "Система запущена и работает!"
    print_success "=========================================="
    echo ""
    print_info "Backend API: http://localhost:${backend_port}/api"
    print_info "Frontend: https://localhost:443 (через nginx на порту 443 с SSL)"
    print_info "Health check: http://localhost:${backend_port}/health"
    echo ""
    print_info "Для остановки системы нажмите Ctrl+C"
    print_info "Скрипт будет работать до получения сигнала завершения..."
    echo ""
    
    # Ожидание сигнала завершения
    trap "echo; print_info 'Получен сигнал завершения. Остановка системы...'; kill $BACKEND_PID 2>/dev/null; sudo nginx -s quit 2>/dev/null; rm -f $nginx_config; print_success 'Система остановлена'; exit 0" INT TERM
    
    # Ждем завершения backend процесса (или сигнала)
    wait $BACKEND_PID 2>/dev/null || true
    
    # Если wait завершился без сигнала, останавливаем nginx
    sudo nginx -s quit 2>/dev/null || true
    rm -f $nginx_config
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
        # Определяем корневую директорию проекта
        local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
        local project_root=$(get_project_root "$script_dir")
        
        # Если не нашли через get_project_root, пробуем текущую директорию
        if [ ! -d "$project_root/backend" ] || [ ! -d "$project_root/frontend" ]; then
            if [ -d "$(pwd)/backend" ] && [ -d "$(pwd)/frontend" ]; then
                project_root="$(pwd)"
            fi
        fi
        
        build_backend "$project_root"
        build_frontend "$project_root"
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