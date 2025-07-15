"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const knex_1 = __importDefault(require("knex"));
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
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
exports.db = (0, knex_1.default)(knexConfig);
exports.default = exports.db;
//# sourceMappingURL=connection.js.map