import axios from 'axios'

export interface MattermostMessage {
  text: string
  channel?: string
  username?: string
  icon_url?: string
  attachments?: MattermostAttachment[]
}

export interface MattermostAttachment {
  fallback: string
  color: string
  title: string
  text: string
  fields?: MattermostField[]
  actions?: MattermostAction[]
}

export interface MattermostField {
  title: string
  value: string
  short: boolean
}

export interface MattermostAction {
  name: string
  integration: {
    url: string
    context: {
      action: string
      [key: string]: any
    }
  }
  style?: 'default' | 'primary' | 'success' | 'good' | 'warning' | 'danger'
  type: 'button'
}

class MattermostService {
  private webhookUrl: string
  private botToken: string
  private baseUrl: string

  constructor() {
    this.webhookUrl = process.env.MATTERMOST_WEBHOOK_URL || ''
    this.botToken = process.env.MATTERMOST_TOKEN || ''
    this.baseUrl = process.env.MATTERMOST_URL || ''
  }

  /**
   * Отправка сообщения через webhook
   */
  async sendMessage(message: MattermostMessage): Promise<void> {
    if (!this.webhookUrl) {
      console.warn('Mattermost webhook URL не настроен')
      return
    }

    try {
      await axios.post(this.webhookUrl, {
        ...message,
        username: message.username || '360° Feedback Bot',
        icon_url: message.icon_url || '🔄',
      })
    } catch (error) {
      console.error('Ошибка отправки сообщения в Mattermost:', error)
      throw error
    }
  }

  /**
   * Отправка уведомления о начале цикла оценки
   */
  async sendCycleStartNotification(
    userEmail: string,
    cycleName: string,
    endDate: Date,
    reviewersCount: number
  ): Promise<void> {
    const message: MattermostMessage = {
      text: `🎯 **Новый цикл 360° оценки**`,
      channel: `@${userEmail}`,
      attachments: [
        {
          fallback: `Начат новый цикл 360° оценки: ${cycleName}`,
          color: '#0073e6',
          title: cycleName,
          text: `Вас приглашают принять участие в цикле 360° оценки.\n\n` +
                `📅 **Срок окончания:** ${endDate.toLocaleDateString('ru-RU')}\n` +
                `👥 **Количество оценивающих:** ${reviewersCount}`,
          fields: [
            {
              title: 'Что нужно сделать?',
              value: '1. Выберите коллег для оценки (минимум 5 человек)\n' +
                     '2. Заполните самооценку\n' +
                     '3. Дождитесь завершения оценки от коллег',
              short: false
            }
          ],
          actions: [
            {
              name: 'Перейти к оценке',
              type: 'button',
              style: 'primary',
              integration: {
                url: `${process.env.NEXTAUTH_URL}/api/mattermost/actions`,
                context: {
                  action: 'open_feedback',
                  cycle_name: cycleName
                }
              }
            }
          ]
        }
      ]
    }

    await this.sendMessage(message)
  }

  /**
   * Отправка напоминания о необходимости дать оценку
   */
  async sendReminderNotification(
    userEmail: string,
    subjectName: string,
    cycleName: string,
    daysLeft: number
  ): Promise<void> {
    const urgencyColor = daysLeft <= 1 ? '#ff4444' : daysLeft <= 3 ? '#ff9900' : '#ffaa00'
    const urgencyEmoji = daysLeft <= 1 ? '🚨' : daysLeft <= 3 ? '⚠️' : '⏰'

    const message: MattermostMessage = {
      text: `${urgencyEmoji} **Напоминание о 360° оценке**`,
      channel: `@${userEmail}`,
      attachments: [
        {
          fallback: `Напоминание: завершите оценку для ${subjectName}`,
          color: urgencyColor,
          title: `Оценка для: ${subjectName}`,
          text: `Пожалуйста, завершите оценку в рамках цикла "${cycleName}"\n\n` +
                `⏱️ **Осталось дней:** ${daysLeft}`,
          actions: [
            {
              name: 'Заполнить оценку',
              type: 'button',
              style: daysLeft <= 1 ? 'danger' : 'primary',
              integration: {
                url: `${process.env.NEXTAUTH_URL}/api/mattermost/actions`,
                context: {
                  action: 'complete_feedback',
                  cycle_name: cycleName,
                  subject_name: subjectName
                }
              }
            }
          ]
        }
      ]
    }

    await this.sendMessage(message)
  }

