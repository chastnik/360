// © 2025 Бит.Цифра - Стас Чашин
// Скрипт для исправления имени переименованной миграции в таблице knex_migrations

const knex = require('knex');
const path = require('path');
const fs = require('fs');

// Загружаем переменные окружения
const envPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
}

const dbConfig = {
  client: 'postgresql',
  connection: process.env.DATABASE_URL || {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'assessment_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
  },
};

async function fixMigrationName() {
  const db = knex(dbConfig);
  
  try {
    console.log('🔧 Исправление имени миграции в таблице knex_migrations...');
    
    // Проверяем, есть ли запись о старой миграции
    const oldMigration = await db('knex_migrations')
      .where('name', '20250130000001_recalculate_vacation_days_to_calendar.js')
      .first();
    
    if (!oldMigration) {
      console.log('✅ Старая миграция не найдена в таблице, возможно уже исправлено');
      
      // Проверяем, есть ли новая миграция
      const newMigration = await db('knex_migrations')
        .where('name', '20250926000001_recalculate_vacation_days_to_calendar.js')
        .first();
      
      if (newMigration) {
        console.log('✅ Новая миграция уже записана в таблице');
      } else {
        console.log('ℹ️  Новая миграция еще не выполнена, это нормально');
      }
      
      await db.destroy();
      return;
    }
    
    // Проверяем, есть ли уже запись о новой миграции
    const newMigration = await db('knex_migrations')
      .where('name', '20250926000001_recalculate_vacation_days_to_calendar.js')
      .first();
    
    if (newMigration) {
      console.log('⚠️  Новая миграция уже существует, удаляем старую запись...');
      await db('knex_migrations')
        .where('name', '20250130000001_recalculate_vacation_days_to_calendar.js')
        .delete();
      console.log('✅ Старая запись удалена');
    } else {
      // Обновляем имя миграции
      await db('knex_migrations')
        .where('name', '20250130000001_recalculate_vacation_days_to_calendar.js')
        .update({
          name: '20250926000001_recalculate_vacation_days_to_calendar.js'
        });
      console.log('✅ Имя миграции обновлено');
    }
    
    console.log('✅ Исправление завершено успешно');
    await db.destroy();
  } catch (error) {
    console.error('❌ Ошибка при исправлении миграции:', error);
    await db.destroy();
    process.exit(1);
  }
}

fixMigrationName();

