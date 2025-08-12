# 🚀 Развертывание системы 360° оценки

Эта страница — обзор. Доступны две схемы развертывания:

- См. «DEPLOYMENT_DOCKER.md» — развертывание через Docker Compose
- См. «DEPLOYMENT_BARE.md» — развертывание без Docker (на хосте)

## 📋 Требования

### Системные требования
- **OS**: Ubuntu 20.04+ / CentOS 8+ / macOS 10.15+
- **RAM**: Минимум 4GB, рекомендуется 8GB
- **HDD**: Минимум 20GB свободного места
- **CPU**: 2 ядра, рекомендуется 4

### Программное обеспечение
- Git
- curl (для проверки здоровья)
- Для Docker-схемы: Docker 20.10+ и Docker Compose v2

## 🔧 Установка зависимостей

### Ubuntu/Debian
```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Установка Docker Compose
sudo apt install docker-compose-plugin

# Добавление пользователя в группу docker
sudo usermod -aG docker $USER

# Перезапуск сессии
newgrp docker
```

### CentOS/RHEL
```bash
# Обновление системы
sudo yum update -y

# Установка Docker
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo yum install -y docker-ce docker-ce-cli containerd.io

# Запуск Docker
sudo systemctl start docker
sudo systemctl enable docker

# Установка Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.0.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

## 📦 Развертывание

### 1. Клонирование репозитория
```bash
git clone <repository-url>
cd 360
```

### 2. Настройка переменных окружения
```bash
# Создание .env файла
cp env.example .env

# Редактирование переменных
nano .env
```

### 3. Выберите вариант развертывания
- Для Docker: следуйте «DEPLOYMENT_DOCKER.md»
- Для без-Docker: следуйте «DEPLOYMENT_BARE.md»

### 4. Быстрый старт (альтернатива)
При наличии Docker можно запустить всё разом:
```bash
docker compose up -d --build
```

## ⚙️ Конфигурация

### Обязательные переменные
```env
# База данных
DB_HOST=localhost
DB_PORT=5432
DB_PASSWORD=your_secure_password_here
DB_NAME=assessment360
DB_USER=assessment_user

# JWT секрет
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters

# URL фронтенда (для CORS и ссылок в уведомлениях)
FRONTEND_URL=http://localhost

# Mattermost
MATTERMOST_URL=https://your-mattermost-server.com
MATTERMOST_TOKEN=your-personal-access-token
MATTERMOST_TEAM_ID=your-team-id
```

### Дополнительные переменные
```env
# Порты
FRONTEND_PORT=80
BACKEND_PORT=5000

# Redis
REDIS_PASSWORD=your_redis_password
REDIS_PORT=6379

# SSL (для production)
SSL_CERT_PATH=/etc/ssl/certs/your-domain.crt
SSL_KEY_PATH=/etc/ssl/private/your-domain.key
```

## 🔒 Безопасность

### 1. Настройка SSL
```bash
# Создание самоподписанного сертификата для тестирования
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/private.key -out ssl/certificate.crt

# Или использование Let's Encrypt
certbot certonly --webroot -w /var/www/html -d your-domain.com
```

### 2. Настройка firewall
```bash
# Ubuntu/Debian
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=22/tcp
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --reload
```

### 3. Обновление паролей
```bash
# Генерация случайных паролей
DB_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 64)
REDIS_PASSWORD=$(openssl rand -base64 32)
```

## 📊 Мониторинг

### Проверка состояния
```bash
# Статус всех сервисов
./deploy.sh status

# Просмотр логов
./deploy.sh logs

# Просмотр логов конкретного сервиса
./deploy.sh logs backend
./deploy.sh logs frontend
./deploy.sh logs database
```

### Проверка здоровья
```bash
# Frontend (если настроен nginx)
curl -f http://localhost/health

# Backend
curl -f http://localhost:5000/health

# Database (в Docker)
docker compose exec database pg_isready -U assessment_user -d assessment360 | cat
```

## 🔄 Управление

### Основные команды
```bash
# Запуск системы
./deploy.sh start