  /**
   * Отправка уведомления о завершении цикла оценки
   */
  async sendCycleCompletedNotification(
    userEmail: string,
    cycleName: string,
    completionRate: number
  ): Promise<void> {
    const message: MattermostMessage = {
      text: `✅ **Цикл 360° оценки завершен**`,
      channel: `@${userEmail}`,
      attachments: [
        {
          fallback: `Завершен цикл 360° оценки: ${cycleName}`,
          color: '#00aa00',
          title: cycleName,
          text: `Ваш цикл 360° оценки успешно завершен!\n\n` +
                `📊 **Процент завершения:** ${Math.round(completionRate)}%\n` +
                `📋 Результаты доступны для просмотра`,
          actions: [
            {
              name: 'Посмотреть результаты',
              type: 'button',
              style: 'success',
              integration: {
                url: `${process.env.NEXTAUTH_URL}/api/mattermost/actions`,
                context: {
                  action: 'view_results',
                  cycle_name: cycleName
                }
              }
            }
          ]
        }
      ]
    }

    await this.sendMessage(message)
  }

  /**
   * Отправка запроса на номинацию оценивающих
   */
  async sendNominationRequest(
    userEmail: string,
    subjectName: string,
    cycleName: string,
    minReviewers: number = 5
  ): Promise<void> {
    const message: MattermostMessage = {
      text: `👥 **Требуется выбор оценивающих**`,
      channel: `@${userEmail}`,
      attachments: [
        {
          fallback: `Выберите оценивающих для ${subjectName}`,
          color: '#0073e6',
          title: `Выбор оценивающих для: ${subjectName}`,
          text: `Для проведения 360° оценки в рамках цикла "${cycleName}" необходимо выбрать коллег, которые будут проводить оценку.\n\n` +
                `👥 **Минимум требуется:** ${minReviewers} человек\n` +
                `🎯 **Рекомендуется выбирать:** коллег, которые хорошо знают работу оцениваемого`,
          fields: [
            {
              title: 'Кого стоит выбрать?',
              value: '• Непосредственного руководителя\n' +
                     '• Коллег из команды\n' +
                     '• Подчиненных (если есть)\n' +
                     '• Коллег из других отделов\n' +
                     '• Внутренних клиентов',
              short: false
            }
          ],
          actions: [
            {
              name: 'Выбрать оценивающих',
              type: 'button',
              style: 'primary',
              integration: {
                url: `${process.env.NEXTAUTH_URL}/api/mattermost/actions`,
                context: {
                  action: 'nominate_reviewers',
                  cycle_name: cycleName,
                  subject_name: subjectName
                }
              }
            }
          ]
        }
      ]
    }

    await this.sendMessage(message)
  }

  /**
   * Отправка сводки по статусу всех циклов (для администраторов)
   */
  async sendAdminStatusSummary(
    adminEmail: string,
    activeCycles: number,
    pendingReviews: number,
    completedToday: number
  ): Promise<void> {
    const message: MattermostMessage = {
      text: `📊 **Ежедневная сводка 360° оценки**`,
      channel: `@${adminEmail}`,
      attachments: [
        {
          fallback: 'Сводка по 360° оценкам',
          color: '#0073e6',
          title: 'Статус системы 360° оценки',
          fields: [
            {
              title: 'Активные циклы',
              value: activeCycles.toString(),
              short: true
            },
            {
              title: 'Ожидающие оценки',
              value: pendingReviews.toString(),
              short: true
            },
            {
              title: 'Завершено сегодня',
              value: completedToday.toString(),
              short: true
            }
          ],
          actions: [
            {
              name: 'Открыть панель управления',
              type: 'button',
              style: 'primary',
              integration: {
                url: `${process.env.NEXTAUTH_URL}/api/mattermost/actions`,
                context: {
                  action: 'open_admin_dashboard'
                }
              }
            }
          ]
        }
      ]
    }

    await this.sendMessage(message)
  }

  /**
   * Получение информации о пользователе из Mattermost по email
   */
  async getUserByEmail(email: string): Promise<any> {
    if (!this.botToken || !this.baseUrl) {
      throw new Error('Mattermost API не настроен')
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}/api/v4/users/email/${email}`,
        {
          headers: {
            'Authorization': `Bearer ${this.botToken}`,
            'Content-Type': 'application/json'
          }
        }
      )
      return response.data
    } catch (error) {
      console.error('Ошибка получения пользователя из Mattermost:', error)
      throw error
    }
  }
}

export const mattermostService = new MattermostService() 