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
}

export default new MattermostService();
export { MattermostUser, MattermostChannel, MattermostPost, MattermostNotification }; 