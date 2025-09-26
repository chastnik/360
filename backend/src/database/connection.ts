// Автор: Стас Чашин @chastnik
import knex from 'knex';
import { config } from 'dotenv';
import path from 'path';

// Загружаем переменные окружения из корневого .env файла
config({ path: path.resolve(__dirname, '../../.env') });

// Debug log
console.log('DB CONNECTION DEBUG:', {
  DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
  DB_HOST: process.env.DB_HOST,
  DB_USER: process.env.DB_USER,
  DB_NAME: process.env.DB_NAME
});

// Создаем подключение к базе данных
const dbConfig = process.env.DATABASE_URL ? {
  // Используем DATABASE_URL если доступен (production режим)
  client: 'postgresql',
  connection: process.env.DATABASE_URL,
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
} : {
  // Используем отдельные переменные (development режим)
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
};

const db = knex(dbConfig);

export { db };
export default db; 