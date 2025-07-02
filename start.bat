@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM Скрипт запуска системы 360-градусной оценки персонала для Windows
REM Copyright (c) 2025 Стас Чашин для БИТ.Цифра
REM Все права защищены

echo.
echo 🚀 Система 360-градусной оценки персонала
echo =========================================
echo.

REM Установка переменных по умолчанию
set "MODE=dev"
set "PORT=3000"
set "SKIP_DEPS=false"
set "FORCE_SEED=false"
set "SETUP_ONLY=false"
set "CHECK_ONLY=false"

REM Обработка аргументов командной строки
:parse_args
if "%~1"=="" goto :start_setup
if /i "%~1"=="--help" goto :show_help
if /i "%~1"=="-h" goto :show_help
if /i "%~1"=="--dev" set "MODE=dev" & shift & goto :parse_args
if /i "%~1"=="-d" set "MODE=dev" & shift & goto :parse_args
if /i "%~1"=="--prod" set "MODE=prod" & shift & goto :parse_args
if /i "%~1"=="-p" set "MODE=prod" & shift & goto :parse_args
if /i "%~1"=="--check" set "CHECK_ONLY=true" & shift & goto :parse_args
if /i "%~1"=="-c" set "CHECK_ONLY=true" & shift & goto :parse_args
if /i "%~1"=="--setup" set "SETUP_ONLY=true" & shift & goto :parse_args
if /i "%~1"=="-s" set "SETUP_ONLY=true" & shift & goto :parse_args
if /i "%~1"=="--port" set "PORT=%~2" & shift & shift & goto :parse_args
if /i "%~1"=="--skip-deps" set "SKIP_DEPS=true" & shift & goto :parse_args
if /i "%~1"=="--force-seed" set "FORCE_SEED=true" & shift & goto :parse_args
echo [ERROR] Неизвестная опция: %~1
goto :show_help

:show_help
echo Скрипт запуска системы 360-градусной оценки персонала
echo.
echo Использование: %~nx0 [ОПЦИИ]
echo.
echo Опции:
echo   -h, --help     Показать справку
echo   -d, --dev      Запуск в режиме разработки (по умолчанию)
echo   -p, --prod     Запуск в продакшн режиме
echo   -c, --check    Только проверка зависимостей
echo   -s, --setup    Только настройка без запуска
echo   --port PORT    Указать порт (по умолчанию 3000)
echo   --skip-deps    Пропустить установку зависимостей
echo   --force-seed   Пересоздать базу данных с тестовыми данными
echo.
echo Примеры:
echo   %~nx0                    # Запуск в режиме разработки
echo   %~nx0 --prod             # Запуск в продакшн режиме
echo   %~nx0 --port 8080        # Запуск на порту 8080
echo   %~nx0 --setup            # Только настройка
echo.
exit /b 0

:start_setup
echo [INFO] Режим: %MODE%, Порт: %PORT%
echo.

REM Проверка Node.js
echo [INFO] Проверка Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js не установлен!
    echo [INFO] Установите Node.js версии 18+ с https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
set NODE_VERSION=%NODE_VERSION:v=%
for /f "tokens=1 delims=." %%a in ("%NODE_VERSION%") do set MAJOR_VERSION=%%a

if %MAJOR_VERSION% lss 18 (
    echo [ERROR] Требуется Node.js версии 18+, установлена версия %NODE_VERSION%
    pause
    exit /b 1
)

echo [SUCCESS] Node.js версии %NODE_VERSION% найдена

REM Проверка npm
echo [INFO] Проверка npm...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm не установлен!
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo [SUCCESS] npm версии %NPM_VERSION% найдена

REM Проверка только зависимостей
if "%CHECK_ONLY%"=="true" (
    echo [SUCCESS] Все проверки пройдены!
    pause
    exit /b 0
)

