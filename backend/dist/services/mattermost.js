"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
class MattermostService {
    constructor() {
        this.baseUrl = process.env.MATTERMOST_URL || 'https://mattermost.company.com';
        this.token = process.env.MATTERMOST_TOKEN || '';
        this.teamId = process.env.MATTERMOST_TEAM_ID || '';
        this.botUsername = process.env.MATTERMOST_BOT_USERNAME || '360-assessment-bot';
        this.client = axios_1.default.create({
            baseURL: `${this.baseUrl}/api/v4`,
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });
    }
    async testConnection() {
        try {
            await this.client.get('/users/me');
            return true;
        }
        catch (error) {
            console.error('Ошибка подключения к Mattermost:', error);
            return false;
        }
    }
    async getUserByUsername(username) {
        try {
            const response = await this.client.get(`/users/username/${username}`);
            return response.data;
        }
        catch (error) {
            console.error(`Ошибка получения пользователя ${username}:`, error);
            return null;
        }
    }
    async getUserByEmail(email) {
        try {
            const response = await this.client.get(`/users/email/${email}`);
            return response.data;
        }
        catch (error) {
            console.error(`Ошибка получения пользователя ${email}:`, error);
            return null;
        }
    }
    async getTeamUsers() {
        try {
            const response = await this.client.get(`/teams/${this.teamId}/members`);
            const members = response.data;
            const users = await Promise.all(members.map(async (member) => {
                const userResponse = await this.client.get(`/users/${member.user_id}`);
                return userResponse.data;
            }));
            return users;
        }
        catch (error) {
            console.error('Ошибка получения пользователей команды:', error);
            return [];
        }
    }
    async createDirectChannel(userId) {
        try {
            const response = await this.client.post('/channels/direct', [
                userId,
                await this.getBotUserId()
            ]);
            return response.data;
        }
        catch (error) {
            console.error('Ошибка создания прямого канала:', error);
            return null;
        }
    }
    async getBotUserId() {
        const botUser = await this.getUserByUsername(this.botUsername);
        return botUser?.id || '';
    }
    async sendMessage(channelId, message, props = {}) {
        try {
            const response = await this.client.post('/posts', {
                channel_id: channelId,
                message: message,
                props: props
            });
            return response.data;
        }
        catch (error) {
            console.error('Ошибка отправки сообщения:', error);
            return null;
        }
    }
    async sendNotification(notification) {
        try {
            const user = await this.getUserByUsername(notification.recipientUsername);
            if (!user) {
                console.error(`Пользователь ${notification.recipientUsername} не найден`);
                return false;
            }
            const channel = await this.createDirectChannel(user.id);
            if (!channel) {
                console.error(`Не удалось создать канал с пользователем ${notification.recipientUsername}`);
                return false;
            }
            let message = `**${notification.title}**\n\n${notification.message}`;
            if (notification.actionUrl && notification.actionText) {
                message += `\n\n[${notification.actionText}](${notification.actionUrl})`;
            }
            const post = await this.sendMessage(channel.id, message);
            return post !== null;
        }
        catch (error) {
            console.error('Ошибка отправки уведомления:', error);
            return false;
        }
    }
    async notifyAssessmentCycleStart(participantUsername, cycleTitle) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const actionUrl = `${frontendUrl}/assessments`;
        return this.sendNotification({
            recipientUsername: participantUsername,
            title: '🎯 Запущен новый цикл оценки',
            message: `Цикл оценки "${cycleTitle}" был запущен. Вы можете просмотреть доступные вам опросы и приступить к оценке.`,
            actionUrl: actionUrl,
            actionText: 'Перейти к опросам'
        });
    }
    async notifyRespondentAssessment(respondentUsername, participantName, cycleTitle, respondentId) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const actionUrl = `${frontendUrl}/survey/${respondentId}`;
        return this.sendNotification({
            recipientUsername: respondentUsername,
            title: '📝 Требуется ваша оценка',
            message: `Вас попросили оценить ${participantName} в рамках цикла "${cycleTitle}". Пожалуйста, пройдите опрос.`,
            actionUrl: actionUrl,
            actionText: 'Пройти опрос'
        });
    }
    async sendAssessmentReminder(respondentUsername, participantName, cycleTitle, respondentId) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const actionUrl = `${frontendUrl}/survey/${respondentId}`;
        return this.sendNotification({
            recipientUsername: respondentUsername,
            title: '⏰ Напоминание об опросе',
            message: `Не забудьте завершить оценку ${participantName} в рамках цикла "${cycleTitle}".`,
            actionUrl: actionUrl,
            actionText: 'Завершить опрос'
        });
    }
    async notifyAssessmentComplete(participantUsername, cycleTitle, participantId) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const actionUrl = `${frontendUrl}/reports/participant/${participantId}`;
        return this.sendNotification({
            recipientUsername: participantUsername,
            title: '✅ Ваша оценка завершена',
            message: `Все респонденты завершили вашу оценку в рамках цикла "${cycleTitle}". Отчет готов к просмотру.`,
            actionUrl: actionUrl,
            actionText: 'Просмотреть отчет'
        });
    }
    async notifyCycleComplete(adminUsername, cycleTitle, cycleId) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const actionUrl = `${frontendUrl}/reports/cycle/${cycleId}`;
        return this.sendNotification({
            recipientUsername: adminUsername,
            title: '🎉 Цикл оценки завершен',
            message: `Цикл оценки "${cycleTitle}" был успешно завершен. Все участники получили свои отчеты.`,
            actionUrl: actionUrl,
            actionText: 'Просмотреть аналитику'
        });
    }
    async sendBulkNotifications(notifications) {
        let success = 0;
        let failed = 0;
        for (const notification of notifications) {
            try {
                const result = await this.sendNotification(notification);
                if (result) {
                    success++;
                }
                else {
                    failed++;
                }
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            catch (error) {
                failed++;
                console.error('Ошибка отправки уведомления:', error);
            }
        }
        return { success, failed };
    }
}
exports.default = new MattermostService();
//# sourceMappingURL=mattermost.js.map