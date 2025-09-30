// © 2025 Бит.Цифра - Стас Чашин

// Автор: Стас Чашин @chastnik
/* eslint-disable no-console */
import axios, { AxiosInstance } from 'axios';
import dotenv from 'dotenv';

dotenv.config();

interface MattermostUser {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  nickname: string;
  position: string;
  roles: string;
  locale: string;
  timezone: {
    useAutomaticTimezone: boolean;
    automaticTimezone: string;
    manualTimezone: string;
  };
}

interface MattermostChannel {
  id: string;
  create_at: number;
  update_at: number;
  delete_at: number;
  team_id: string;
  type: string;
  display_name: string;
  name: string;
  header: string;
  purpose: string;
  last_post_at: number;
  total_msg_count: number;
  extra_update_at: number;
  creator_id: string;
}

interface MattermostPost {
  id: string;
  create_at: number;
  update_at: number;
  edit_at: number;
  delete_at: number;
  is_pinned: boolean;
  user_id: string;
  channel_id: string;
  root_id: string;
  parent_id: string;
  original_id: string;
  message: string;
  type: string;
  props: any;
  hashtags: string;
  pending_post_id: string;
  reply_count: number;
  last_reply_at: number;
  participants: string[];
  metadata: {
    embeds: any[];
    emojis: any[];
    files: any[];
    images: any[];
    reactions: any[];
  };
}

interface MattermostNotification {
  recipientUsername: string;
  title: string;
  message: string;
  actionUrl?: string;
  actionText?: string;
}

class MattermostService {
  private client: AxiosInstance;
  private baseUrl: string;
  private token: string;
  private teamId: string;
  private botUsername: string;

