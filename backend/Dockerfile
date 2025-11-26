# Автор: Стас Чашин @chastnik
FROM node:20-alpine as builder
WORKDIR /app

COPY backend/package*.json ./
RUN npm ci

COPY backend/ ./
RUN npm run build

FROM node:20-alpine
WORKDIR /app

# Создаем пользователя для безопасности
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist
COPY backend/package*.json ./
COPY backend/knexfile.js ./
# Копируем миграции и seeds для выполнения через knex CLI
COPY --from=builder /app/src/database/migrations ./src/database/migrations
COPY --from=builder /app/src/database/seeds ./src/database/seeds
RUN npm ci --omit=dev

# Копируем корневой .env на время сборки не требуется; в рантайме переменные передаются окружением

EXPOSE 5000
USER appuser
CMD ["node", "dist/server.js"]


