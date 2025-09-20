<!-- Автор: Стас Чашин @chastnik -->
# Скрипты запуска системы 360

## Обзор

Система 360-градусной оценки персонала включает несколько скриптов для удобного запуска в различных режимах.

## Основные скрипты

### 1. `start.sh` - Универсальный скрипт запуска

Полнофункциональный скрипт с проверками окружения и множеством опций.

#### Использование:
```bash
./start.sh [опции]
```

#### Опции:
- `-h, --help` - Показать справку
- `-d, --dev` - Запуск в режиме разработки (по умолчанию)
- `-p, --production` - Запуск в продакшн режиме
- `-i, --install` - Только установка зависимостей
- `-m, --migrate` - Только выполнение миграций
- `-s, --seed` - Только выполнение сидов
- `-b, --build` - Только сборка проектов
- `-c, --check` - Только проверка окружения
- `--postgres` - Только проверка и запуск PostgreSQL

#### Примеры:
```bash
# Запуск в режиме разработки
./start.sh --dev

# Запуск в продакшн режиме
./start.sh --production

# Только установка зависимостей
./start.sh --install

# Только миграции
./start.sh --migrate

# Проверка окружения
./start.sh --check

# Проверка и запуск PostgreSQL
./start.sh --postgres
```

### 2. `dev.sh` - Быстрый запуск для разработки

Простой скрипт для быстрого запуска в режиме разработки.

#### Использование:
```bash
./dev.sh
```

#### Особенности:
- Автоматическая проверка и создание `.env` файла
- Автоматическая установка зависимостей
- Запуск backend и frontend одновременно
- Цветной вывод с эмодзи

## Режимы работы

### Режим разработки (Development)

**Команда:** `./start.sh --dev` или `./dev.sh`

**Особенности:**
- Запуск backend на порту 3001
- Запуск frontend на порту 3000
- Hot reload для обоих сервисов
- Детальные логи
- Автоматическая перезагрузка при изменениях

**URL:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api

### Продакшн режим (Production)

**Команда:** `./start.sh --production`

**Особенности:**
- Сборка проектов перед запуском
- Запуск только backend (frontend через nginx)
- Выполнение миграций и сидов
- Проверка здоровья сервисов
- Graceful shutdown

**URL:**
- Frontend: http://localhost:80 (через nginx)
- Backend API: http://localhost:3001/api

## Проверки и требования

### Системные требования

- **Node.js:** версия 16 или выше
- **npm:** любая версия
- **PostgreSQL:** запущен и доступен
- **Redis:** запущен и доступен (опционально)

### Автоматические проверки

Скрипт `start.sh` выполняет следующие проверки:

1. **Node.js и npm** - проверка наличия и версии
2. **Файл .env** - проверка наличия конфигурации
3. **Зависимости** - проверка и установка node_modules
4. **PostgreSQL** - автоматическая проверка и запуск сервера БД
5. **База данных** - проверка подключения к PostgreSQL
6. **Миграции** - выполнение миграций БД
7. **Сиды** - заполнение начальными данными

### Автоматическая проверка PostgreSQL

Скрипт `start.sh` автоматически проверяет статус PostgreSQL и запускает его при необходимости.

**Что делает скрипт:**
- Проверяет, запущен ли PostgreSQL
- Если не запущен, пытается запустить через:
  - `service postgresql start`
  - `systemctl start postgresql`
  - `pg_ctl start` (напрямую)
- Ждет 3 секунды для полного запуска
- Повторно проверяет статус после запуска

**Использование:**
```bash
# Проверить и запустить только PostgreSQL
./start.sh --postgres

# PostgreSQL проверяется автоматически при любом запуске
./start.sh --dev
./start.sh --production
```

**Выходные данные:**
```
[INFO] Проверка статуса PostgreSQL...
[WARNING] PostgreSQL не запущен
[INFO] Запуск PostgreSQL...
Starting PostgreSQL 15 database server: main.
[SUCCESS] PostgreSQL запущен через service
[INFO] Проверка статуса PostgreSQL...
[SUCCESS] PostgreSQL запущен
```

## Устранение проблем

### Ошибка "Node.js не установлен"
```bash
# Установка Node.js на macOS
brew install node

# Установка Node.js на Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Ошибка "Файл .env не найден"
```bash
# Скопировать пример конфигурации
cp env.example .env

# Отредактировать настройки
nano .env
```

### Ошибка подключения к базе данных

**Автоматическое решение:**
Скрипт `start.sh` автоматически проверяет и запускает PostgreSQL. Если проблема остается:

```bash
# Принудительная проверка PostgreSQL
./start.sh --postgres
```

**Ручное решение:**
1. Проверьте статус PostgreSQL:
```bash
# Проверка процессов PostgreSQL
ps aux | grep postgres

