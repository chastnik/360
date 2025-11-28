#!/bin/bash
# © 2025 Бит.Цифра - Стас Чашин
# Автор: Стас Чашин @chastnik
# Обертка для docker compose с автоматической загрузкой .env файла

set -euo pipefail

# Загружаем переменные окружения из .env файла
if [ -f .env ]; then
    # Безопасная загрузка переменных окружения
    # Используем экспорт для всех переменных
    set -a
    # Игнорируем комментарии и пустые строки
    while IFS= read -r line || [ -n "$line" ]; do
        # Пропускаем комментарии и пустые строки
        [[ "$line" =~ ^[[:space:]]*# ]] && continue
        [[ -z "${line// }" ]] && continue
        
        # Экспортируем переменную
        if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
            export "$line"
        fi
    done < .env
    set +a
    echo "[INFO] Переменные окружения загружены из .env файла"
    echo "[INFO] PORT=${PORT:-не установлен}, BACKEND_PORT=${BACKEND_PORT:-не установлен}"
else
    echo "[WARNING] .env файл не найден, переменные окружения могут быть не установлены"
fi

# Передаем все аргументы в docker compose
exec docker compose "$@"

