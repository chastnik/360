"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = require("dotenv");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const auth_1 = __importDefault(require("./routes/auth"));
const users_1 = __importDefault(require("./routes/users"));
const categories_1 = __importDefault(require("./routes/categories"));
const questions_1 = __importDefault(require("./routes/questions"));
const cycles_1 = __importDefault(require("./routes/cycles"));
const assessments_1 = __importDefault(require("./routes/assessments"));
const reports_1 = __importDefault(require("./routes/reports"));
const mattermost_1 = __importDefault(require("./routes/mattermost"));
(0, dotenv_1.config)();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use((0, morgan_1.default)('combined'));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Слишком много запросов с этого IP, попробуйте позже.'
});
app.use('/api/', limiter);
app.use('/api/auth', auth_1.default);
app.use('/api/users', users_1.default);
app.use('/api/categories', categories_1.default);
app.use('/api/questions', questions_1.default);
app.use('/api/cycles', cycles_1.default);
app.use('/api/assessments', assessments_1.default);
app.use('/api/reports', reports_1.default);
app.use('/api/mattermost', mattermost_1.default);
app.get('/health', (_req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});
app.use((err, _req, res, _next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        error: process.env.NODE_ENV === 'production' ? 'Внутренняя ошибка сервера' : err.message
    });
});
app.use('*', (_req, res) => {
    res.status(404).json({ success: false, error: 'Маршрут не найден' });
});
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`📚 API доступен по адресу: http://localhost:${PORT}/api`);
});
exports.default = app;
//# sourceMappingURL=server.js.map