"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const connection_1 = __importDefault(require("../database/connection"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/', auth_1.authenticateToken, async (_req, res) => {
    try {
        const users = await (0, connection_1.default)('users')
            .select('id', 'email', 'first_name', 'last_name', 'role', 'is_active', 'created_at')
            .where('is_active', true)
            .orderBy('last_name', 'first_name');
        res.json(users);
    }
    catch (error) {
        console.error('Ошибка получения пользователей:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});
exports.default = router;
//# sourceMappingURL=users.js.map