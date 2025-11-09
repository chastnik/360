// © 2025 Бит.Цифра - Стас Чашин

// Автор: Стас Чашин @chastnik
import db from '../database/connection';

async function recordMigration() {
  try {
    console.log('🔄 Запись миграции в таблицу knex_migrations...');
    
    // Проверяем, не записана ли уже миграция
    const existing = await db('knex_migrations')
      .where('name', '20250201000000_add_resume_to_users.js')
      .first();
    
    if (existing) {
      console.log('✅ Миграция уже записана в таблицу knex_migrations');
      await db.destroy();
      return;
    }
    
    // Получаем максимальный batch
    const maxBatch = await db('knex_migrations')
      .max('batch as max_batch')
      .first();
    
    const nextBatch = (maxBatch?.max_batch || 0) + 1;
    
    // Добавляем запись о миграции
    await db('knex_migrations').insert({
      name: '20250201000000_add_resume_to_users.js',
      batch: nextBatch
    });
    
    console.log(`✅ Миграция записана в таблицу knex_migrations (batch: ${nextBatch})`);
    
    await db.destroy();
  } catch (error: any) {
    console.error('❌ Ошибка записи миграции:', error);
    await db.destroy();
    process.exit(1);
  }
}

recordMigration();

