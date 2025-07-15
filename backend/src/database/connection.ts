import knex from 'knex';
import { config } from 'dotenv';

config();

const knexConfig = {
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

export const db = knex(knexConfig);

export default db; 