// © 2025 Бит.Цифра - Стас Чашин

// Автор: Стас Чашин @chastnik
import db from '../database/connection';

async function runMigration() {
  try {
    console.log('🔄 Запуск миграции для добавления поля resume...');
    
    // Проверяем, существует ли поле resume
    const hasColumn = await db.schema.hasColumn('users', 'resume');
    
    if (hasColumn) {
      console.log('✅ Поле resume уже существует в таблице users');
      await db.destroy();
      return;
    }
    
    // Выполняем миграцию вручную
    console.log('📝 Добавление поля resume в таблицу users...');
    await db.schema.alterTable('users', (table) => {
      table.text('resume').nullable();
    });
    
    console.log('✅ Миграция выполнена успешно! Поле resume добавлено в таблицу users');
    
    await db.destroy();
  } catch (error: any) {
    console.error('❌ Ошибка выполнения миграции:', error);
    await db.destroy();
    process.exit(1);
  }
}

runMigration();

