#!/bin/bash

# Быстрый запуск системы в режиме разработки
# Использование: ./dev.sh

echo "🚀 Запуск системы 360 в режиме разработки..."
echo

# Проверяем наличие .env файла
if [ ! -f ".env" ]; then
    echo "⚠️  Файл .env не найден!"
    if [ -f "env.example" ]; then
        echo "📋 Копирую env.example в .env..."
        cp env.example .env
        echo "✅ Файл .env создан"
        echo "📝 Пожалуйста, отредактируйте .env с вашими настройками"
        echo "🔄 Затем запустите ./dev.sh снова"
        exit 1
    else
        echo "❌ Файл env.example не найден"
        exit 1
    fi
fi

# Устанавливаем зависимости если нужно
if [ ! -d "node_modules" ]; then
    echo "📦 Установка зависимостей корневого проекта..."
    npm install
fi

if [ ! -d "backend/node_modules" ]; then
    echo "📦 Установка зависимостей backend..."
    cd backend && npm install && cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Установка зависимостей frontend..."
    cd frontend && npm install && cd ..
fi

echo "✅ Все зависимости установлены"
echo

# Запускаем систему
echo "🌐 Запуск системы..."
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend:  http://localhost:3001"
echo "⏹️  Для остановки нажмите Ctrl+C"
echo

npm run dev 