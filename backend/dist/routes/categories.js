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
        const categories = await (0, connection_1.default)('categories')
            .select('id', 'name', 'description', 'color')
            .where('is_active', true)
            .orderBy('name');
        res.json(categories);
    }
    catch (error) {
        console.error('Ошибка получения категорий:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});
exports.default = router;
//# sourceMappingURL=categories.js.map