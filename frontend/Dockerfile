# Автор: Стас Чашин @chastnik
FROM node:20-alpine as build
WORKDIR /app

COPY frontend/package*.json ./
RUN npm ci

ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=${REACT_APP_API_URL}

COPY frontend/ ./
RUN npm run build

FROM nginx:1.25-alpine
COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]


