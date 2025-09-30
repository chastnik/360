# © 2025 Бит.Цифра - Стас Чашин

#!/bin/bash
# Автор: Стас Чашин @chastnik

# Скрипт первоначальной настройки системы 360° оценки

set -e  # Остановиться при любой ошибке

echo "🚀 Настройка системы 360° оценки"
echo "=================================="

# Проверка Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не найден. Установите Node.js 16+ перед продолжением."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d 'v' -f 2)
echo "✅ Node.js версия: $NODE_VERSION"

# Проверка PostgreSQL
if ! command -v psql &> /dev/null; then
    echo "⚠️ PostgreSQL не найден в PATH. Убедитесь что PostgreSQL установлен."
fi

echo ""
echo "📋 Настройка переменных окружения"
echo "==================================="

# Создание .env файла для backend
if [ ! -f "backend/.env" ]; then
    echo "Создаем backend/.env файл..."
    
    read -p "Хост PostgreSQL [localhost]: " DB_HOST
    DB_HOST=${DB_HOST:-localhost}
    
    read -p "Порт PostgreSQL [5432]: " DB_PORT
    DB_PORT=${DB_PORT:-5432}
    
    read -p "Имя базы данных [assessment_db]: " DB_NAME
    DB_NAME=${DB_NAME:-assessment_db}
    
    read -p "Пользователь PostgreSQL [postgres]: " DB_USER
    DB_USER=${DB_USER:-postgres}
    
    read -s -p "Пароль PostgreSQL: " DB_PASSWORD
    echo ""
    
    read -p "Хост Redis [localhost]: " REDIS_HOST
    REDIS_HOST=${REDIS_HOST:-localhost}
    
    read -p "Порт Redis [6379]: " REDIS_PORT
    REDIS_PORT=${REDIS_PORT:-6379}
    
    read -s -p "Пароль Redis (опционально): " REDIS_PASSWORD
    echo ""
    
    # Генерация JWT секрета
    JWT_SECRET=$(openssl rand -base64 32)
    
    cat > backend/.env << EOF
# База данных
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD

# JWT
JWT_SECRET=$JWT_SECRET

# Сервер
PORT=5000
NODE_ENV=development

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Redis
REDIS_HOST=$REDIS_HOST
REDIS_PORT=$REDIS_PORT
REDIS_PASSWORD=$REDIS_PASSWORD

# Mattermost (можно настроить позже)
MATTERMOST_URL=https://your-mattermost-instance.com
MATTERMOST_TOKEN=your-bot-token-here
EOF
    
    echo "✅ Файл backend/.env создан"
else
    echo "✅ Файл backend/.env уже существует"
fi

echo ""
echo "📦 Установка зависимостей"
echo "========================="

# Установка зависимостей backend
echo "Установка зависимостей backend..."
cd backend
npm install
echo "✅ Зависимости backend установлены"

# Установка зависимостей frontend
echo "Установка зависимостей frontend..."
cd ../frontend
npm install
echo "✅ Зависимости frontend установлены"
cd ..

echo ""
echo "🗄️ Настройка базы данных"
echo "========================"

# Проверка подключения к БД
echo "Проверка подключения к PostgreSQL..."
cd backend

if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Подключение к PostgreSQL успешно"
else
    echo "❌ Не удалось подключиться к PostgreSQL. Проверьте настройки."
    echo "Попробуйте создать базу данных вручную:"
    echo "  createdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME"
    exit 1
fi

# Создание БД если не существует
echo "Создание базы данных $DB_NAME..."
if PGPASSWORD=$DB_PASSWORD createdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME 2>/dev/null; then
    echo "✅ База данных $DB_NAME создана"
else
    echo "ℹ️ База данных $DB_NAME уже существует"
fi

# Выполнение миграций
echo "Выполнение миграций..."
npm run migrate
echo "✅ Миграции выполнены"

# Заполнение начальными данными
echo "Заполнение начальными данными..."
npm run seed
echo "✅ Начальные данные загружены"

cd ..

echo ""
echo "👤 Создание администратора"
echo "=========================="

read -p "Email администратора: " ADMIN_EMAIL
read -p "Имя администратора: " ADMIN_FIRST_NAME
read -p "Фамилия администратора: " ADMIN_LAST_NAME

# Генерация временного пароля
TEMP_PASSWORD=$(openssl rand -base64 8)

# SQL для создания администратора
SQL_QUERY="INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, created_at, updated_at) 
VALUES ('$(echo $ADMIN_EMAIL | tr '[:upper:]' '[:lower:]')', 
        '\$2b\$10\$' || encode(digest('$TEMP_PASSWORD', 'sha256'), 'hex'),
        '$ADMIN_FIRST_NAME', 
        '$ADMIN_LAST_NAME', 
        'admin', 
        true, 
        NOW(), 
        NOW()
) ON CONFLICT (email) DO NOTHING;"

if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "$SQL_QUERY" > /dev/null 2>&1; then
    echo "✅ Администратор создан"
    echo "📧 Email: $ADMIN_EMAIL"
    echo "🔑 Временный пароль: $TEMP_PASSWORD"
    echo ""
    echo "⚠️ ВАЖНО: Смените пароль после первого входа!"
else
    echo "ℹ️ Пользователь с таким email уже существует или произошла ошибка"
fi

echo ""
echo "🎉 Настройка завершена!"
echo "======================"

echo ""
echo "🚀 Для запуска системы:"
echo "  1. Backend:  cd backend && npm run dev"
echo "  2. Frontend: cd frontend && npm start"
echo ""
echo "🌐 После запуска:"
echo "  - Frontend: http://localhost:3000"
echo "  - Backend:  http://localhost:5000"
echo ""
echo "🔧 Для дополнительной настройки:"
echo "  1. Войдите как администратор ($ADMIN_EMAIL)"
echo "  2. Перейдите в Администрирование → Настройки системы"
echo "  3. Настройте внешние подключения к БД/Redis если нужно"
echo ""
echo "📚 Документация:"
echo "  - STARTUP_GUIDE.md - руководство по запуску"
echo "  - SYSTEM_SETTINGS.md - настройки системы"
echo ""
echo "Удачного использования! 🎯" 