"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const connection_1 = __importDefault(require("../database/connection"));
const auth_1 = require("../middleware/auth");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const multer_1 = __importDefault(require("multer"));
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });
const initializeRoleConstraint = async () => {
    try {
        await connection_1.default.raw(`
      ALTER TABLE users 
      DROP CONSTRAINT IF EXISTS users_role_check;
      
      ALTER TABLE users 
      ADD CONSTRAINT users_role_check 
      CHECK (role IN ('admin', 'hr', 'manager', 'user'));
    `);
        console.log('✅ Ограничение роли обновлено для поддержки HR');
    }
    catch (error) {
        console.log('ℹ️  Ограничение роли уже обновлено или не требует изменений');
    }
};
initializeRoleConstraint();
const router = (0, express_1.Router)();
router.get('/', auth_1.authenticateToken, (0, auth_1.requirePermission)('ui:view:admin.users'), async (_req, res) => {
    try {
        const users = await (0, connection_1.default)('users')
            .select('id', 'email', 'first_name', 'last_name', 'middle_name', 'role', 'is_active', 'created_at', 'position', 'old_department as department', 'department_id', 'manager_id', 'mattermost_username', 'is_manager', 'avatar_url', 'avatar_updated_at')
            .where('is_active', true)
            .orderBy('last_name', 'first_name');
        res.json({
            success: true,
            data: users
        });
    }
    catch (error) {
        console.error('Ошибка получения пользователей:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});
router.get('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const user = await (0, connection_1.default)('users')
            .select('id', 'email', 'first_name', 'last_name', 'middle_name', 'role', 'is_active', 'created_at', 'position', 'old_department as department', 'department_id', 'manager_id', 'mattermost_username', 'is_manager', 'avatar_url')
            .where('id', id)
            .first();
        if (!user) {
            res.status(404).json({ error: 'Пользователь не найден' });
            return;
        }
        res.json({
            success: true,
            data: user
        });
    }
    catch (error) {
        console.error('Ошибка получения пользователя:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});
router.put('/profile', auth_1.authenticateToken, async (req, res) => {
    try {
        const { first_name, last_name, email, position, department, department_id, avatar_url } = req.body;
        const userId = req.user.userId;
        if (email) {
            const existingUser = await (0, connection_1.default)('users')
                .where('email', email)
                .where('id', '!=', userId)
                .first();
            if (existingUser) {
                res.status(400).json({ error: 'Данный email уже используется' });
                return;
            }
        }
        await (0, connection_1.default)('users')
            .where('id', userId)
            .update({
            first_name,
            last_name,
            email,
            position,
            old_department: department,
            department_id: department_id && department_id.trim() !== '' ? department_id : null,
            avatar_url: avatar_url && String(avatar_url).trim() !== '' ? avatar_url : null,
            updated_at: new Date()
        });
        const updatedUser = await (0, connection_1.default)('users')
            .select('id', 'email', 'first_name', 'last_name', 'middle_name', 'role', 'position', 'old_department as department', 'department_id', 'manager_id', 'mattermost_username', 'is_manager', 'is_active', 'created_at', 'updated_at', 'avatar_url')
            .where('id', userId)
            .first();
        res.json({
            success: true,
            user: updatedUser,
            message: 'Профиль успешно обновлен'
        });
    }
    catch (error) {
        console.error('Ошибка обновления профиля:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});
router.put('/password', auth_1.authenticateToken, async (req, res) => {
    try {
        const { current_password, new_password } = req.body;
        const userId = req.user.userId;
        if (!current_password || !new_password) {
            res.status(400).json({ error: 'Необходимо указать текущий и новый пароль' });
            return;
        }
        if (new_password.length < 6) {
            res.status(400).json({ error: 'Новый пароль должен содержать не менее 6 символов' });
            return;
        }
        const user = await (0, connection_1.default)('users')
            .select('password_hash')
            .where('id', userId)
            .first();
        if (!user) {
            res.status(404).json({ error: 'Пользователь не найден' });
            return;
        }
        const isCurrentPasswordValid = await bcryptjs_1.default.compare(current_password, user.password_hash);
        if (!isCurrentPasswordValid) {
            res.status(400).json({ error: 'Неверный текущий пароль' });
            return;
        }
        const hashedNewPassword = await bcryptjs_1.default.hash(new_password, 10);
        await (0, connection_1.default)('users')
            .where('id', userId)
            .update({
            password_hash: hashedNewPassword,
            updated_at: new Date()
        });
        res.json({
            success: true,
            message: 'Пароль успешно изменен'
        });
    }
    catch (error) {
        console.error('Ошибка смены пароля:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});
router.post('/', auth_1.authenticateToken, (0, auth_1.requirePermission)('action:users:create'), async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            res.status(403).json({ error: 'Недостаточно прав доступа' });
            return;
        }
        const { email, first_name, last_name, middle_name, role, role_id, position, department, department_id, manager_id, mattermost_username, avatar_url, password = 'defaultPassword123' } = req.body;
        if (!email || !first_name || !last_name) {
            res.status(400).json({ error: 'Email, имя и фамилия обязательны для заполнения' });
            return;
        }
        const existingUser = await (0, connection_1.default)('users').where('email', email).first();
        if (existingUser) {
            res.status(400).json({ error: 'Пользователь с таким email уже существует' });
            return;
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        if (department_id) {
            const departmentExists = await (0, connection_1.default)('departments').where('id', department_id).where('is_active', true).first();
            if (!departmentExists) {
                res.status(400).json({ error: 'Указанный отдел не найден' });
                return;
            }
        }
        const [newUser] = await (0, connection_1.default)('users')
            .insert({
            email,
            first_name,
            last_name,
            middle_name,
            role: role || 'user',
            role_id: role_id && role_id.trim() !== '' ? role_id : null,
            position,
            old_department: department,
            department_id: department_id && department_id.trim() !== '' ? department_id : null,
            manager_id: manager_id && manager_id.trim() !== '' ? manager_id : null,
            avatar_url: avatar_url && String(avatar_url).trim() !== '' ? avatar_url : null,
            mattermost_username,
            password_hash: hashedPassword,
            is_active: true,
            created_at: new Date(),
            updated_at: new Date()
        })
            .returning(['id', 'email', 'first_name', 'last_name', 'middle_name', 'role', 'position', 'old_department', 'department_id', 'manager_id', 'mattermost_username', 'is_active', 'created_at', 'updated_at']);
        res.status(201).json({
            success: true,
            user: newUser,
            message: 'Пользователь создан успешно'
        });
    }
    catch (error) {
        console.error('Ошибка создания пользователя:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});
router.put('/:id', auth_1.authenticateToken, (0, auth_1.requirePermission)('action:users:update'), async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            res.status(403).json({ error: 'Недостаточно прав доступа' });
            return;
        }
        const userId = req.params.id;
        const { email, first_name, last_name, middle_name, role, position, department, department_id, manager_id, mattermost_username, avatar_url, is_manager } = req.body;
        const existingUser = await (0, connection_1.default)('users').where('id', userId).first();
        if (!existingUser) {
            res.status(404).json({ error: 'Пользователь не найден' });
            return;
        }
        if (email && email !== existingUser.email) {
            const duplicateUser = await (0, connection_1.default)('users')
                .where('email', email)
                .where('id', '!=', userId)
                .first();
            if (duplicateUser) {
                res.status(400).json({ error: 'Пользователь с таким email уже существует' });
                return;
            }
        }
        if (department_id) {
            const departmentExists = await (0, connection_1.default)('departments').where('id', department_id).where('is_active', true).first();
            if (!departmentExists) {
                res.status(400).json({ error: 'Указанный отдел не найден' });
                return;
            }
        }
        await (0, connection_1.default)('users')
            .where('id', userId)
            .update({
            email,
            first_name,
            last_name,
            middle_name,
            role,
            role_id: req.body.role_id && String(req.body.role_id).trim() !== '' ? req.body.role_id : null,
            position,
            old_department: department,
            department_id: department_id && department_id.trim() !== '' ? department_id : null,
            manager_id: manager_id && manager_id.trim() !== '' ? manager_id : null,
            mattermost_username,
            avatar_url: avatar_url && String(avatar_url).trim() !== '' ? avatar_url : null,
            is_manager: is_manager === true || is_manager === 'true',
            updated_at: new Date()
        });
        const updatedUser = await (0, connection_1.default)('users')
            .select(['id', 'email', 'first_name', 'last_name', 'middle_name', 'role', 'position', 'old_department', 'department_id', 'manager_id', 'mattermost_username', 'avatar_url', 'is_manager', 'is_active', 'created_at', 'updated_at'])
            .where('id', userId)
            .first();
        res.json({
            success: true,
            user: updatedUser,
            message: 'Пользователь обновлен успешно'
        });
    }
    catch (error) {
        console.error('Ошибка обновления пользователя:', error);
        console.error('Детали ошибки:', {
            message: error.message,
            code: error.code,
            detail: error.detail,
            constraint: error.constraint
        });
        res.status(500).json({
            error: 'Внутренняя ошибка сервера',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});
router.patch('/:id/activate', auth_1.authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            res.status(403).json({ error: 'Недостаточно прав доступа' });
            return;
        }
        const userId = req.params.id;
        const user = await (0, connection_1.default)('users').where('id', userId).first();
        if (!user) {
            res.status(404).json({ error: 'Пользователь не найден' });
            return;
        }
        await (0, connection_1.default)('users')
            .where('id', userId)
            .update({
            is_active: true,
            updated_at: new Date()
        });
        res.json({
            success: true,
            message: 'Пользователь активирован'
        });
    }
    catch (error) {
        console.error('Ошибка активации пользователя:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});
router.patch('/:id/deactivate', auth_1.authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            res.status(403).json({ error: 'Недостаточно прав доступа' });
            return;
        }
        const userId = req.params.id;
        const user = await (0, connection_1.default)('users').where('id', userId).first();
        if (!user) {
            res.status(404).json({ error: 'Пользователь не найден' });
            return;
        }
        if (userId === req.user.userId) {
            res.status(400).json({ error: 'Нельзя деактивировать самого себя' });
            return;
        }
        await (0, connection_1.default)('users')
            .where('id', userId)
            .update({
            is_active: false,
            updated_at: new Date()
        });
        res.json({
            success: true,
            message: 'Пользователь деактивирован'
        });
    }
    catch (error) {
        console.error('Ошибка деактивации пользователя:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});
exports.default = router;
router.post('/profile/avatar', auth_1.authenticateToken, upload.single('avatar'), async (req, res) => {
    try {
        const userId = req.user.userId;
        if (!req.file) {
            res.status(400).json({ error: 'Файл не загружен' });
            return;
        }
        const mime = req.file.mimetype || 'application/octet-stream';
        await (0, connection_1.default)('users')
            .where('id', userId)
            .update({
            avatar_data: req.file.buffer,
            avatar_mime: mime,
            avatar_updated_at: new Date()
        });
        res.json({ success: true });
    }
    catch (error) {
        console.error('Ошибка загрузки аватара:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});
router.get('/:id/avatar', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const user = await (0, connection_1.default)('users')
            .select('avatar_data', 'avatar_mime', 'avatar_updated_at')
            .where('id', id)
            .first();
        if (!user || !user.avatar_data) {
            res.status(404).json({ error: 'Аватар не найден' });
            return;
        }
        res.setHeader('Content-Type', user.avatar_mime || 'application/octet-stream');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.send(user.avatar_data);
    }
    catch (error) {
        console.error('Ошибка получения аватара:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});
router.post('/:id/avatar', auth_1.authenticateToken, upload.single('avatar'), async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            res.status(403).json({ error: 'Недостаточно прав доступа' });
            return;
        }
        const targetUserId = req.params.id;
        if (!req.file) {
            res.status(400).json({ error: 'Файл не загружен' });
            return;
        }
        const mime = req.file.mimetype || 'application/octet-stream';
        await (0, connection_1.default)('users')
            .where('id', targetUserId)
            .update({
            avatar_data: req.file.buffer,
            avatar_mime: mime,
            avatar_updated_at: new Date()
        });
        res.json({ success: true });
    }
    catch (error) {
        console.error('Ошибка загрузки аватара админом:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});
//# sourceMappingURL=users.js.map