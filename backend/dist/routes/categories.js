"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const connection_1 = __importDefault(require("../database/connection"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/', auth_1.authenticateToken, (0, auth_1.requirePermission)('ui:view:admin.categories'), async (req, res) => {
    try {
        const isAdmin = req.user.role === 'admin';
        let query = (0, connection_1.default)('categories')
            .select('id', 'name', 'description', 'icon', 'color', 'sort_order', 'is_active', 'created_at', 'updated_at');
        if (!isAdmin) {
            query = query.where('is_active', true);
        }
        const categories = await query.orderBy('sort_order').orderBy('name');
        res.json({
            success: true,
            data: categories
        });
    }
    catch (error) {
        console.error('Ошибка получения категорий:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});
router.post('/', auth_1.authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Доступ запрещен' });
        }
        const { name, description, icon, color = '#3B82F6', sort_order = 0, is_active = true } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Обязательное поле: name' });
        }
        const existingCategory = await (0, connection_1.default)('categories')
            .where('name', name)
            .first();
        if (existingCategory) {
            return res.status(400).json({ error: 'Категория с таким названием уже существует' });
        }
        const [categoryId] = await (0, connection_1.default)('categories')
            .insert({
            name,
            description,
            icon,
            color,
            sort_order,
            is_active
        })
            .returning('id');
        res.json({
            success: true,
            data: { id: categoryId },
            message: 'Категория успешно создана'
        });
    }
    catch (error) {
        console.error('Ошибка создания категории:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});
router.put('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Доступ запрещен' });
        }
        const { id } = req.params;
        const { name, description, icon, color, sort_order, is_active } = req.body;
        const categoryExists = await (0, connection_1.default)('categories')
            .where('id', id)
            .first();
        if (!categoryExists) {
            return res.status(404).json({ error: 'Категория не найдена' });
        }
        if (name && name !== categoryExists.name) {
            const nameExists = await (0, connection_1.default)('categories')
                .where('name', name)
                .where('id', '!=', id)
                .first();
            if (nameExists) {
                return res.status(400).json({ error: 'Категория с таким названием уже существует' });
            }
        }
        const updateData = {};
        if (name !== undefined)
            updateData.name = name;
        if (description !== undefined)
            updateData.description = description;
        if (icon !== undefined)
            updateData.icon = icon;
        if (color !== undefined)
            updateData.color = color;
        if (sort_order !== undefined)
            updateData.sort_order = sort_order;
        if (is_active !== undefined)
            updateData.is_active = is_active;
        updateData.updated_at = new Date();
        await (0, connection_1.default)('categories')
            .where('id', id)
            .update(updateData);
        res.json({
            success: true,
            message: 'Категория успешно обновлена'
        });
    }
    catch (error) {
        console.error('Ошибка обновления категории:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});
router.patch('/:id/toggle-active', auth_1.authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Доступ запрещен' });
        }
        const { id } = req.params;
        const { is_active } = req.body;
        const categoryExists = await (0, connection_1.default)('categories')
            .where('id', id)
            .first();
        if (!categoryExists) {
            return res.status(404).json({ error: 'Категория не найдена' });
        }
        await (0, connection_1.default)('categories')
            .where('id', id)
            .update({
            is_active,
            updated_at: new Date()
        });
        res.json({
            success: true,
            message: `Категория успешно ${is_active ? 'активирована' : 'деактивирована'}`
        });
    }
    catch (error) {
        console.error('Ошибка изменения статуса категории:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});
router.patch('/reorder', auth_1.authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Доступ запрещен' });
        }
        const { categories } = req.body;
        if (!Array.isArray(categories) || categories.length === 0) {
            return res.status(400).json({ error: 'Требуется массив категорий' });
        }
        const transaction = await connection_1.default.transaction();
        try {
            for (const category of categories) {
                await transaction('categories')
                    .where('id', category.id)
                    .update({
                    sort_order: category.sort_order,
                    updated_at: new Date()
                });
            }
            await transaction.commit();
            res.json({
                success: true,
                message: 'Порядок категорий успешно обновлен'
            });
        }
        catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
    catch (error) {
        console.error('Ошибка изменения порядка категорий:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});
router.delete('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Доступ запрещен' });
        }
        const { id } = req.params;
        const categoryExists = await (0, connection_1.default)('categories')
            .where('id', id)
            .first();
        if (!categoryExists) {
            return res.status(404).json({ error: 'Категория не найдена' });
        }
        const questionsCount = await (0, connection_1.default)('questions')
            .where('category_id', id)
            .count('id as count')
            .first();
        if (questionsCount && parseInt(questionsCount.count) > 0) {
            return res.status(400).json({
                error: 'Нельзя удалить категорию, в которой есть вопросы'
            });
        }
        await (0, connection_1.default)('categories')
            .where('id', id)
            .del();
        res.json({
            success: true,
            message: 'Категория успешно удалена'
        });
    }
    catch (error) {
        console.error('Ошибка удаления категории:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});
exports.default = router;
//# sourceMappingURL=categories.js.map