# Проверка порта
netstat -tulpn | grep 5432
```

2. Запустите PostgreSQL вручную:
```bash
# Через service
sudo service postgresql start

# Через systemctl
sudo systemctl start postgresql

# Через pg_ctl
sudo -u postgres pg_ctl start -D /var/lib/postgresql/15/main
```

3. Проверьте настройки в `.env` файле
4. Создайте базу данных и пользователя:
```bash
# Подключитесь к PostgreSQL
psql -U postgres

# Создайте базу данных
CREATE DATABASE assessment360;

# Создайте пользователя
CREATE USER assessment_user WITH PASSWORD 'your_password';

# Дайте права пользователю
GRANT ALL PRIVILEGES ON DATABASE assessment360 TO assessment_user;
```

### Ошибка "ECONNREFUSED 127.0.0.1:5432"

Эта ошибка означает, что PostgreSQL не запущен или недоступен.

**Решение:**
```bash
# Автоматический запуск через скрипт
./start.sh --postgres

# Или вручную
sudo service postgresql start
```

### Ошибка "Port already in use"
```bash
# Найти процесс на порту
lsof -i :3000
lsof -i :3001

# Убить процесс
kill -9 <PID>
```

## Логирование

### Уровни логов
- `[INFO]` - Информационные сообщения (синий)
- `[SUCCESS]` - Успешные операции (зеленый)
- `[WARNING]` - Предупреждения (желтый)
- `[ERROR]` - Ошибки (красный)

### Просмотр логов
```bash
# Логи backend
tail -f backend/logs/app.log

# Логи frontend (в режиме разработки)
# Логи выводятся в консоль
```

## Интеграция с IDE

### VS Code
Добавьте в `.vscode/launch.json`:
```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Launch 360 System",
            "type": "node",
            "request": "launch",
            "program": "${workspaceFolder}/start.sh",
            "args": ["--dev"],
            "console": "integratedTerminal"
        }
    ]
}
```

### IntelliJ IDEA / WebStorm
1. Создайте новую конфигурацию "Run External Tool"
2. Program: `./start.sh`
3. Arguments: `--dev`
4. Working directory: корень проекта

## Автоматизация

### Добавление в PATH
```bash
# Добавить в ~/.bashrc или ~/.zshrc
export PATH="$PATH:/path/to/your/360/project"

# Теперь можно запускать из любой директории
360-start --dev
```

### Создание алиасов
```bash
# Добавить в ~/.bashrc или ~/.zshrc
alias 360-dev='cd /path/to/your/360/project && ./dev.sh'
alias 360-prod='cd /path/to/your/360/project && ./start.sh --production'
alias 360-postgres='cd /path/to/your/360/project && ./start.sh --postgres'
alias 360-check='cd /path/to/your/360/project && ./start.sh --check'
```

## Безопасность

### Переменные окружения
- Никогда не коммитьте `.env` файл в git
- Используйте `.env.example` как шаблон
- Храните секреты в безопасном месте

### Права доступа
```bash
# Установить правильные права на скрипты
chmod +x start.sh dev.sh

# Установить права только для владельца на .env
chmod 600 .env
```

## Мониторинг

### Проверка состояния системы
```bash
# Проверка процессов
ps aux | grep node

# Проверка портов
netstat -tulpn | grep :300

# Проверка логов
tail -f backend/logs/app.log
```

### Автоматический перезапуск
```bash
# Использовать nodemon для разработки
npm install -g nodemon
nodemon start.sh --dev
```

## Практические примеры

### Ежедневная работа с системой

```bash
# Утром: запуск системы
./start.sh --dev

# Если PostgreSQL не запустился автоматически
./start.sh --postgres

# Проверка состояния системы
./start.sh --check

# Остановка и перезапуск
./start.sh --production
```

### Отладка проблем

```bash
# Пошаговая диагностика
./start.sh --check          # Проверка окружения
./start.sh --postgres       # Проверка PostgreSQL
./start.sh --migrate        # Проверка миграций
./start.sh --dev            # Запуск в режиме разработки
```

### Автоматизация в CI/CD

```bash
# В скрипте деплоя
./start.sh --postgres       # Убедиться что БД запущена
./start.sh --migrate        # Выполнить миграции
./start.sh --build          # Собрать проект
./start.sh --production     # Запустить в продакшн режиме
```

## Поддержка

При возникновении проблем:

1. Проверьте логи системы
2. Убедитесь в корректности настроек в `.env`
3. Проверьте подключение к базе данных с помощью `./start.sh --postgres`
4. Перезапустите систему с флагом `--check`

Для получения помощи обратитесь к документации проекта или создайте issue в репозитории. 