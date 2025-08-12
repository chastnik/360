/*
  Автоматическая простановка копирайта в файлах проекта
  Автор: Стас Чашин @chastnik
*/

const fs = require('fs');
const path = require('path');

const COPYRIGHT_TEXT = 'Автор: Стас Чашин @chastnik';

/**
 * Определяет формат комментария для файла по расширению/имени
 */
function getCommentWrapper(filePath) {
  const base = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase();

  // Специальные случаи по имени файла
  if (base === 'Dockerfile' || base.endsWith('.conf')) {
    return (text) => `# ${text}\n`;
  }

  switch (ext) {
    case '.ts':
    case '.tsx':
    case '.js':
    case '.jsx':
      return (text) => `// ${text}\n`;
    case '.sh':
    case '.env': // не используем, но для полноты
    case '.yml':
    case '.yaml':
    case '.conf':
      return (text) => `# ${text}\n`;
    case '.css':
    case '.scss':
    case '.less':
      return (text) => `/* ${text} */\n`;
    case '.md':
      // В markdown используем HTML-комментарий, чтобы не ломать оглавления
      return (text) => `<!-- ${text} -->\n`;
    default:
      return null;
  }
}

function shouldSkip(filePath) {
  const rel = filePath.replace(process.cwd() + path.sep, '');
  const lower = rel.toLowerCase();
  const base = path.basename(lower);

  // Пропускаем каталоги
  if (lower.includes(`${path.sep}node_modules${path.sep}`)) return true;
  if (lower.includes(`${path.sep}dist${path.sep}`)) return true;
  if (lower.includes(`${path.sep}build${path.sep}`)) return true;
  if (lower.includes(`${path.sep}.git${path.sep}`)) return true;

  // Пропускаем типы файлов
  if (base === 'package-lock.json') return true;
  if (base.endsWith('.lock')) return true;
  if (base.endsWith('.png') || base.endsWith('.jpg') || base.endsWith('.jpeg') || base.endsWith('.svg') || base.endsWith('.ico')) return true;
  if (base.endsWith('.json')) return true; // JSON не комментируем
  if (base.startsWith('.env')) return true; // .env* по правилам не трогаем

  return false;
}

function hasCopyright(content) {
  return content.includes(COPYRIGHT_TEXT);
}

function processFile(filePath) {
  if (shouldSkip(filePath)) return false;

  const wrapper = getCommentWrapper(filePath);
  if (!wrapper) return false;

  const content = fs.readFileSync(filePath, 'utf8');
  if (hasCopyright(content)) return false;

  // Учитываем shebang в shell-скриптах: #!/bin/bash должен оставаться первой строкой
  const isShell = filePath.endsWith('.sh');
  if (isShell && content.startsWith('#!')) {
    const firstNewline = content.indexOf('\n');
    const shebang = content.slice(0, firstNewline + 1);
    const rest = content.slice(firstNewline + 1);
    const updated = shebang + wrapper(COPYRIGHT_TEXT) + rest;
    fs.writeFileSync(filePath, updated, 'utf8');
    return true;
  }

  // Обычный случай — добавляем в начало файла
  const updated = wrapper(COPYRIGHT_TEXT) + content;
  fs.writeFileSync(filePath, updated, 'utf8');
  return true;
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['.git', 'node_modules', 'dist', 'build'].includes(entry.name)) continue;
      walk(fullPath);
    } else if (entry.isFile()) {
      try {
        processFile(fullPath);
      } catch (err) {
        // Игнорируем ошибки для проблемных файлов, чтобы не прерывать массовую операцию
      }
    }
  }
}

walk(process.cwd());
console.log('Копирайт добавлен (где применимо).');


