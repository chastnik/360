# Настройка интеграции с Mattermost

## Требования

1. Доступ к серверу Mattermost
2. Права администратора для создания личного токена доступа
3. Доступ к команде (team) где будет работать система

## Шаги настройки

### 1. Создание Personal Access Token

1. Войдите в Mattermost как администратор
2. Перейдите в **Системная консоль** → **Интеграции** → **Интеграции пользователей**
3. Включите **Разрешить личные токены доступа**
4. Перейдите в **Настройки аккаунта** → **Безопасность** → **Личные токены доступа**
5. Нажмите **Создать токен**
6. Введите описание: "360 Assessment System"
7. Скопируйте сгенерированный токен

### 2. Создание бота (рекомендуется)

1. Создайте отдельного пользователя для бота:
   - Username: `360-assessment-bot`
   - Email: `360-bot@company.com`
   - Имя: `360 Assessment Bot`
2. Добавьте бота в нужную команду
3. Создайте Personal Access Token для бота

### 3. Получение Team ID

1. Перейдите в вашу команду в Mattermost
2. В браузере скопируйте URL: `https://mattermost.company.com/your-team-name`
3. Или используйте API: `GET /api/v4/teams/name/your-team-name`

### 4. Настройка переменных окружения

Добавьте следующие переменные в файл `.env`:

```bash
# Mattermost Integration
MATTERMOST_URL=https://mattermost.company.com
MATTERMOST_TOKEN=your_personal_access_token_here
MATTERMOST_TEAM_ID=your_team_id_here
MATTERMOST_BOT_USERNAME=360-assessment-bot
```

### 5. Настройка пользователей

После настройки интеграции:

1. Запустите сервер: `npm run dev`
2. Войдите как администратор в систему
3. Перейдите в раздел Mattermost интеграции
4. Нажмите **Синхронизировать пользователей**
5. Система автоматически добавит/обновит пользователей из Mattermost

## API Endpoints

### Проверка подключения
```
GET /api/mattermost/test-connection
```

### Синхронизация пользователей
```
POST /api/mattermost/sync-users
```

### Отправка уведомлений о запуске цикла
```
POST /api/mattermost/notify-cycle-start/:cycleId
```

### Отправка уведомлений респондентам
```
POST /api/mattermost/notify-respondents/:cycleId
```

### Отправка напоминаний
```
POST /api/mattermost/send-reminders/:cycleId
```

### Статистика интеграции
```
GET /api/mattermost/integration-stats
```

## Типы уведомлений

### 1. Уведомление о запуске цикла
Отправляется участникам при запуске цикла оценки:
- **Заголовок**: "🎯 Запущен новый цикл оценки"
- **Кнопка**: "Перейти к опросам"

### 2. Уведомление респондентам
Отправляется респондентам о необходимости пройти оценку:
- **Заголовок**: "📝 Требуется ваша оценка"
- **Кнопка**: "Пройти опрос"

### 3. Напоминание
Отправляется при незавершенных опросах:
- **Заголовок**: "⏰ Напоминание об опросе"
- **Кнопка**: "Завершить опрос"

### 4. Уведомление о завершении
Отправляется участнику когда все респонденты завершили оценку:
- **Заголовок**: "✅ Ваша оценка завершена"
- **Кнопка**: "Просмотреть отчет"

## Автоматические уведомления

Система автоматически отправляет уведомления в следующих случаях:

1. **При запуске цикла** (cycles.ts):
   - Уведомления участникам
   - Уведомления респондентам

2. **При завершении оценки** (assessments.ts):
   - Уведомление участнику когда все респонденты завершили оценку

## Устранение неполадок

### Ошибка "Пользователь не найден"
- Проверьте, что пользователь существует в Mattermost
- Убедитесь, что синхронизация прошла успешно
- Проверьте поле `mattermost_username` в базе данных

### Ошибка подключения
- Проверьте URL Mattermost
- Убедитесь, что токен действителен
- Проверьте права доступа токена

### Уведомления не отправляются
- Проверьте статус интеграции: `GET /api/mattermost/integration-stats`
- Убедитесь, что бот может отправлять прямые сообщения
- Проверьте логи сервера

### Неполная синхронизация
- Убедитесь, что Team ID корректный
- Проверьте, что пользователи активны в Mattermost
- Убедитесь, что у токена есть права на чтение пользователей

## Безопасность

1. **Токен доступа**: Храните токен в безопасности, не коммитьте в git
2. **Права доступа**: Используйте принцип минимальных прав
3. **HTTPS**: Всегда используйте HTTPS для Mattermost URL
4. **Ротация токенов**: Регулярно обновляйте токены доступа

## Дополнительные возможности

### Кастомизация сообщений
Вы можете изменить тексты уведомлений в файле `src/services/mattermost.ts`

### Добавление новых типов уведомлений
1. Добавьте новый метод в `MattermostService`
2. Создайте соответствующий API endpoint
3. Интегрируйте с бизнес-логикой

### Расширение функциональности
- Интерактивные сообщения с кнопками
- Веб-хуки для обработки ответов
- Интеграция с каналами команд
- Статистика по уведомлениям 