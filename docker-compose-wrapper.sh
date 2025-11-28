#!/bin/bash
# © 2025 Бит.Цифра - Стас Чашин
# Автор: Стас Чашин @chastnik
# Обертка для docker compose с автоматической загрузкой .env файла

set -euo pipefail

# Загружаем переменные окружения из .env файла
if [ -f .env ]; then
    # Безопасная загрузка переменных окружения
    set -a
    source .env
    set +a
    echo "[INFO] Переменные окружения загружены из .env файла"
else
    echo "[WARNING] .env файл не найден, переменные окружения могут быть не установлены"
fi

# Передаем все аргументы в docker compose
exec docker compose "$@"

