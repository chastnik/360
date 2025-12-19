# SSL Сертификаты

Эта директория содержит SSL сертификаты для работы фронтенда на порту 443 (HTTPS).

## Текущие файлы

- `ssl.crt` - SSL сертификат (самоподписанный, для разработки/тестирования)
- `ssl.key` - Приватный ключ SSL сертификата

## Важно

⚠️ **Приватный ключ (`ssl.key`) НЕ должен попадать в git!**

Текущие сертификаты - самоподписанные и подходят только для разработки и тестирования.

## Для production

Для production окружения необходимо заменить самоподписанные сертификаты на сертификаты от доверенного CA:

1. **Let's Encrypt** (бесплатно):
   ```bash
   certbot certonly --webroot -w /var/www/html -d your-domain.com
   ```

2. **Коммерческий CA** - приобретите сертификат у провайдера

3. Скопируйте сертификаты в эту директорию:
   ```bash
   cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ssl/ssl.crt
   cp /etc/letsencrypt/live/your-domain.com/privkey.pem ssl/ssl.key
   ```

## Создание нового самоподписанного сертификата

Если нужно пересоздать сертификат:

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/ssl.key \
  -out ssl/ssl.crt \
  -subj "/C=RU/ST=Moscow/L=Moscow/O=Bit.Cifra/OU=IT/CN=localhost"
```

Для использования с конкретным доменом замените `CN=localhost` на `CN=your-domain.com`.

## Права доступа

Убедитесь, что права доступа установлены правильно:
- Сертификат: `chmod 644 ssl/ssl.crt`
- Приватный ключ: `chmod 600 ssl/ssl.key`

