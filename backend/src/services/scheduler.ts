// Автор: Стас Чашин @chastnik
/* eslint-disable no-console */
import { schedule, ScheduledTask } from 'node-cron';
import knex from '../database/connection';
import mattermostService from './mattermost';

class SchedulerService {
  private jobs: Map<string, ScheduledTask> = new Map();

  /**
   * Запустить планировщик задач
   */
  start(): void {
    console.log('🕐 Запуск планировщика задач...');

    // Ежедневные напоминания в 10:00
    const dailyReminders = schedule('0 10 * * *', () => {
      this.sendDailyReminders();
    }, { timezone: 'Europe/Moscow' });

    this.jobs.set('daily-reminders', dailyReminders);
    dailyReminders.start();

    // Проверка завершенных оценок каждый час
    const checkCompletions = schedule('0 * * * *', () => {
      this.checkCompletedAssessments();
    }, { timezone: 'Europe/Moscow' });

    this.jobs.set('check-completions', checkCompletions);
    checkCompletions.start();

    console.log('✅ Планировщик задач запущен');
  }

  /**
   * Остановить планировщик задач
   */
  stop(): void {
    console.log('⏹️ Остановка планировщика задач...');
    
    for (const [name, job] of this.jobs) {
      job.stop();
      job.destroy();
      console.log(`  Остановлена задача: ${name}`);
    }
    
    this.jobs.clear();
    console.log('✅ Планировщик задач остановлен');
  }

  /**
   * Отправка ежедневных напоминаний
   */
  private async sendDailyReminders(): Promise<void> {
    try {
      console.log('📬 Отправка ежедневных напоминаний...');

      // Найти всех респондентов с незавершенными опросами в активных циклах
      const pendingRespondents = await knex('assessment_respondents')
        .join('assessment_participants', 'assessment_respondents.participant_id', 'assessment_participants.id')
        .join('assessment_cycles', 'assessment_participants.cycle_id', 'assessment_cycles.id')
        .join('users as respondent_users', 'assessment_respondents.respondent_user_id', 'respondent_users.id')
        .join('users as participant_users', 'assessment_participants.user_id', 'participant_users.id')
        .where('assessment_cycles.status', 'active')
        .where('assessment_respondents.status', 'pending')
        .whereNotNull('respondent_users.mattermost_username')
        .where('assessment_cycles.end_date', '>', knex.fn.now())
        .select(
          'assessment_respondents.id as respondent_id',
          'respondent_users.mattermost_username as respondent_username',
          'participant_users.first_name as participant_first_name',
          'participant_users.last_name as participant_last_name',
          'assessment_cycles.name as cycle_name',
          'assessment_cycles.end_date'
        );

      let sentCount = 0;
      let failedCount = 0;

      for (const respondent of pendingRespondents) {
        try {
          const participantName = `${respondent.participant_first_name} ${respondent.participant_last_name}`;
          // Можно вычислять оставшееся время до дедлайна при необходимости:
          // const endDate = new Date(respondent.end_date);
          // const daysLeft = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

          const success = await mattermostService.sendAssessmentReminder(
            respondent.respondent_username,
            participantName,
            respondent.cycle_name,
            respondent.respondent_id.toString()
          );

          if (success) {
            sentCount++;
          } else {
            failedCount++;
          }

          // Небольшая задержка между отправками
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          console.error(`Ошибка отправки напоминания ${respondent.respondent_username}:`, error);
          failedCount++;
        }
      }

      console.log(`📬 Напоминания отправлены: ${sentCount} успешно, ${failedCount} неудачно`);
    } catch (error) {
      console.error('Ошибка отправки ежедневных напоминаний:', error);
    }
  }

  /**
   * Проверка завершенных оценок
   */
  private async checkCompletedAssessments(): Promise<void> {
    try {
      console.log('🔍 Проверка завершенных оценок...');

      // Найти участников, у которых все респонденты завершили оценку
      const completedParticipants = await knex.raw(`
        SELECT 
          ap.id as participant_id,
          ap.user_id,
          ac.name as cycle_name,
          u.mattermost_username,
          u.first_name,
          u.last_name
        FROM assessment_participants ap
        JOIN assessment_cycles ac ON ap.cycle_id = ac.id
        JOIN users u ON ap.user_id = u.id
        WHERE ac.status = 'active'
          AND ap.status = 'active'
          AND u.mattermost_username IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM assessment_respondents ar 
            WHERE ar.participant_id = ap.id 
            AND ar.status IN ('pending', 'in_progress')
          )
          AND EXISTS (
            SELECT 1 FROM assessment_respondents ar 
            WHERE ar.participant_id = ap.id 
            AND ar.status = 'completed'
          )
      `);

      let notifiedCount = 0;

      for (const participant of completedParticipants.rows || []) {
        try {
          // Проверить, не отправляли ли уже уведомление
          const alreadyNotified = await knex('assessment_participants')
            .where('id', participant.participant_id)
            .where('completed_notification_sent', true)
            .first();

          if (alreadyNotified) {
            continue;
          }

          // Отправить уведомление о завершении
          const success = await mattermostService.notifyAssessmentComplete(
            participant.mattermost_username,
            participant.cycle_name,
            participant.participant_id.toString()
          );

          if (success) {
            // Отметить, что уведомление отправлено
            await knex('assessment_participants')
              .where('id', participant.participant_id)
              .update({ completed_notification_sent: true });

            notifiedCount++;

            // Также уведомить руководителя, если есть
            const manager = await knex('users')
              .where('id', (
                knex('users').where('id', participant.user_id).select('manager_id')
              ))
              .whereNotNull('mattermost_username')
              .first();

            if (manager) {
              await mattermostService.sendNotification({
                recipientUsername: manager.mattermost_username,
                title: '📊 Оценка сотрудника завершена',
                message: `Оценка сотрудника ${participant.first_name} ${participant.last_name} в рамках цикла "${participant.cycle_name}" завершена. Отчет доступен для просмотра.`,
                actionUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reports/participant/${participant.participant_id}`,
                actionText: 'Просмотреть отчет'
              });
            }
          }
        } catch (error) {
          console.error(`Ошибка уведомления о завершении для ${participant.mattermost_username}:`, error);
        }
      }

      if (notifiedCount > 0) {
        console.log(`📊 Отправлено ${notifiedCount} уведомлений о завершенных оценках`);
      }
    } catch (error) {
      console.error('Ошибка проверки завершенных оценок:', error);
    }
  }

  /**
   * Получить статус планировщика
   */
  getStatus(): { [key: string]: boolean } {
    const status: { [key: string]: boolean } = {};
    
    for (const [name, job] of this.jobs) {
      status[name] = job.getStatus() === 'scheduled';
    }
    
    return status;
  }
}

export default new SchedulerService();
