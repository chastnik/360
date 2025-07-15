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
        const questions = await (0, connection_1.default)('questions')
            .select('id', 'category_id', 'text', 'type', 'order_index')
            .where('is_active', true)
            .orderBy('category_id', 'order_index');
        res.json(questions);
    }
    catch (error) {
        console.error('Ошибка получения вопросов:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});
exports.default = router;
//# sourceMappingURL=questions.js.map