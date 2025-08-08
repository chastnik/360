"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const joi_1 = __importDefault(require("joi"));
const crypto_1 = __importDefault(require("crypto"));
const connection_1 = __importDefault(require("../database/connection"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const loginSchema = joi_1.default.object({
    email: joi_1.default.string().email().required().messages({
        'string.email': 'Некорректный email',
        'any.required': 'Email обязателен'
    }),
    password: joi_1.default.string().required().messages({
        'any.required': 'Пароль обязателен'
    })
});
const registerSchema = joi_1.default.object({
    email: joi_1.default.string().email().required().messages({
        'string.email': 'Некорректный email',
        'any.required': 'Email обязателен'
    }),
    first_name: joi_1.default.string().required().messages({
        'any.required': 'Имя обязательно'
    }),
    last_name: joi_1.default.string().required().messages({
        'any.required': 'Фамилия обязательна'
    }),
    role: joi_1.default.string().valid('user', 'admin', 'hr').required().messages({
        'any.only': 'Роль может быть только user, admin или hr',
        'any.required': 'Роль обязательна'
    })
});
const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 8; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
};
router.post('/login', async (req, res) => {
    try {
        const { error } = loginSchema.validate(req.body);
        if (error) {
            res.status(400).json({
                success: false,
                error: error.details?.[0]?.message || 'Ошибка валидации'
            });
            return;
        }
        const { email, password } = req.body;
        const user = await (0, connection_1.default)('users')
            .where({ email: email.toLowerCase(), is_active: true })
            .first();
        if (!user) {
            res.status(401).json({
                success: false,
                error: 'Неверный email или пароль'
            });
            return;
        }
        const isPasswordValid = await bcryptjs_1.default.compare(password, user.password_hash);
        if (!isPasswordValid) {
            res.status(401).json({
                success: false,
                error: 'Неверный email или пароль'
            });
            return;
        }
        const token = jsonwebtoken_1.default.sign({
            userId: user.id,
            email: user.email,
            role: user.role
        }, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                role: user.role
            }
        });
    }
    catch (error) {
        console.error('Ошибка при входе:', error);
        res.status(500).json({
            success: false,
            error: 'Внутренняя ошибка сервера'
        });
    }
});
router.post('/register', async (req, res) => {
    try {
        const { error } = registerSchema.validate(req.body);
        if (error) {
            res.status(400).json({
                success: false,
                error: error.details?.[0]?.message || 'Ошибка валидации'
            });
            return;
        }
        const { email, first_name, last_name, role } = req.body;
        const existingUser = await (0, connection_1.default)('users')
            .where({ email: email.toLowerCase() })
            .first();
        if (existingUser) {
            res.status(400).json({
                success: false,
                error: 'Пользователь с таким email уже существует'
            });
            return;
        }
        const password = generateRandomPassword();
        const saltRounds = 10;
        const password_hash = await bcryptjs_1.default.hash(password, saltRounds);
        const [newUser] = await (0, connection_1.default)('users')
            .insert({
            email: email.toLowerCase(),
            password_hash,
            first_name,
            last_name,
            role,
            is_active: true
        })
            .returning('*');
        res.status(201).json({
            success: true,
            message: 'Пользователь успешно зарегистрирован',
            user: {
                id: newUser.id,
                email: newUser.email,
                first_name: newUser.first_name,
                last_name: newUser.last_name,
                role: newUser.role
            },
            temporary_password: password
        });
    }
    catch (error) {
        console.error('Ошибка при регистрации:', error);
        res.status(500).json({
            success: false,
            error: 'Внутренняя ошибка сервера'
        });
    }
});
router.get('/me', auth_1.authenticateToken, async (req, res) => {
    try {
        const user = await (0, connection_1.default)('users')
            .where({ id: req.user?.userId, is_active: true })
            .first();
        if (!user) {
            res.status(404).json({
                success: false,
                error: 'Пользователь не найден'
            });
            return;
        }
        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                role: user.role
            }
        });
    }
    catch (error) {
        console.error('Ошибка получения пользователя:', error);
        res.status(500).json({
            success: false,
            error: 'Внутренняя ошибка сервера'
        });
    }
});
router.post('/change-password', auth_1.authenticateToken, async (req, res) => {
    try {
        const { current_password, new_password } = req.body;
        if (!current_password || !new_password) {
            res.status(400).json({
                success: false,
                error: 'Текущий пароль и новый пароль обязательны'
            });
            return;
        }
        if (new_password.length < 6) {
            res.status(400).json({
                success: false,
                error: 'Новый пароль должен содержать минимум 6 символов'
            });
            return;
        }
        const user = await (0, connection_1.default)('users')
            .where({ id: req.user?.userId, is_active: true })
            .first();
        if (!user) {
            res.status(404).json({
                success: false,
                error: 'Пользователь не найден'
            });
            return;
        }
        const isCurrentPasswordValid = await bcryptjs_1.default.compare(current_password, user.password_hash);
        if (!isCurrentPasswordValid) {
            res.status(400).json({
                success: false,
                error: 'Неверный текущий пароль'
            });
            return;
        }
        const saltRounds = 10;
        const newPasswordHash = await bcryptjs_1.default.hash(new_password, saltRounds);
        await (0, connection_1.default)('users')
            .where({ id: user.id })
            .update({ password_hash: newPasswordHash });
        res.json({
            success: true,
            message: 'Пароль успешно изменен'
        });
    }
    catch (error) {
        console.error('Ошибка смены пароля:', error);
        res.status(500).json({
            success: false,
            error: 'Внутренняя ошибка сервера'
        });
    }
});
const forgotPasswordSchema = joi_1.default.object({
    email: joi_1.default.string().email().required().messages({
        'string.email': 'Некорректный email',
        'any.required': 'Email обязателен'
    })
});
const resetPasswordSchema = joi_1.default.object({
    token: joi_1.default.string().required().messages({
        'any.required': 'Токен сброса обязателен'
    }),
    password: joi_1.default.string().min(6).required().messages({
        'string.min': 'Пароль должен содержать минимум 6 символов',
        'any.required': 'Новый пароль обязателен'
    })
});
router.post('/forgot-password', async (req, res) => {
    try {
        const { error } = forgotPasswordSchema.validate(req.body);
        if (error) {
            res.status(400).json({
                success: false,
                error: error.details?.[0]?.message || 'Ошибка валидации'
            });
            return;
        }
        const { email } = req.body;
        const user = await (0, connection_1.default)('users')
            .where({ email: email.toLowerCase(), is_active: true })
            .first();
        if (!user) {
            res.json({
                success: true,
                message: 'Если пользователь с таким email существует, на него будет отправлено письмо с инструкциями по сбросу пароля'
            });
            return;
        }
        const resetToken = crypto_1.default.randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + 3600000);
        await (0, connection_1.default)('users')
            .where({ id: user.id })
            .update({
            reset_token: resetToken,
            reset_token_expiry: resetTokenExpiry
        });
        console.log(`Токен сброса пароля для ${email}: ${resetToken}`);
        console.log(`Ссылка для сброса: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`);
        res.json({
            success: true,
            message: 'Если пользователь с таким email существует, на него будет отправлено письмо с инструкциями по сбросу пароля'
        });
    }
    catch (error) {
        console.error('Ошибка запроса сброса пароля:', error);
        res.status(500).json({
            success: false,
            error: 'Внутренняя ошибка сервера'
        });
    }
});
router.post('/reset-password', async (req, res) => {
    try {
        const { error } = resetPasswordSchema.validate(req.body);
        if (error) {
            res.status(400).json({
                success: false,
                error: error.details?.[0]?.message || 'Ошибка валидации'
            });
            return;
        }
        const { token, password } = req.body;
        const user = await (0, connection_1.default)('users')
            .where({
            reset_token: token,
            is_active: true
        })
            .where('reset_token_expiry', '>', new Date())
            .first();
        if (!user) {
            res.status(400).json({
                success: false,
                error: 'Недействительный или просроченный токен сброса'
            });
            return;
        }
        const saltRounds = 10;
        const passwordHash = await bcryptjs_1.default.hash(password, saltRounds);
        await (0, connection_1.default)('users')
            .where({ id: user.id })
            .update({
            password_hash: passwordHash,
            reset_token: null,
            reset_token_expiry: null
        });
        res.json({
            success: true,
            message: 'Пароль успешно сброшен'
        });
    }
    catch (error) {
        console.error('Ошибка сброса пароля:', error);
        res.status(500).json({
            success: false,
            error: 'Внутренняя ошибка сервера'
        });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map