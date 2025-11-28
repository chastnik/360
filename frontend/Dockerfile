# Автор: Стас Чашин @chastnik
FROM node:20-alpine as build
WORKDIR /app

COPY frontend/package*.json ./
# Пытаемся использовать npm ci для быстрой установки
# Если package-lock.json не синхронизирован, обновляем его и используем npm install
RUN npm ci || (echo "package-lock.json не синхронизирован, обновляю..." && npm install)

ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=${REACT_APP_API_URL}

COPY frontend/ ./
RUN npm run build

FROM nginx:1.25-alpine
# Устанавливаем wget для health check
RUN apk add --no-cache wget
# Копируем шаблон конфигурации nginx (только блок server)
# nginx:alpine автоматически обрабатывает шаблоны из /etc/nginx/templates/ с envsubst
COPY frontend/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]


