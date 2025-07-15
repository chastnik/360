#!/bin/sh

# Скрипт для настройки переменных окружения в frontend контейнере

# Создаем файл конфигурации для frontend
cat > /usr/share/nginx/html/config.js << EOF
window.ENV = {
  REACT_APP_API_URL: '${REACT_APP_API_URL:-http://localhost:5000/api}',
  NODE_ENV: '${NODE_ENV:-production}'
};
EOF

# Заменяем переменные в HTML файлах
find /usr/share/nginx/html -name "*.html" -exec sed -i 's|%REACT_APP_API_URL%|'${REACT_APP_API_URL:-http://localhost:5000/api}'|g' {} \;
find /usr/share/nginx/html -name "*.js" -exec sed -i 's|%REACT_APP_API_URL%|'${REACT_APP_API_URL:-http://localhost:5000/api}'|g' {} \;

echo "Frontend configuration updated"
echo "API URL: ${REACT_APP_API_URL:-http://localhost:5000/api}"

# Запускаем nginx
exec "$@" 