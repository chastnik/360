"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireManagerOrAdmin = exports.requireAdmin = exports.requireRole = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const connection_1 = __importDefault(require("../database/connection"));
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) {
            res.status(401).json({
                success: false,
                error: 'Токен доступа не предоставлен'
            });
            return;
        }
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            res.status(500).json({
                success: false,
                error: 'JWT секрет не настроен'
            });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        const user = await (0, connection_1.default)('users')
            .where({ id: decoded.userId, is_active: true })
            .first();
        if (!user) {
            res.status(401).json({
                success: false,
                error: 'Пользователь не найден или деактивирован'
            });
            return;
        }
        req.user = decoded;
        next();
    }
    catch (error) {
        console.error('JWT verification error:', error);
        res.status(403).json({
            success: false,
            error: 'Недействительный токен'
        });
    }
};
exports.authenticateToken = authenticateToken;
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: 'Пользователь не авторизован'
            });
            return;
        }
        if (!roles.includes(req.user.role)) {
            res.status(403).json({
                success: false,
                error: 'Недостаточно прав доступа'
            });
            return;
        }
        next();
    };
};
exports.requireRole = requireRole;
exports.requireAdmin = (0, exports.requireRole)(['admin']);
exports.requireManagerOrAdmin = (0, exports.requireRole)(['manager', 'admin']);
//# sourceMappingURL=auth.js.map