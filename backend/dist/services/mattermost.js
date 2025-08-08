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
    async getUserById(userId) {
        try {
            const response = await this.client.get(`/users/${userId}`);
            return response.data;
        }
        catch (error) {
            console.error(`Ошибка получения пользователя ${userId}:`, error);
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
    async getAllUsers() {
        try {
            const users = [];
            let page = 0;
            const perPage = 100;
            let pageUsers = [];
            do {
                const response = await this.client.get(`/users?page=${page}&per_page=${perPage}&active=true`);
                pageUsers = response.data;
                if (Array.isArray(pageUsers) && pageUsers.length > 0) {
                    users.push(...pageUsers);
                }
                page++;
            } while (Array.isArray(pageUsers) && pageUsers.length === perPage);
            return users;
        }
        catch (error) {
            console.error('Ошибка получения всех пользователей:', error);
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
    async requestRespondentSelection(participantUsername, cycleTitle, participantId, minRespondents = 4) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const actionUrl = `${frontendUrl}/assessments/select-respondents/${participantId}`;
        return this.sendNotification({
            recipientUsername: participantUsername,
            title: '👥 Необходимо выбрать респондентов',
            message: `Для участия в цикле оценки "${cycleTitle}" вам необходимо выбрать минимум ${minRespondents} респондентов, которые смогут дать вам оценку.\n\nВы можете указать респондентов по:\n• Email адресу\n• Имени в Mattermost (@username)\n• Полному имени\n\nБот поможет найти и подтвердить каждого респондента.`,
            actionUrl: actionUrl,
            actionText: 'Выбрать респондентов'
        });
    }
    async searchUsers(query) {
        try {
            const results = [];
            if (query.startsWith('@')) {
                const username = query.substring(1);
                const user = await this.getUserByUsername(username);
                if (user)
                    results.push(user);
            }
            if (query.includes('@') && !query.startsWith('@')) {
                const user = await this.getUserByEmail(query);
                if (user)
                    results.push(user);
            }
            const searchResponse = await this.client.post('/users/search', {
                term: query,
                allow_inactive: false
            });
            if (searchResponse.data && Array.isArray(searchResponse.data)) {
                results.push(...searchResponse.data);
            }
            const uniqueResults = results.filter((user, index, self) => index === self.findIndex(u => u.id === user.id));
            return uniqueResults;
        }
        catch (error) {
            console.error('Ошибка поиска пользователей:', error);
            return [];
        }
    }
    async confirmRespondent(participantUsername, foundUser, participantId, query) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const confirmUrl = `${frontendUrl}/api/assessments/confirm-respondent/${participantId}/${foundUser.id}`;
        return this.sendNotification({
            recipientUsername: participantUsername,
            title: '✅ Найден пользователь',
            message: `По запросу "${query}" найден пользователь:\n\n**${foundUser.first_name} ${foundUser.last_name}**\n@${foundUser.username}\n${foundUser.email}\n${foundUser.position || 'Должность не указана'}\n\nЭто тот человек, которого вы хотели добавить в качестве респондента?`,
            actionUrl: confirmUrl,
            actionText: 'Да, добавить'
        });
    }
    async testDirectChannelCreation(username) {
        try {
            const user = await this.getUserByUsername(username);
            if (!user) {
                console.log(`❌ Пользователь ${username} не найден`);
                return false;
            }
            const channel = await this.createDirectChannel(user.id);
            if (!channel) {
                console.log(`❌ Не удалось создать канал с ${username}`);
                return false;
            }
            console.log(`✅ Прямой канал с ${username} создан успешно`);
            return true;
        }
        catch (error) {
            console.error(`❌ Ошибка создания канала с ${username}:`, error);
            return false;
        }
    }
}
exports.default = new MattermostService();
//# sourceMappingURL=mattermost.js.map