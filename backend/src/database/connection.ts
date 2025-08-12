// Автор: Стас Чашин @chastnik
import knex from 'knex';
import { config } from 'dotenv';
import path from 'path';

// Загружаем переменные окружения из корневого .env файла
config({ path: path.resolve(__dirname, '../../.env') });

// Создаем подключение к базе данных
const db = knex({
  client: 'postgresql',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'assessment_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
  },
  pool: {
    min: 2,
    max: 10
  },
  migrations: {
    tableName: 'knex_migrations',
    directory: './migrations'
  },
  seeds: {
    directory: './seeds'
  }
});

export { db };
export default db; 