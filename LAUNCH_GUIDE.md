# 🚀 Руководство по запуску системы 360-градусной оценки персонала

**Copyright (c) 2025 Стас Чашин для БИТ.Цифра. Все права защищены.**

Это руководство поможет вам быстро запустить систему 360-градусной оценки персонала на любой платформе.

## 📋 Требования

### Минимальные требования
- **Node.js** версии 18+ ([скачать](https://nodejs.org/))
- **npm** (входит в комплект Node.js)
- **Python 3.7+** (для универсального скрипта, опционально)

### Дополнительные (опционально)
- **Docker** (для контейнеризации)
- **PostgreSQL** (для продакшн среды)

## 🎯 Быстрый старт

### Способ 1: Универсальный Python скрипт (Рекомендуется)

```bash
# Запуск в режиме разработки
python3 quick-start.py

# Или с указанием порта
python3 quick-start.py --port 8080

# Запуск в продакшн режиме
python3 quick-start.py --prod
```

### Способ 2: Bash скрипт (Linux/macOS)

```bash
# Простой запуск
./start.sh

# С параметрами
./start.sh --prod --port 8080

# Только настройка без запуска
./start.sh --setup
```

### Способ 3: Batch скрипт (Windows)

```cmd
REM Простой запуск
start.bat

REM С параметрами
start.bat --prod --port 8080

REM Только проверка
start.bat --check
```

### Способ 4: npm скрипты

```bash
# Быстрый запуск
npm run quick-start

# Продакшн режим
npm run quick-start:prod

# Только проверка
npm run quick-start:check

# Только настройка
npm run quick-start:setup
```

### Способ 5: Ручной запуск

```bash
# Установка зависимостей
npm install

# Настройка базы данных
npx prisma generate
npx prisma db push
npx prisma db seed

# Запуск в режиме разработки
npm run dev

# Или в продакшн режиме
npm run build
npm start
```

## 🐳 Docker запуск

### Быстрый Docker запуск

```bash
# Запуск с автоматической настройкой
./docker-start.sh up

# Продакшн режим с PostgreSQL
./docker-start.sh up --prod --postgres

# Остановка
./docker-start.sh down
```

### Ручной Docker запуск

```bash
# Сборка образа
docker build -t 360-feedback .

# Запуск контейнера
docker run -p 3000:3000 360-feedback
```

## ⚙️ Параметры запуска

### Основные опции

| Параметр | Описание | Пример |
|----------|----------|---------|
| `--dev` / `-d` | Режим разработки (по умолчанию) | `./start.sh --dev` |
| `--prod` / `-p` | Продакшн режим | `./start.sh --prod` |
| `--port` | Указать порт | `./start.sh --port 8080` |
| `--check` / `-c` | Только проверка зависимостей | `./start.sh --check` |
| `--setup` / `-s` | Только настройка без запуска | `./start.sh --setup` |

### Дополнительные опции

| Параметр | Описание | Пример |
|----------|----------|---------|
| `--skip-deps` | Пропустить установку зависимостей | `./start.sh --skip-deps` |
| `--force-seed` | Пересоздать базу данных | `./start.sh --force-seed` |
| `--help` / `-h` | Показать справку | `./start.sh --help` |

### Docker опции

| Параметр | Описание | Пример |
|----------|----------|---------|
| `--postgres` | Использовать PostgreSQL | `./docker-start.sh up --postgres` |
| `--build` | Пересобрать образ | `./docker-start.sh up --build` |

## 🔧 Настройка переменных окружения

Создайте файл `.env` или используйте автоматически созданный:

```env
# База данных
DATABASE_URL="file:./dev.db"

# Mattermost интеграция (опционально)
MATTERMOST_URL="https://your-mattermost.com"
MATTERMOST_TOKEN="your-bot-token"

# Настройки приложения
NODE_ENV="development"
PORT=3000

# Секретный ключ для сессий
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
```

### PostgreSQL настройка

Для использования PostgreSQL вместо SQLite:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/feedback360"
```

## 📊 Управление базой данных

### Основные команды

```bash
# Генерация Prisma клиента
npm run db:generate

# Применение изменений к БД
npm run db:push

# Заполнение тестовыми данными
npm run db:seed

# Полный сброс БД
npm run db:reset

# Открыть Prisma Studio
npm run db:studio
```

### Работа с миграциями

```bash
# Создать миграцию
npx prisma migrate dev --name init

# Применить миграции в продакшн
npx prisma migrate deploy
```

## 🌐 Доступ к приложению

После успешного запуска приложение будет доступно по адресам:

- **Основное приложение**: http://localhost:3000
- **API документация**: http://localhost:3000/api
- **Health check**: http://localhost:3000/api/health
- **Prisma Studio**: http://localhost:5555 (при запуске `npm run db:studio`)

### Тестовые учетные данные

По умолчанию создается администратор:
- **Email**: admin@company.com
- **Роль**: Администратор

## 🚨 Решение проблем

### Проблема: Node.js не найден

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# macOS
brew install node

# Windows - скачайте с https://nodejs.org/
```

### Проблема: Порт занят

Все скрипты автоматически проверяют доступность порта и предлагают варианты:
- Завершить процесс на порту
- Выбрать другой порт
- Указать порт через параметр `--port`

### Проблема: Ошибки с базой данных

```bash
# Пересоздать базу данных
./start.sh --force-seed

# Или вручную
rm prisma/dev.db
npx prisma db push
npx prisma db seed
```

### Проблема: Ошибки зависимостей

```bash
# Очистить кэш npm
npm cache clean --force

# Удалить node_modules и переустановить
rm -rf node_modules package-lock.json
npm install
```

### Проблема: Docker ошибки

```bash
# Очистить Docker ресурсы
./docker-start.sh clean

# Или вручную
docker system prune -a
docker-compose down -v
```

## 📝 Логи и отладка

### Просмотр логов

```bash
# Разработка (в терминале)
npm run dev

# Docker
./docker-start.sh logs

# Системные логи (Linux)
journalctl -u 360-feedback
```

### Отладка

1. **Проверка состояния**:
   ```bash
   # Проверка зависимостей
   ./start.sh --check
   
   # Health check
   curl http://localhost:3000/api/health
   ```

2. **Verbose режим**:
   ```bash
   DEBUG=* npm run dev
   ```

3. **Prisma отладка**:
   ```bash
   npx prisma studio
   ```

## 🔄 Обновление системы

### Обновление зависимостей

```bash
# Проверить устаревшие пакеты
npm outdated

# Обновить все пакеты
npm update

# Обновить конкретный пакет
npm install package@latest
```

### Обновление схемы БД

```bash
# После изменения schema.prisma
npx prisma db push

# Или создать миграцию
npx prisma migrate dev --name update_schema
```

## 🎯 Производительность

### Рекомендации для продакшн

1. **Использовать PostgreSQL**:
   ```env
   DATABASE_URL="postgresql://user:pass@localhost:5432/feedback360"
   ```

2. **Настроить переменные окружения**:
   ```env
   NODE_ENV="production"
   NEXT_TELEMETRY_DISABLED=1
   ```

3. **Использовать Docker**:
   ```bash
   ./docker-start.sh up --prod --postgres
   ```

4. **Настроить reverse proxy** (nginx, Apache)

5. **Использовать PM2** для управления процессами:
   ```bash
   npm install -g pm2
   pm2 start npm --name "360-feedback" -- start
   ```

## 📞 Поддержка

Если у вас возникли проблемы:

1. Проверьте этот файл на предмет решений
2. Запустите диагностику: `./start.sh --check`
3. Посмотрите логи приложения
4. Проверьте [README.md](./README.md) для дополнительной информации

---

**Время запуска**: ~2-5 минут (первый запуск)  
**Время запуска**: ~30 секунд (последующие запуски)

Удачного использования! 🎉 