  constructor() {
    this.baseUrl = process.env.MATTERMOST_URL || 'https://mattermost.company.com';
    this.token = process.env.MATTERMOST_TOKEN || '';
    this.teamId = process.env.MATTERMOST_TEAM_ID || '';
    this.botUsername = process.env.MATTERMOST_BOT_USERNAME || '360-assessment-bot';

    this.client = axios.create({
      baseURL: `${this.baseUrl}/api/v4`,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
  }

  /**
   * Проверка подключения к Mattermost
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.client.get('/users/me');
      return true;
    } catch (error) {
      console.error('Ошибка подключения к Mattermost:', error);
      return false;
    }
  }

  /**
   * Получить пользователя по username
   */
  async getUserByUsername(username: string): Promise<MattermostUser | null> {
    try {
      const response = await this.client.get(`/users/username/${username}`);
      return response.data;
    } catch (error) {
      console.error(`Ошибка получения пользователя ${username}:`, error);
      return null;
    }
  }

  /**
   * Получить пользователя по email
   */
  async getUserByEmail(email: string): Promise<MattermostUser | null> {
    try {
      const response = await this.client.get(`/users/email/${email}`);
      return response.data;
    } catch (error) {
      console.error(`Ошибка получения пользователя ${email}:`, error);
      return null;
    }
  }

  /**
   * Получить пользователя по ID
   */
  async getUserById(userId: string): Promise<MattermostUser | null> {
    try {
      const response = await this.client.get(`/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error(`Ошибка получения пользователя ${userId}:`, error);
      return null;
    }
  }

  /**
   * Получить всех пользователей команды
   */
  async getTeamUsers(): Promise<MattermostUser[]> {
    try {
      const response = await this.client.get(`/teams/${this.teamId}/members`);
      const members = response.data;
      
      const users = await Promise.all(
        members.map(async (member: any) => {
          const userResponse = await this.client.get(`/users/${member.user_id}`);
          return userResponse.data;
        })
      );
      
      return users;
    } catch (error) {
      console.error('Ошибка получения пользователей команды:', error);
      return [];
    }
  }

  /**
   * Получить всех активных пользователей (не только членов команды)
   */
  async getAllUsers(): Promise<MattermostUser[]> {
    try {
      const users: MattermostUser[] = [];
      let page = 0;
      const perPage = 100;
      let pageUsers: MattermostUser[] = [];

      do {
        const response = await this.client.get(`/users?page=${page}&per_page=${perPage}&active=true`);
        pageUsers = response.data as MattermostUser[];
        if (Array.isArray(pageUsers) && pageUsers.length > 0) {
          users.push(...pageUsers);
        }
        page++;
      } while (Array.isArray(pageUsers) && pageUsers.length === perPage);
      
      return users;
    } catch (error) {
      console.error('Ошибка получения всех пользователей:', error);
      return [];
    }
  }

  /**
   * Создать прямой канал с пользователем
   */
  async createDirectChannel(userId: string): Promise<MattermostChannel | null> {
    try {
      const response = await this.client.post('/channels/direct', [
        userId,
        await this.getBotUserId()
      ]);
      return response.data;
    } catch (error) {
      console.error('Ошибка создания прямого канала:', error);
      return null;
    }
  }

  /**
   * Получить ID бота
   */
  private async getBotUserId(): Promise<string> {
    const botUser = await this.getUserByUsername(this.botUsername);
    return botUser?.id || '';
  }

  /**
   * Отправить сообщение в канал
   */
  async sendMessage(channelId: string, message: string, props: any = {}): Promise<MattermostPost | null> {
    try {
      const response = await this.client.post('/posts', {
        channel_id: channelId,
        message: message,
        props: props
      });
      return response.data;
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error);
      return null;
    }
  }

  /**
   * Отправить уведомление пользователю
   */
  async sendNotification(notification: MattermostNotification): Promise<boolean> {
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
    } catch (error) {
      console.error('Ошибка отправки уведомления:', error);
      return false;
    }
  }

  /**
   * Отправить уведомление о начале цикла оценки
   */
  async notifyAssessmentCycleStart(participantUsername: string, cycleTitle: string): Promise<boolean> {
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

  /**
   * Отправить уведомление респонденту о необходимости оценки
   */
  async notifyRespondentAssessment(
    respondentUsername: string, 
    participantName: string, 
    cycleTitle: string, 
    respondentId: string
  ): Promise<boolean> {
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

  /**
   * Отправить напоминание о незавершенном опросе
   */
  async sendAssessmentReminder(
    respondentUsername: string, 
    participantName: string, 
    cycleTitle: string, 
    respondentId: string
  ): Promise<boolean> {
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

  /**
   * Отправить уведомление о завершении всех оценок
   */
  async notifyAssessmentComplete(
    participantUsername: string, 
    cycleTitle: string, 
    participantId: string
  ): Promise<boolean> {
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

  /**
   * Отправить уведомление администратору о завершении цикла
   */
  async notifyCycleComplete(adminUsername: string, cycleTitle: string, cycleId: string): Promise<boolean> {
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

  /**
   * Массовая отправка уведомлений
   */
  async sendBulkNotifications(notifications: MattermostNotification[]): Promise<{success: number, failed: number}> {
    let success = 0;
    let failed = 0;

    for (const notification of notifications) {
      try {
        const result = await this.sendNotification(notification);
        if (result) {
          success++;
        } else {
          failed++;
        }
        // Небольшая задержка между уведомлениями
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        failed++;
        console.error('Ошибка отправки уведомления:', error);
      }
    }

    return { success, failed };
  }

  /**
   * Отправить запрос на выбор респондентов участнику цикла
   */
  async requestRespondentSelection(
    participantUsername: string,
    cycleTitle: string,
    participantId: string,
    minRespondents: number = 4
  ): Promise<boolean> {
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

  /**
   * Поиск пользователей по различным критериям
   */
  async searchUsers(query: string): Promise<MattermostUser[]> {
    try {
      const results: MattermostUser[] = [];
      
      // Поиск по username (если начинается с @)
      if (query.startsWith('@')) {
        const username = query.substring(1);
        const user = await this.getUserByUsername(username);
        if (user) results.push(user);
      }
      
      // Поиск по email (если содержит @)
      if (query.includes('@') && !query.startsWith('@')) {
        const user = await this.getUserByEmail(query);
        if (user) results.push(user);
      }
      
      // Поиск по имени через API поиска
      const searchResponse = await this.client.post('/users/search', {
        term: query,
        allow_inactive: false
      });
      
      if (searchResponse.data && Array.isArray(searchResponse.data)) {
        results.push(...searchResponse.data);
      }
      
      // Удалить дубликаты
      const uniqueResults = results.filter((user, index, self) => 
        index === self.findIndex(u => u.id === user.id)
      );
      
      return uniqueResults;
    } catch (error) {
      console.error('Ошибка поиска пользователей:', error);
      return [];
    }
  }

  /**
   * Отправить подтверждение найденного респондента
   */
  async confirmRespondent(
    participantUsername: string,
    foundUser: MattermostUser,
    participantId: string,
    query: string
  ): Promise<boolean> {
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

  /**
   * Проверить возможность создания прямого канала с пользователем
   */
  async testDirectChannelCreation(username: string): Promise<boolean> {
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
    } catch (error) {
      console.error(`❌ Ошибка создания канала с ${username}:`, error);
      return false;
    }
  }
}

export default new MattermostService();
export { MattermostUser, MattermostChannel, MattermostPost, MattermostNotification }; 