REM Проверка .env файла
echo [INFO] Проверка переменных окружения...
if not exist ".env" (
    echo [WARNING] .env файл не найден, создаю с базовыми настройками...
    (
        echo # База данных
        echo DATABASE_URL="file:./dev.db"
        echo.
        echo # Mattermost интеграция (опционально^)
        echo MATTERMOST_URL=""
        echo MATTERMOST_TOKEN=""
        echo.
        echo # Настройки приложения
        echo NODE_ENV="development"
        echo PORT=3000
        echo.
        echo # Секретный ключ для сессий
        echo NEXTAUTH_SECRET="your-secret-key-here"
        echo NEXTAUTH_URL="http://localhost:3000"
    ) > .env
    echo [SUCCESS] .env файл создан
) else (
    echo [SUCCESS] .env файл найден
)

REM Установка зависимостей
if "%SKIP_DEPS%"=="false" (
    if not exist "node_modules" (
        echo [INFO] Установка зависимостей...
        npm install
        if %errorlevel% neq 0 (
            echo [ERROR] Ошибка при установке зависимостей
            pause
            exit /b 1
        )
        echo [SUCCESS] Зависимости установлены
    ) else (
        echo [INFO] Зависимости уже установлены, проверяем обновления...
        npm ci
        if %errorlevel% neq 0 (
            echo [WARNING] Ошибка при обновлении зависимостей, продолжаю...
        )
    )
)

REM Пересоздание базы данных если нужно
if "%FORCE_SEED%"=="true" (
    echo [WARNING] Пересоздание базы данных...
    if exist "prisma\dev.db" del "prisma\dev.db"
)

REM Настройка базы данных
echo [INFO] Настройка базы данных...
npx prisma generate
if %errorlevel% neq 0 (
    echo [ERROR] Ошибка при генерации Prisma клиента
    pause
    exit /b 1
)

if not exist "prisma\dev.db" (
    echo [INFO] Создание базы данных...
    npx prisma db push
    if %errorlevel% neq 0 (
        echo [ERROR] Ошибка при создании базы данных
        pause
        exit /b 1
    )
    
    echo [INFO] Заполнение базы данных тестовыми данными...
    npx prisma db seed
    if %errorlevel% neq 0 (
        echo [ERROR] Ошибка при заполнении базы данных
        pause
        exit /b 1
    )
    
    echo [SUCCESS] База данных создана и заполнена
) else (
    echo [INFO] База данных уже существует, применяю изменения...
    npx prisma db push
    if %errorlevel% neq 0 (
        echo [WARNING] Ошибка при обновлении базы данных, продолжаю...
    ) else (
        echo [SUCCESS] База данных обновлена
    )
)

REM Только настройка
if "%SETUP_ONLY%"=="true" (
    echo [SUCCESS] Настройка завершена!
    pause
    exit /b 0
)

REM Проверка занятости порта
echo [INFO] Проверка порта %PORT%...
netstat -an | find ":%PORT% " | find "LISTENING" >nul
if %errorlevel% equ 0 (
    echo [WARNING] Порт %PORT% уже занят!
    echo [INFO] Список процессов на порту %PORT%:
    netstat -ano | find ":%PORT% " | find "LISTENING"
    echo.
    set /p "KILL_PROCESS=Хотите завершить процесс и продолжить? (y/N): "
    if /i "!KILL_PROCESS!"=="y" (
        for /f "tokens=5" %%a in ('netstat -ano ^| find ":%PORT% " ^| find "LISTENING"') do (
            echo [INFO] Завершение процесса %%a...
            taskkill /PID %%a /F >nul 2>&1
        )
        echo [SUCCESS] Процессы завершены
    ) else (
        echo [ERROR] Выберите другой порт или завершите процесс вручную
        pause
        exit /b 1
    )
)

REM Запуск приложения
echo.
echo [SUCCESS] 🎉 Настройка завершена! Запуск приложения...
echo [INFO] Приложение будет доступно по адресу: http://localhost:%PORT%
echo [INFO] Для остановки нажмите Ctrl+C
echo.

if "%MODE%"=="prod" (
    echo [INFO] Сборка приложения для продакшн...
    npm run build
    if %errorlevel% neq 0 (
        echo [ERROR] Ошибка при сборке приложения
        pause
        exit /b 1
    )
    
    echo [INFO] Запуск в продакшн режиме...
    set PORT=%PORT%
    npm start
) else (
    echo [INFO] Запуск в режиме разработки...
    set PORT=%PORT%
    npm run dev
)

pause 