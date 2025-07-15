# 🚀 Развертывание системы 360° оценки

Данная документация описывает процесс развертывания системы 360° оценки персонала в производственной среде.

## 📋 Требования

### Системные требования
- **OS**: Ubuntu 20.04+ / CentOS 8+ / macOS 10.15+
- **RAM**: Минимум 4GB, рекомендуется 8GB
- **HDD**: Минимум 20GB свободного места
- **CPU**: 2 ядра, рекомендуется 4

### Программное обеспечение
- Docker 20.10+
- Docker Compose 2.0+
- Git
- curl (для проверки здоровья)

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
cd 360-assessment-system
```

### 2. Настройка переменных окружения
```bash
# Создание .env файла
cp env.example .env

# Редактирование переменных
nano .env
```

### 3. Быстрый запуск
```bash
# Сделать скрипт исполняемым
chmod +x deploy.sh

# Запуск системы
./deploy.sh start
```

### 4. Пошаговый запуск
```bash
# Проверка зависимостей
./deploy.sh build

# Запуск базы данных
docker-compose up -d database

# Ожидание готовности базы
sleep 30

# Запуск backend
docker-compose up -d backend

# Ожидание готовности backend
sleep 20

# Запуск frontend
docker-compose up -d frontend

# Проверка статуса
./deploy.sh status
```

## ⚙️ Конфигурация

### Обязательные переменные
```env
# База данных
DB_PASSWORD=your_secure_password_here
DB_NAME=assessment360
DB_USER=assessment_user

# JWT секрет
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters

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
# Frontend
curl -f http://localhost/health

# Backend
curl -f http://localhost:5000/api/health

# Database
docker-compose exec database pg_isready -U assessment_user -d assessment360
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
# Автоматическое создание резервной копии
./deploy.sh backup

# Ручное создание резервной копии
docker-compose exec database pg_dump -U assessment_user assessment360 > backup.sql
```

### Восстановление
```bash
# Восстановление из резервной копии
./deploy.sh restore backup_20240101_120000.sql

# Ручное восстановление
docker-compose exec -T database psql -U assessment_user -d assessment360 < backup.sql
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
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /etc/ssl/certs/your-domain.crt;
    ssl_certificate_key /etc/ssl/private/your-domain.key;
    
    location / {
        proxy_pass http://localhost:80;
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
# docker-compose.override.yml
version: '3.8'
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
# Проверка логов
docker-compose logs [service]

# Проверка состояния
docker-compose ps
```

#### 2. База данных недоступна
```bash
# Проверка подключения
docker-compose exec database psql -U assessment_user -d assessment360

# Проверка логов базы данных
docker-compose logs database
```

#### 3. Frontend не отображается
```bash
# Проверка nginx конфигурации
docker-compose exec frontend nginx -t

# Перезапуск nginx
docker-compose restart frontend
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
# Все логи
docker-compose logs

# Логи конкретного сервиса
docker-compose logs backend -f

# Логи за последние 100 строк
docker-compose logs --tail=100 backend
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