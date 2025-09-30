#!/usr/bin/env bash
set -euo pipefail

# Скрипт добавляет копирайт в начало файлов по расширениям, если он ещё не добавлен
# © 2025 Бит.Цифра - Стас Чашин

ROOT_DIR="$(cd "$(dirname "$0")"/.. && pwd)"
HEADER_TEXT="© 2025 Бит.Цифра - Стас Чашин"

shopt -s globstar

should_skip() {
  local path="$1"
  [[ "$path" == *"/node_modules/"* ]] && return 0
  [[ "$path" == *"/.git/"* ]] && return 0
  [[ "$path" == *"/dist/"* ]] && return 0
  [[ "$path" == *"/build/"* ]] && return 0
  [[ "$path" == *"/.cache/"* ]] && return 0
  [[ -d "$path" ]] && return 0
  return 1
}

prepend_header() {
  local file="$1"
  local comment_start="$2"
  local comment_end="$3"

  # Уже содержит копирайт?
  if grep -m1 -q "$HEADER_TEXT" "$file"; then
    return 0
  fi

  # Сгенерировать строку заголовка в зависимости от синтаксиса
  local header_line
  if [[ -n "$comment_end" ]]; then
    header_line="${comment_start} ${HEADER_TEXT} ${comment_end}"
  else
    header_line="${comment_start} ${HEADER_TEXT}"
  fi

  # Временный файл для атомарной замены
  local tmp
  tmp="$(mktemp)"
  {
    echo "$header_line"
    echo
    cat "$file"
  } > "$tmp"
  mv "$tmp" "$file"
}

process_file() {
  local file="$1"
  case "$file" in
    *.ts|*.tsx|*.js|*.jsx)
      prepend_header "$file" "//" ""
      ;;
    *.css|*.scss|*.html)
      prepend_header "$file" "/*" "*/"
      ;;
    *.sh|*.bash)
      prepend_header "$file" "#" ""
      ;;
    *.yml|*.yaml)
      prepend_header "$file" "#" ""
      ;;
    *)
      return 0
      ;;
  esac
}

export -f should_skip
export -f prepend_header
export -f process_file
export HEADER_TEXT

cd "$ROOT_DIR"

# Обойти все файлы и обработать те, что соответствуют поддерживаемым типам
while IFS= read -r -d '' path; do
  if should_skip "$path"; then
    continue
  fi
  process_file "$path"
done < <(find "$ROOT_DIR" -type f -print0)

echo "Готово: копирайт добавлен, где отсутствовал."



