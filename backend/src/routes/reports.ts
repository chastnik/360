// Автор: Стас Чашин @chastnik
/* eslint-disable no-console */
import { Router } from 'express';
import knex from '../database/connection';
import { authenticateToken } from '../middleware/auth';
import { generateEmployeeRecommendations } from '../services/llm';

const router = Router();

// Список сохраненных отчетов
router.get('/saved', authenticateToken, async (_req: any, res: any): Promise<void> => {
  try {
    const reports = await knex('assessment_reports')
      .join('assessment_participants', 'assessment_reports.participant_id', 'assessment_participants.id')
      .join('users', 'assessment_participants.user_id', 'users.id')
      .join('assessment_cycles', 'assessment_participants.cycle_id', 'assessment_cycles.id')
      .select(
        'assessment_reports.id',
        'assessment_reports.created_at',
        'assessment_reports.updated_at',
        'assessment_cycles.id as cycle_id',
        'assessment_cycles.name as cycle_name',
        knex.raw("concat(users.first_name, ' ', users.last_name) as participant_name")
      )
      .orderBy('assessment_reports.created_at', 'desc');

    res.json({ success: true, data: reports });
  } catch (error) {
    console.error('Ошибка получения сохраненных отчетов:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// AI рекомендации по сотруднику в рамках цикла: кэшируем в assessment_reports.recommendations
router.post('/user/:userId/recommendations', authenticateToken, async (req: any, res: any): Promise<void> => {
  try {
    const { userId } = req.params;
    const { cycleId } = req.body as { cycleId?: string };

    // Находим participant
    let participantQuery = knex('assessment_participants')
      .where('assessment_participants.user_id', userId)
      .join('users', 'assessment_participants.user_id', 'users.id')
      .join('assessment_cycles', 'assessment_participants.cycle_id', 'assessment_cycles.id')
      .select(
        'assessment_participants.id as participant_id',
        'users.first_name', 'users.last_name',
        'assessment_cycles.id as cycle_id', 'assessment_cycles.name as cycle_name'
      )
      .orderBy('assessment_participants.created_at', 'desc');

    if (cycleId) participantQuery = participantQuery.where('assessment_participants.cycle_id', cycleId);

    const participant = await participantQuery.first();
    if (!participant) {
      res.status(404).json({ error: 'Участник не найден' });
      return;
    }

    // POST-запрос всегда генерирует новые рекомендации (для перегенерации)
    console.log('🔄 Принудительная генерация новых рекомендаций для участника:', participant.participant_id);

    // Сбор данных: категории, общий средний, ответы (баллы + комментарии)
    const avgScores = await knex('assessment_responses')
      .join('assessment_respondents', 'assessment_responses.respondent_id', 'assessment_respondents.id')
      .join('questions', 'assessment_responses.question_id', 'questions.id')
      .join('categories', 'questions.category_id', 'categories.id')
      .select('categories.name as category_name')
      .avg('assessment_responses.rating_value as avg_score')
      .where('assessment_respondents.participant_id', participant.participant_id)
      .groupBy('categories.id', 'categories.name')
      .orderBy('categories.name');

    const overallAverage = avgScores.length > 0
      ? Math.round((avgScores.reduce((s, a) => s + Number(a.avg_score || 0), 0) / avgScores.length) * 100) / 100
      : 0;

    const responses = await knex('assessment_responses')
      .join('assessment_respondents', 'assessment_responses.respondent_id', 'assessment_respondents.id')
      .join('questions', 'assessment_responses.question_id', 'questions.id')
      .join('categories', 'questions.category_id', 'categories.id')
      .select(
        'categories.name as category_name',
        'questions.question_text as question_text',
        'assessment_responses.rating_value as score',
        'assessment_responses.comment as comment'
      )
      .where('assessment_respondents.participant_id', participant.participant_id)
      .orderBy('categories.name');

    const llmText = await generateEmployeeRecommendations({
      employeeFullName: `${participant.first_name} ${participant.last_name}`.trim(),
      cycleName: participant.cycle_name,
      overallAverage,
      categories: avgScores.map((r: any) => ({ category: r.category_name, avgScore: Math.round(Number(r.avg_score || 0) * 100) / 100 })),
      responses: responses.map((r: any) => ({ category: r.category_name, question: r.question_text, score: Number(r.score || 0), comment: r.comment }))
    });

    // Сохраняем/обновляем в assessment_reports.recommendations
    const existingReport = await knex('assessment_reports')
      .where('participant_id', participant.participant_id)
      .first();

    if (existingReport) {
      await knex('assessment_reports')
        .where('id', existingReport.id)
        .update({ 
          recommendations: llmText, 
          updated_at: knex.fn.now() 
        });
      console.log('✅ Рекомендации обновлены в БД');
    } else {
      await knex('assessment_reports').insert({
        participant_id: participant.participant_id,
        recommendations: llmText,
        status: 'completed',
        generated_at: knex.fn.now()
      });
      console.log('✅ Рекомендации сохранены в БД');
    }

    res.json({ participantId: participant.participant_id, cycleId: participant.cycle_id, recommendations: llmText });
  } catch (error: any) {
    console.error('Ошибка генерации рекомендаций:', error?.message || error);
    res.status(500).json({ error: 'Не удалось сгенерировать рекомендации' });
  }
});

// Аналитика по одному сотруднику (по последнему или указанному циклу)
// ДОЛЖЕН идти ДО маршрута "/:id"
router.get('/user/:userId/analytics', authenticateToken, async (req: any, res: any): Promise<void> => {
  try {
    const { userId } = req.params;
    const { cycleId } = req.query as { cycleId?: string };

    // Находим участника (participant) для пользователя: по cycleId или предпочитаем последний завершённый цикл
    let participant: any = null;
    if (cycleId) {
      participant = await knex('assessment_participants')
        .where('assessment_participants.user_id', userId)
        .andWhere('assessment_participants.cycle_id', cycleId)
        .join('assessment_cycles', 'assessment_participants.cycle_id', 'assessment_cycles.id')
        .select(
          'assessment_participants.id as participant_id',
          'assessment_participants.cycle_id',
          'assessment_cycles.name as cycle_name',
          'assessment_cycles.start_date as cycle_start',
          'assessment_cycles.end_date as cycle_end'
        )
        .first();
    } else {
      // Пытаемся найти последний завершённый цикл
      participant = await knex('assessment_participants')
        .where('assessment_participants.user_id', userId)
        .join('assessment_cycles', 'assessment_participants.cycle_id', 'assessment_cycles.id')
        .where('assessment_cycles.status', 'completed')
        .select(
          'assessment_participants.id as participant_id',
          'assessment_participants.cycle_id',
          'assessment_cycles.name as cycle_name',
          'assessment_cycles.start_date as cycle_start',
          'assessment_cycles.end_date as cycle_end'
        )
        .orderBy([{ column: 'assessment_cycles.end_date', order: 'desc' }, { column: 'assessment_participants.created_at', order: 'desc' }])
        .first();

      // Если завершённых нет — берём самый свежий любой
      if (!participant) {
        participant = await knex('assessment_participants')
          .where('assessment_participants.user_id', userId)
          .join('assessment_cycles', 'assessment_participants.cycle_id', 'assessment_cycles.id')
          .select(
            'assessment_participants.id as participant_id',
            'assessment_participants.cycle_id',
            'assessment_cycles.name as cycle_name',
            'assessment_cycles.start_date as cycle_start',
            'assessment_cycles.end_date as cycle_end'
          )
          .orderBy('assessment_participants.created_at', 'desc')
          .first();
      }
    }
    if (!participant) {
      res.json({
        overallAverage: 0,
        avgScores: [],
        scoreDistribution: [],
        responses: [],
        cycle: null,
      });
      return;
    }

    // Все ответы для участника
    const responses = await knex('assessment_responses')
      .join('assessment_respondents', 'assessment_responses.respondent_id', 'assessment_respondents.id')
      .join('users as respondent_users', 'assessment_respondents.respondent_user_id', 'respondent_users.id')
      .join('questions', 'assessment_responses.question_id', 'questions.id')
      .join('categories', 'questions.category_id', 'categories.id')
      .select(
        'assessment_responses.rating_value as score',
        'assessment_responses.text_response as text',
        'assessment_responses.boolean_response as bool',
        'assessment_responses.comment',
        'questions.question_text',
        'questions.question_type as question_type',
        'categories.name as category_name',
        'categories.color as category_color',
        'respondent_users.first_name as respondent_first_name',
        'respondent_users.last_name as respondent_last_name',
        'assessment_respondents.respondent_type'
      )
      .where('assessment_respondents.participant_id', participant.participant_id);

    // Средние по категориям
    const avgScores = await knex('assessment_responses')
      .join('assessment_respondents', 'assessment_responses.respondent_id', 'assessment_respondents.id')
      .join('questions', 'assessment_responses.question_id', 'questions.id')
      .join('categories', 'questions.category_id', 'categories.id')
      .select('categories.name as category_name', 'categories.color as category_color')
      .avg('assessment_responses.rating_value as avg_score')
      .where('assessment_respondents.participant_id', participant.participant_id)
      .groupBy('categories.id', 'categories.name', 'categories.color')
      .orderBy('categories.name');

    const overallAverage = avgScores.length > 0
      ? Math.round((avgScores.reduce((s, a) => s + Number(a.avg_score || 0), 0) / avgScores.length) * 100) / 100
      : 0;

    const scoreDistribution = await knex('assessment_responses')
      .join('assessment_respondents', 'assessment_responses.respondent_id', 'assessment_respondents.id')
      .select('assessment_responses.rating_value as score')
      .count('assessment_responses.rating_value as count')
      .where('assessment_respondents.participant_id', participant.participant_id)
      .groupBy('assessment_responses.rating_value')
      .orderBy('assessment_responses.rating_value');

    res.json({
      cycle: { id: participant.cycle_id, name: participant.cycle_name, start_date: participant.cycle_start, end_date: participant.cycle_end },
      overallAverage,
      avgScores: avgScores.map(r => ({ category: r.category_name, color: r.category_color, avgScore: Math.round(Number(r.avg_score || 0) * 100) / 100 })),
      scoreDistribution: scoreDistribution.map(d => ({ score: d.score, count: Number(d.count) })),
      responses: responses.map(r => ({
        question: r.question_text,
        category: r.category_name,
        color: r.category_color,
        score: r.score != null ? Number(r.score) : null,
        text: r.text ?? null,
        bool: typeof r.bool === 'boolean' ? r.bool : null,
        type: r.question_type,
        comment: r.comment,
        respondent: `${r.respondent_first_name || ''} ${r.respondent_last_name || ''}`.trim(),
        respondentType: r.respondent_type
      }))
    });
  } catch (error) {
    console.error('Ошибка аналитики сотрудника:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Динамика сотрудника по циклам (тренд): общий средний, по категориям и (опц.) ответы
router.get('/user/:userId/trend', authenticateToken, async (req: any, res: any): Promise<void> => {
  try {
    const { userId } = req.params;
    const { includeResponses } = req.query as { includeResponses?: string };

    // Все участия пользователя в циклах (по дате цикла)
    const participants = await knex('assessment_participants')
      .where('assessment_participants.user_id', userId)
      .join('assessment_cycles', 'assessment_participants.cycle_id', 'assessment_cycles.id')
      .select(
        'assessment_participants.id as participant_id',
        'assessment_cycles.id as cycle_id',
        'assessment_cycles.name as cycle_name',
        'assessment_cycles.start_date as cycle_start',
        'assessment_cycles.end_date as cycle_end'
      )
      .orderBy('assessment_cycles.start_date', 'asc');

    if (!participants || participants.length === 0) {
      res.json({ userId, items: [] });
      return;
    }

    const participantIds = participants.map((p: any) => p.participant_id);

    // Общий средний балл по каждому участию (cycle)
    const overallRows = await knex('assessment_responses')
      .join('assessment_respondents', 'assessment_responses.respondent_id', 'assessment_respondents.id')
      .select('assessment_respondents.participant_id')
      .avg<{ participant_id: string; avg_score: string }>('assessment_responses.rating_value as avg_score')
      .whereIn('assessment_respondents.participant_id', participantIds)
      .groupBy('assessment_respondents.participant_id');

    const overallByParticipant: Record<string, number> = {};
    for (const row of overallRows as any[]) {
      overallByParticipant[String(row.participant_id)] = Math.round(Number(row.avg_score || 0) * 100) / 100;
    }

    // Средние по категориям в разрезе участий (cycle)
    const byCategoryRows = await knex('assessment_responses')
      .join('assessment_respondents', 'assessment_responses.respondent_id', 'assessment_respondents.id')
      .join('questions', 'assessment_responses.question_id', 'questions.id')
      .join('categories', 'questions.category_id', 'categories.id')
      .select(
        'assessment_respondents.participant_id',
        'categories.id as category_id',
        'categories.name as category_name',
        'categories.color as category_color'
      )
      .avg('assessment_responses.rating_value as avg_score')
      .whereIn('assessment_respondents.participant_id', participantIds)
      .groupBy(
        'assessment_respondents.participant_id',
        'categories.id', 'categories.name', 'categories.color'
      )
      .orderBy('categories.name');

    const categoriesByParticipant: Record<string, Array<{ category: string; color: string; avgScore: number }>> = {};
    for (const row of byCategoryRows as any[]) {
      const pid = String(row.participant_id);
      (categoriesByParticipant[pid] = categoriesByParticipant[pid] || []).push({
        category: row.category_name,
        color: row.category_color,
        avgScore: Math.round(Number(row.avg_score || 0) * 100) / 100
      });
    }

    // При необходимости подтягиваем ответы по каждому участию (cycle)
    let responsesByParticipant: Record<string, any[]> = {};
    if (String(includeResponses).toLowerCase() === 'true') {
      const responseRows = await knex('assessment_responses')
        .join('assessment_respondents', 'assessment_responses.respondent_id', 'assessment_respondents.id')
        .join('users as respondent_users', 'assessment_respondents.respondent_user_id', 'respondent_users.id')
        .join('questions', 'assessment_responses.question_id', 'questions.id')
        .join('categories', 'questions.category_id', 'categories.id')
        .select(
          'assessment_respondents.participant_id',
          'categories.name as category',
          'categories.color as color',
          'questions.question_text as question',
          'assessment_responses.rating_value as score',
          'assessment_responses.comment as comment',
          'respondent_users.first_name as respondent_first_name',
          'respondent_users.last_name as respondent_last_name',
          'assessment_respondents.respondent_type as respondent_type'
        )
        .whereIn('assessment_respondents.participant_id', participantIds)
        .orderBy('categories.name');

      for (const r of responseRows as any[]) {
        const pid = String(r.participant_id);
        (responsesByParticipant[pid] = responsesByParticipant[pid] || []).push({
          category: r.category,
          color: r.color,
          question: r.question,
          score: Number(r.score || 0),
          comment: r.comment,
          respondent: `${r.respondent_first_name || ''} ${r.respondent_last_name || ''}`.trim(),
          respondentType: r.respondent_type,
        });
      }
    }

    const items = participants.map((p: any) => ({
      cycleId: p.cycle_id,
      cycleName: p.cycle_name,
      start_date: p.cycle_start,
      end_date: p.cycle_end,
      overallAverage: overallByParticipant[String(p.participant_id)] || 0,
      categories: categoriesByParticipant[String(p.participant_id)] || [],
      responses: responsesByParticipant[String(p.participant_id)] || []
    }));

    res.json({ userId, items });
  } catch (error) {
    console.error('Ошибка тренда сотрудника:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получение сохранённых рекомендаций (без генерации)
router.get('/user/:userId/recommendations', authenticateToken, async (req: any, res: any): Promise<void> => {
  try {
    const { userId } = req.params;
    const { cycleId } = req.query as { cycleId?: string };

    let participantQuery = knex('assessment_participants')
      .where('assessment_participants.user_id', userId)
      .select('assessment_participants.id as participant_id', 'assessment_participants.cycle_id')
      .orderBy('assessment_participants.created_at', 'desc');

    if (cycleId) participantQuery = participantQuery.where('assessment_participants.cycle_id', cycleId);

    const participant = await participantQuery.first();
    if (!participant) {
      res.json({ participantId: null, cycleId: cycleId || null, recommendations: null });
      return;
    }

    const report = await knex('assessment_reports')
      .where('participant_id', participant.participant_id)
      .first();

    res.json({ participantId: participant.participant_id, cycleId: participant.cycle_id, recommendations: report?.recommendations || null });
  } catch (error) {
    console.error('Ошибка получения рекомендаций:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Сводка по системе (кол-ва и общий средний балл)
// ВАЖНО: этот маршрут должен объявляться ДО маршрута "/:id",
// чтобы "/summary" не перехватывался как ":id"
router.get('/summary', authenticateToken, async (_req: any, res: any): Promise<void> => {
  try {
    const [users, cycles, activeCycles, participants, responses, overallAvgRow] = await Promise.all([
      knex('users').count<{ count: string }>('id as count').first(),
      knex('assessment_cycles').count<{ count: string }>('id as count').first(),
      knex('assessment_cycles').where('status', 'active').count<{ count: string }>('id as count').first(),
      knex('assessment_participants').count<{ count: string }>('id as count').first(),
      knex('assessment_responses').count<{ count: string }>('id as count').first(),
      knex('assessment_responses').avg<{ avg: string }>('rating_value as avg').first(),
    ]);

    res.json({
      usersTotal: Number(users?.count || 0),
      cyclesTotal: Number(cycles?.count || 0),
      cyclesActive: Number(activeCycles?.count || 0),
      participantsTotal: Number(participants?.count || 0),
      responsesTotal: Number(responses?.count || 0),
      overallAverage: Math.round(Number(overallAvgRow?.avg || 0) * 100) / 100,
    });
  } catch (error) {
    console.error('Ошибка получения сводки:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Генерация отчета для участника
router.post('/generate/:participantId', authenticateToken, async (req: any, res: any): Promise<void> => {
  try {
    const { participantId } = req.params;
    
    // Получаем данные участника
    const participant = await knex('assessment_participants')
      .join('users', 'assessment_participants.user_id', 'users.id')
      .join('assessment_cycles', 'assessment_participants.cycle_id', 'assessment_cycles.id')
      .select(
        'assessment_participants.id as participant_id',
        'users.first_name',
        'users.last_name',
        'users.email',
        'assessment_cycles.name as cycle_title',
        'assessment_cycles.id as cycle_id'
      )
      .where('assessment_participants.id', participantId)
      .first();

    if (!participant) {
      res.status(404).json({ error: 'Участник не найден' });
      return;
    }

    // Получаем все ответы для участника
    const responses = await knex('assessment_responses')
      .join('questions', 'assessment_responses.question_id', 'questions.id')
      .join('categories', 'questions.category_id', 'categories.id')
      .join('assessment_respondents', 'assessment_responses.respondent_id', 'assessment_respondents.id')
      .join('users', 'assessment_respondents.respondent_user_id', 'users.id')
      .select(
        knex.raw('assessment_responses.rating_value as score'),
        'assessment_responses.comment',
        'questions.question_text as question_text',
        'categories.name as category_name',
        'categories.color as category_color',
        'users.first_name as respondent_first_name',
        'users.last_name as respondent_last_name'
      )
      .where('assessment_respondents.participant_id', participantId);

    // Группируем ответы по категориям
    const responsesByCategory = responses.reduce((acc: any, response: any) => {
      if (!acc[response.category_name]) {
        acc[response.category_name] = {
          name: response.category_name,
          color: response.category_color,
          responses: []
        };
      }
      acc[response.category_name].responses.push(response);
      return acc;
    }, {});

    // Рассчитываем средние баллы по категориям
    const categoryScores = Object.entries(responsesByCategory).map(([categoryName, data]: [string, any]) => {
      const scores = data.responses.map((r: any) => r.score);
      const averageScore = scores.reduce((sum: number, score: number) => sum + score, 0) / scores.length;
      
      return {
        category: categoryName,
        color: data.color,
        averageScore: Math.round(averageScore * 100) / 100,
        responseCount: scores.length
      };
    });

    // Рассчитываем общий балл
    const overallScore = categoryScores.reduce((sum, cat) => sum + cat.averageScore, 0) / categoryScores.length;

    // Определяем сильные и слабые стороны
    const sortedScores = [...categoryScores].sort((a, b) => b.averageScore - a.averageScore);
    const strengths = sortedScores.slice(0, 3);
    const weaknesses = sortedScores.slice(-3).reverse();

    // Анализ распределения оценок
    const scoreDistribution = responses.reduce((acc: any, response: any) => {
      acc[response.score] = (acc[response.score] || 0) + 1;
      return acc;
    }, {});

    // Аналитические данные
    const analytics = await calculateAnalytics(responses);

    // Формируем данные отчета для сохранения и отображения
    const categoryAverages = categoryScores.map((cs: any, idx: number) => ({
      id: idx,
      name: cs.category,
      color: cs.color,
      average: cs.averageScore,
      count: cs.responseCount,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    }));

    const totalResponses = responses.length;
    const responseDistribution: any = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    Object.entries(scoreDistribution).forEach(([score, count]) => {
      const s = Number(score);
      if (responseDistribution[s] !== undefined) {
        responseDistribution[s] = Number(count);
      }
    });

    const reportData = {
      overallAverage: Math.round(overallScore * 100) / 100,
      categoryAverages,
      strengths: strengths.map((s: any, idx: number) => ({ id: idx, name: s.category, color: s.color, average: s.averageScore })),
      weaknesses: weaknesses.map((w: any, idx: number) => ({ id: idx, name: w.category, color: w.color, average: w.averageScore })),
      totalResponses,
      responseDistribution
    };

    const report = {
      participant: {
        id: participant.participant_id,
        name: `${participant.first_name} ${participant.last_name}`,
        email: participant.email,
        cycle: participant.cycle_title
      },
      overallScore: Math.round(overallScore * 100) / 100,
      categoryScores,
      strengths,
      weaknesses,
      scoreDistribution,
      analytics,
      generatedAt: new Date().toISOString()
    };

    // Сохраняем/обновляем в таблице отчетов
    const existing = await knex('assessment_reports')
      .where('participant_id', participant.participant_id)
      .first();

    if (existing) {
      await knex('assessment_reports')
        .where('id', existing.id)
        .update({
          report_data: reportData,
          summary: null,
          recommendations: null,
          status: 'completed',
          generated_at: knex.fn.now(),
          updated_at: knex.fn.now()
        });
    } else {
      await knex('assessment_reports')
        .insert({
          participant_id: participant.participant_id,
          report_data: reportData,
          summary: null,
          recommendations: null,
          status: 'completed',
          generated_at: knex.fn.now()
        });
    }

    res.json(report);
  } catch (error) {
    console.error('Ошибка генерации отчета:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить сохраненный отчет по id
router.get('/:id', authenticateToken, async (req: any, res: any): Promise<void> => {
  try {
    const { id } = req.params;
    const report = await knex('assessment_reports')
      .where('assessment_reports.id', id)
      .join('assessment_participants', 'assessment_reports.participant_id', 'assessment_participants.id')
      .join('users', 'assessment_participants.user_id', 'users.id')
      .join('assessment_cycles', 'assessment_participants.cycle_id', 'assessment_cycles.id')
      .select(
        'assessment_reports.id',
        'assessment_reports.created_at',
        'assessment_reports.updated_at',
        'assessment_reports.report_data',
        'assessment_cycles.name as cycle_name',
        knex.raw("concat(users.first_name, ' ', users.last_name) as participant_name")
      )
      .first();

    if (!report) {
      res.status(404).json({ error: 'Отчет не найден' });
      return;
    }

    res.json({
      id: report.id,
      participant_name: report.participant_name,
      cycle_name: report.cycle_name,
      data: JSON.stringify(report.report_data),
      created_at: report.created_at,
      updated_at: report.updated_at
    });
  } catch (error) {
    console.error('Ошибка получения отчета:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить аналитику по циклу
router.get('/cycle/:cycleId/analytics', authenticateToken, async (req: any, res: any): Promise<void> => {
  try {
    const { cycleId } = req.params;
    
    // Получаем основную информацию о цикле
    const cycle = await knex('assessment_cycles')
      .select('id', 'name', 'description', 'status', 'start_date', 'end_date')
      .where('id', cycleId)
      .first();

    if (!cycle) {
      res.status(404).json({ error: 'Цикл не найден' });
      return;
    }

    // Получаем количество участников
    const participantCount = await knex('assessment_participants')
      .where('cycle_id', cycleId)
      .count('id as count')
      .first();

    // Получаем количество завершенных оценок
    const completedCount = await knex('assessment_participants')
      .where('cycle_id', cycleId)
      .where('status', 'completed')
      .count('id as count')
      .first();

    // Получаем средние баллы по всем участникам
    const avgScores = await knex('assessment_responses')
      .join('assessment_respondents', 'assessment_responses.respondent_id', 'assessment_respondents.id')
      .join('assessment_participants', 'assessment_respondents.participant_id', 'assessment_participants.id')
      .join('questions', 'assessment_responses.question_id', 'questions.id')
      .join('categories', 'questions.category_id', 'categories.id')
      .select(
        'categories.name as category_name',
        'categories.color as category_color'
      )
      .avg('assessment_responses.rating_value as avg_score')
      .where('assessment_participants.cycle_id', cycleId)
      .groupBy('categories.id', 'categories.name', 'categories.color')
      .orderBy('categories.name');

    // Получаем распределение оценок
    const scoreDistribution = await knex('assessment_responses')
      .join('assessment_respondents', 'assessment_responses.respondent_id', 'assessment_respondents.id')
      .join('assessment_participants', 'assessment_respondents.participant_id', 'assessment_participants.id')
      .select('assessment_responses.rating_value as score')
      .count('assessment_responses.rating_value as count')
      .where('assessment_participants.cycle_id', cycleId)
      .groupBy('assessment_responses.rating_value')
      .orderBy('assessment_responses.rating_value');

    const analytics = {
      cycle,
      participantCount: Number(participantCount?.count || 0),
      completedCount: Number(completedCount?.count || 0),
      completionRate: Number(participantCount?.count || 0) > 0 
        ? Math.round((Number(completedCount?.count || 0) / Number(participantCount?.count || 0)) * 100) 
        : 0,
      avgScores: avgScores.map(score => ({
        category: score.category_name,
        color: score.category_color,
        avgScore: Math.round(Number(score.avg_score || 0) * 100) / 100
      })),
      scoreDistribution: scoreDistribution.map(dist => ({
        score: dist.score,
        count: Number(dist.count)
      })),
      overallAverage: avgScores.length > 0 
        ? Math.round(avgScores.reduce((sum, score) => sum + Number(score.avg_score || 0), 0) / avgScores.length * 100) / 100
        : 0
    };

    res.json(analytics);
  } catch (error) {
    console.error('Ошибка получения аналитики:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Сравнение участников
router.get('/compare/:cycleId', authenticateToken, async (req: any, res: any): Promise<void> => {
  try {
    const { cycleId } = req.params;
    
    // Получаем всех участников цикла
    const participants = await knex('assessment_participants')
      .join('users', 'assessment_participants.user_id', 'users.id')
      .select(
        'assessment_participants.id as participant_id',
        'users.first_name',
        'users.last_name',
        'users.email'
      )
      .where('assessment_participants.cycle_id', cycleId)
      .where('assessment_participants.status', 'completed');

    // Получаем средние баллы для каждого участника по категориям
    const participantScores = await Promise.all(
      participants.map(async (participant) => {
        const scores = await knex('assessment_responses')
          .join('assessment_respondents', 'assessment_responses.respondent_id', 'assessment_respondents.id')
          .join('questions', 'assessment_responses.question_id', 'questions.id')
          .join('categories', 'questions.category_id', 'categories.id')
          .select(
            'categories.name as category_name',
            'categories.color as category_color'
          )
          .avg('assessment_responses.rating_value as avg_score')
          .where('assessment_respondents.participant_id', participant.participant_id)
          .groupBy('categories.id', 'categories.name', 'categories.color')
          .orderBy('categories.name');

        const overallScore = scores.length > 0 
          ? scores.reduce((sum, score) => sum + Number(score.avg_score || 0), 0) / scores.length 
          : 0;

        return {
          participant: {
            id: participant.participant_id,
            name: `${participant.first_name} ${participant.last_name}`,
            email: participant.email
          },
          overallScore: Math.round(overallScore * 100) / 100,
          categoryScores: scores.map(score => ({
            category: score.category_name,
            color: score.category_color,
            avgScore: Math.round(Number(score.avg_score || 0) * 100) / 100
          }))
        };
      })
    );

    // Сортируем участников по общему баллу
    participantScores.sort((a, b) => b.overallScore - a.overallScore);

    res.json({
      cycleId,
      participantCount: participants.length,
      participants: participantScores
    });
  } catch (error) {
    console.error('Ошибка сравнения участников:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Универсальное сравнение произвольного набора элементов: { userId, cycleId? }
router.post('/compare-items', authenticateToken, async (req: any, res: any): Promise<void> => {
  try {
    const { items } = req.body as { items: Array<{ userId: string; cycleId?: string }> };
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Не переданы элементы для сравнения' });
      return;
    }

    const results = [] as any[];

    for (const [index, item] of items.entries()) {
      const { userId, cycleId } = item;
      if (!userId) continue;

      // Находим участника
      let participantQuery = knex('assessment_participants')
        .where('user_id', userId)
        .join('users', 'assessment_participants.user_id', 'users.id')
        .join('assessment_cycles', 'assessment_participants.cycle_id', 'assessment_cycles.id')
        .select(
          'assessment_participants.id as participant_id',
          'users.first_name', 'users.last_name', 'users.email',
          'assessment_cycles.id as cycle_id', 'assessment_cycles.name as cycle_name'
        )
        .orderBy('assessment_participants.created_at', 'desc');

      if (cycleId) {
        participantQuery = participantQuery.where('assessment_participants.cycle_id', cycleId);
      }

      const participant = await participantQuery.first();
      if (!participant) {
        results.push({
          index,
          participant: null,
          overallScore: 0,
          categoryScores: []
        });
        continue;
      }

      const scores = await knex('assessment_responses')
        .join('assessment_respondents', 'assessment_responses.respondent_id', 'assessment_respondents.id')
        .join('questions', 'assessment_responses.question_id', 'questions.id')
        .join('categories', 'questions.category_id', 'categories.id')
        .select('categories.name as category_name', 'categories.color as category_color')
        .avg('assessment_responses.rating_value as avg_score')
        .where('assessment_respondents.participant_id', participant.participant_id)
        .groupBy('categories.id', 'categories.name', 'categories.color')
        .orderBy('categories.name');

      const overallScore = scores.length > 0
        ? scores.reduce((sum, s) => sum + Number(s.avg_score || 0), 0) / scores.length
        : 0;

      results.push({
        participant: {
          id: participant.participant_id,
          name: `${participant.first_name} ${participant.last_name}`,
          email: participant.email,
          cycleId: participant.cycle_id,
          cycleName: participant.cycle_name
        },
        overallScore: Math.round(overallScore * 100) / 100,
        categoryScores: scores.map(s => ({
          category: s.category_name,
          color: s.category_color,
          avgScore: Math.round(Number(s.avg_score || 0) * 100) / 100
        }))
      });
    }

    res.json({ items: results });
  } catch (error) {
    console.error('Ошибка универсального сравнения:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Сравнение отделов в рамках цикла (или по всем данным, если cycleId не указан)
router.get('/departments/compare', authenticateToken, async (req: any, res: any): Promise<void> => {
  try {
    const { cycleId, departmentIds } = req.query as { cycleId?: string; departmentIds?: string };
    const filterDepartmentIds = departmentIds ? (departmentIds as string).split(',').filter(Boolean) : [];

    // Базовый запрос ответов с привязкой к отделам (через пользователя-участника)
    let baseQuery = knex('assessment_responses')
      .join('assessment_respondents', 'assessment_responses.respondent_id', 'assessment_respondents.id')
      .join('assessment_participants', 'assessment_respondents.participant_id', 'assessment_participants.id')
      .join('users', 'assessment_participants.user_id', 'users.id')
      .join('questions', 'assessment_responses.question_id', 'questions.id')
      .join('categories', 'questions.category_id', 'categories.id')
      .leftJoin('departments', 'users.department_id', 'departments.id')
      .modify(q => {
        if (cycleId) q.where('assessment_participants.cycle_id', cycleId);
        if (filterDepartmentIds.length > 0) q.whereIn('users.department_id', filterDepartmentIds);
      });

    // Общий скор по отделам
    const overallByDept = await baseQuery.clone()
      .select('users.department_id', 'departments.name as department_name')
      .avg('assessment_responses.rating_value as avg_score')
      .groupBy('users.department_id', 'departments.name');

    // По категориям
    const byCategory = await baseQuery.clone()
      .select('users.department_id', 'departments.name as department_name', 'categories.id as category_id', 'categories.name as category_name', 'categories.color as category_color')
      .avg('assessment_responses.rating_value as avg_score')
      .groupBy('users.department_id', 'departments.name', 'categories.id', 'categories.name', 'categories.color')
      .orderBy('categories.name');

    // Сборка
    const deptMap: Record<string, any> = {};
    for (const row of overallByDept) {
      const key = row.department_id || 'unknown';
      deptMap[key] = deptMap[key] || { departmentId: row.department_id || 'unknown', departmentName: row.department_name || 'Без отдела', overallScore: 0, categoryScores: [] };
      deptMap[key].overallScore = Math.round(Number(row.avg_score || 0) * 100) / 100;
    }
    for (const row of byCategory) {
      const key = row.department_id || 'unknown';
      deptMap[key] = deptMap[key] || { departmentId: row.department_id || 'unknown', departmentName: row.department_name || 'Без отдела', overallScore: 0, categoryScores: [] };
      deptMap[key].categoryScores.push({
        category: row.category_name,
        color: row.category_color,
        avgScore: Math.round(Number(row.avg_score || 0) * 100) / 100
      });
    }

    res.json({ departments: Object.values(deptMap) });
  } catch (error) {
    console.error('Ошибка сравнения отделов:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Сводка по системе (кол-ва и общий средний балл)
router.get('/summary', authenticateToken, async (_req: any, res: any): Promise<void> => {
  try {
    const [users, cycles, activeCycles, participants, responses, overallAvgRow] = await Promise.all([
      knex('users').count<{ count: string }>('id as count').first(),
      knex('assessment_cycles').count<{ count: string }>('id as count').first(),
      knex('assessment_cycles').where('status', 'active').count<{ count: string }>('id as count').first(),
      knex('assessment_participants').count<{ count: string }>('id as count').first(),
      knex('assessment_responses').count<{ count: string }>('id as count').first(),
      knex('assessment_responses').avg<{ avg: string }>('rating_value as avg').first(),
    ]);

    res.json({
      usersTotal: Number(users?.count || 0),
      cyclesTotal: Number(cycles?.count || 0),
      cyclesActive: Number(activeCycles?.count || 0),
      participantsTotal: Number(participants?.count || 0),
      responsesTotal: Number(responses?.count || 0),
      overallAverage: Math.round(Number(overallAvgRow?.avg || 0) * 100) / 100,
    });
  } catch (error) {
    console.error('Ошибка получения сводки:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Функция для расчета аналитики
async function calculateAnalytics(responses: any[]) {
  const totalResponses = responses.length;
  
  if (totalResponses === 0) {
    return {
      totalResponses: 0,
      averageScore: 0,
      topCategories: [],
      improvementAreas: []
    };
  }

  // Группировка по категориям
  const categoryData = responses.reduce((acc: any, response: any) => {
    if (!acc[response.category_name]) {
      acc[response.category_name] = {
        name: response.category_name,
        scores: [],
        color: response.category_color
      };
    }
    acc[response.category_name].scores.push(response.score ?? response.rating_value ?? 0);
    return acc;
  }, {});

  // Расчет средних баллов по категориям
  const categoryAverages = Object.entries(categoryData).map(([categoryName, data]: [string, any]) => {
    const avgScore = data.scores.reduce((sum: number, score: number) => sum + score, 0) / data.scores.length;
    return {
      category: categoryName,
      color: data.color,
      avgScore: Math.round(avgScore * 100) / 100,
      responseCount: data.scores.length
    };
  });

  // Сортировка для определения лучших категорий и областей для улучшения
  const sortedCategories = [...categoryAverages].sort((a, b) => b.avgScore - a.avgScore);
  const topCategories = sortedCategories.slice(0, 3);
  const improvementAreas = sortedCategories.slice(-3).reverse();

  // Общий средний балл
  const overallAverage = categoryAverages.reduce((sum, cat) => sum + cat.avgScore, 0) / categoryAverages.length;

  return {
    totalResponses,
    averageScore: Math.round(overallAverage * 100) / 100,
    topCategories,
    improvementAreas,
    categoryBreakdown: categoryAverages
  };
}

export default router; 