# Остановка системы
./deploy.sh stop

# Перезапуск системы
./deploy.sh restart

# Проверка статуса
./deploy.sh status

# Просмотр логов
./deploy.sh logs [service]
```

### Обновление
```bash
# Обновление системы
./deploy.sh update

# Пересборка образов
./deploy.sh build
```

## 💾 Резервное копирование

### Создание резервных копий
```bash
# Ручное создание резервной копии (Docker)
docker compose exec database pg_dump -U assessment_user assessment360 > backup.sql
```

### Восстановление
```bash
# Восстановление (Docker)
docker compose exec -T database psql -U assessment_user -d assessment360 < backup.sql
```

### Автоматизация резервного копирования
```bash
# Добавление в crontab
crontab -e

# Ежедневное резервное копирование в 3:00
0 3 * * * /path/to/360-assessment-system/deploy.sh backup

# Еженедельная очистка старых резервных копий
0 4 * * 0 find /path/to/360-assessment-system -name "backup_*.sql" -mtime +7 -delete
```

## 🌐 Настройка домена

### Nginx конфигурация для домена
```nginx
# См. также nginx.conf в репозитории (вариант для контейнера)
server {
  listen 80;
  server_name your-domain.com;

  root /var/www/assessment360;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location /api/ {
    proxy_pass http://127.0.0.1:5000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

## 📈 Масштабирование

### Горизонтальное масштабирование
```yaml
# docker-compose.override.yml (пример)
services:
  backend:
      deploy:
        replicas: 3
  frontend:
      deploy:
        replicas: 2
```

### Использование внешней базы данных
```env
# Подключение к внешней PostgreSQL
DB_HOST=your-postgres-server.com
DB_PORT=5432
DB_NAME=assessment360
DB_USER=assessment_user
DB_PASSWORD=your_password
```

## 🚨 Устранение неисправностей

### Частые проблемы

#### 1. Контейнер не запускается
```bash
# Проверка логов (Docker)
docker compose logs [service] | cat

# Проверка состояния (Docker)
docker compose ps | cat
```

#### 2. База данных недоступна
```bash
# Проверка подключения (Docker)
docker compose exec database psql -U assessment_user -d assessment360 | cat

# Проверка логов базы данных (Docker)
docker compose logs database | cat
```

#### 3. Frontend не отображается
```bash
# Проверка nginx конфигурации (Docker)
docker compose exec frontend nginx -t | cat

# Перезапуск nginx (Docker)
docker compose restart frontend
```

#### 4. Проблемы с производительностью
```bash
# Мониторинг ресурсов
docker stats

# Проверка использования дискового пространства
docker system df
```

### Логи
```bash
# Все логи (Docker)
docker compose logs | cat

# Логи конкретного сервиса (Docker)
docker compose logs backend -f | cat

# Логи за последние 100 строк (Docker)
docker compose logs --tail=100 backend | cat
```

## 🔧 Техническое обслуживание

### Регулярные задачи
```bash
# Обновление системы (еженедельно)
./deploy.sh update

# Резервное копирование (ежедневно)
./deploy.sh backup

# Очистка старых образов (ежемесячно)
docker system prune -a

# Проверка состояния (ежедневно)
./deploy.sh status
```

### Автоматизация
```bash
# Создание systemd сервиса
sudo tee /etc/systemd/system/assessment360.service > /dev/null <<EOF
[Unit]
Description=360 Assessment System
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/path/to/360-assessment-system
ExecStart=/path/to/360-assessment-system/deploy.sh start
ExecStop=/path/to/360-assessment-system/deploy.sh stop
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

# Активация сервиса
sudo systemctl enable assessment360
sudo systemctl start assessment360
```

## 📞 Поддержка

При возникновении проблем:
1. Проверьте логи: `./deploy.sh logs`
2. Проверьте статус: `./deploy.sh status`
3. Перезапустите систему: `./deploy.sh restart`
4. Обратитесь к документации API
5. Создайте issue в репозитории

## 📚 Дополнительные ресурсы

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Mattermost API Documentation](https://api.mattermost.com/) 