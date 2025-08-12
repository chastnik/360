#!/bin/bash
# Автор: Стас Чашин @chastnik

# Скрипт для мониторинга системы 360° оценки

# Настройки
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"
EMAIL_TO="${EMAIL_TO:-}"
CHECK_INTERVAL="${CHECK_INTERVAL:-60}"
LOG_FILE="/var/log/assessment360-monitoring.log"

# Функции для логирования
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1" | tee -a "$LOG_FILE"
}

# Функция для отправки уведомлений
send_notification() {
    local message="$1"
    local severity="$2"
    
    # Логирование
    if [ "$severity" == "ERROR" ]; then
        error "$message"
    else
        log "$message"
    fi
    
    # Отправка в Slack
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚨 360° Assessment System: $message\"}" \
            "$SLACK_WEBHOOK_URL" &> /dev/null
    fi
    
    # Отправка по email
    if [ -n "$EMAIL_TO" ]; then
        echo "$message" | mail -s "360° Assessment System Alert" "$EMAIL_TO" &> /dev/null
    fi
}

# Проверка состояния контейнеров
check_containers() {
    local failed_containers=()
    
    containers=("assessment_frontend" "assessment_backend" "assessment_db" "assessment_redis")
    
    for container in "${containers[@]}"; do
        if ! docker ps --filter "name=$container" --filter "status=running" | grep -q "$container"; then
            failed_containers+=("$container")
        fi
    done
    
    if [ ${#failed_containers[@]} -gt 0 ]; then
        send_notification "Контейнеры не работают: ${failed_containers[*]}" "ERROR"
        return 1
    fi
    
    return 0
}

# Проверка здоровья сервисов
check_health() {
    local failed_services=()
    
    # Проверка frontend
    if ! curl -f http://localhost/health &> /dev/null; then
        failed_services+=("frontend")
    fi
    
    # Проверка backend
    if ! curl -f http://localhost:5000/api/health &> /dev/null; then
        failed_services+=("backend")
    fi
    
    # Проверка базы данных
    if ! docker-compose exec -T database pg_isready -U assessment_user -d assessment360 &> /dev/null; then
        failed_services+=("database")
    fi
    
    # Проверка Redis
    if ! docker-compose exec -T redis redis-cli ping &> /dev/null; then
        failed_services+=("redis")
    fi
    
    if [ ${#failed_services[@]} -gt 0 ]; then
        send_notification "Сервисы не отвечают: ${failed_services[*]}" "ERROR"
        return 1
    fi
    
    return 0
}

# Проверка использования ресурсов
check_resources() {
    local alerts=()
    
    # Проверка использования диска
    disk_usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    if [ "$disk_usage" -gt 80 ]; then
        alerts+=("Диск заполнен на ${disk_usage}%")
    fi
    
    # Проверка использования памяти
    memory_usage=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
    if [ "$memory_usage" -gt 90 ]; then
        alerts+=("Память заполнена на ${memory_usage}%")
    fi
    
    # Проверка загрузки CPU
    cpu_usage=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}')
    if (( $(echo "$cpu_usage > 80" | bc -l) )); then
        alerts+=("CPU загружен на ${cpu_usage}%")
    fi
    
    if [ ${#alerts[@]} -gt 0 ]; then
        send_notification "Высокое использование ресурсов: ${alerts[*]}" "WARNING"
        return 1
    fi
    
    return 0
}

# Проверка логов на ошибки
check_logs() {
    local error_count=0
    
    # Проверка логов за последние 5 минут
    error_count=$(docker-compose logs --since=5m 2>&1 | grep -i "error\|exception\|fatal" | wc -l)
    
    if [ "$error_count" -gt 10 ]; then
        send_notification "Обнаружено $error_count ошибок в логах за последние 5 минут" "WARNING"
        return 1
    fi
    
    return 0
}

# Проверка размера базы данных
check_database_size() {
    local db_size
    db_size=$(docker-compose exec -T database psql -U assessment_user -d assessment360 -c "SELECT pg_size_pretty(pg_database_size('assessment360'));" -t | tr -d ' ')
    
    log "Размер базы данных: $db_size"
    
    # Проверка на критический размер (например, больше 5GB)
    db_size_bytes=$(docker-compose exec -T database psql -U assessment_user -d assessment360 -c "SELECT pg_database_size('assessment360');" -t | tr -d ' ')
    
    if [ "$db_size_bytes" -gt 5368709120 ]; then  # 5GB в байтах
        send_notification "База данных превысила 5GB: $db_size" "WARNING"
    fi
}

# Проверка SSL сертификатов
check_ssl_certificates() {
    local cert_file="${SSL_CERT_PATH:-/etc/ssl/certs/your-domain.crt}"
    
    if [ -f "$cert_file" ]; then
        # Проверка срока действия сертификата
        expiry_date=$(openssl x509 -in "$cert_file" -noout -enddate | cut -d= -f2)
        expiry_timestamp=$(date -d "$expiry_date" +%s)
        current_timestamp=$(date +%s)
        days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))
        
        if [ "$days_until_expiry" -lt 30 ]; then
            send_notification "SSL сертификат истекает через $days_until_expiry дней" "WARNING"
        fi
    fi
}

# Генерация отчета
generate_report() {
    local report_file="/tmp/assessment360_report_$(date +%Y%m%d_%H%M%S).txt"
    
    echo "=== Отчет о состоянии системы 360° оценки ===" > "$report_file"
    echo "Дата: $(date)" >> "$report_file"
    echo "" >> "$report_file"
    
    echo "=== Статус контейнеров ===" >> "$report_file"
    docker-compose ps >> "$report_file"
    echo "" >> "$report_file"
    
    echo "=== Использование ресурсов ===" >> "$report_file"
    echo "Диск: $(df -h / | tail -1 | awk '{print $5}')" >> "$report_file"
    echo "Память: $(free -h | grep Mem | awk '{print $3 "/" $2}')" >> "$report_file"
    echo "CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)%" >> "$report_file"
    echo "" >> "$report_file"
    
    echo "=== Размер базы данных ===" >> "$report_file"
    docker-compose exec -T database psql -U assessment_user -d assessment360 -c "SELECT pg_size_pretty(pg_database_size('assessment360'));" -t >> "$report_file"
    echo "" >> "$report_file"
    
    echo "=== Недавние ошибки ===" >> "$report_file"
    docker-compose logs --since=1h 2>&1 | grep -i "error\|exception\|fatal" | tail -20 >> "$report_file"
    
    echo "Отчет сохранен в $report_file"
}

# Основная функция мониторинга
monitor() {
    log "Начало проверки системы"
    
    local all_checks_passed=true
    
    # Выполнение всех проверок
    if ! check_containers; then
        all_checks_passed=false
    fi
    
    if ! check_health; then
        all_checks_passed=false
    fi
    
    if ! check_resources; then
        all_checks_passed=false
    fi
    
    if ! check_logs; then
        all_checks_passed=false
    fi
    
    check_database_size
    check_ssl_certificates
    
    if [ "$all_checks_passed" = true ]; then
        log "Все проверки пройдены успешно"
    else
        error "Обнаружены проблемы в системе"
    fi
}

# Функция для непрерывного мониторинга
continuous_monitoring() {
    log "Запуск непрерывного мониторинга (интервал: ${CHECK_INTERVAL}s)"
    
    while true; do
        monitor
        sleep "$CHECK_INTERVAL"
    done
}

# Главная функция
main() {
    case "${1:-monitor}" in
        monitor)
            monitor
            ;;
        continuous)
            continuous_monitoring
            ;;
        report)
            generate_report
            ;;
        containers)
            check_containers
            ;;
        health)
            check_health
            ;;
        resources)
            check_resources
            ;;
        logs)
            check_logs
            ;;
        help)
            echo "Использование: $0 [monitor|continuous|report|containers|health|resources|logs|help]"
            echo ""
            echo "Команды:"
            echo "  monitor     - Однократная проверка системы (по умолчанию)"
            echo "  continuous  - Непрерывный мониторинг"
            echo "  report      - Генерация отчета"
            echo "  containers  - Проверка контейнеров"
            echo "  health      - Проверка здоровья сервисов"
            echo "  resources   - Проверка ресурсов"
            echo "  logs        - Проверка логов"
            echo "  help        - Показать эту справку"
            ;;
        *)
            echo "Неизвестная команда: $1"
            echo "Используйте '$0 help' для получения справки"
            exit 1
            ;;
    esac
}

# Создание лог-файла, если он не существует
mkdir -p "$(dirname "$LOG_FILE")"
touch "$LOG_FILE"

# Запуск
main "$@" 