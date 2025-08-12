#!/bin/bash
# Автор: Стас Чашин @chastnik

# Скрипт для остановки всех сервисов системы 360
# Останавливает backend, frontend, dev-сервисы, освобождает порты

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_info() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_info "Останавливаю все процессы node, ts-node-dev, react-scripts, concurrently..."

PIDS=$(pgrep -f "ts-node-dev|react-scripts|concurrently|node.*(backend|frontend|360)")

if [ -z "$PIDS" ]; then
    print_info "Нет активных процессов node, связанных с системой 360."
else
    echo "$PIDS" | xargs kill -9 2>/dev/null
    print_success "Процессы остановлены: $PIDS"
fi

# Освобождаем порты 3000, 3001, 5000
for PORT in 3000 3001 5000; do
    PID=$(lsof -ti tcp:$PORT)
    if [ ! -z "$PID" ]; then
        kill -9 $PID 2>/dev/null
        print_success "Порт $PORT освобожден (PID $PID)"
    fi
done

print_success "Все сервисы системы 360 остановлены!" 