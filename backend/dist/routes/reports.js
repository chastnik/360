"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const connection_1 = __importDefault(require("../database/connection"));
const auth_1 = require("../middleware/auth");
const llm_1 = require("../services/llm");
const router = (0, express_1.Router)();
router.get('/saved', auth_1.authenticateToken, async (_req, res) => {
    try {
        const reports = await (0, connection_1.default)('assessment_reports')
            .join('assessment_participants', 'assessment_reports.participant_id', 'assessment_participants.id')
            .join('users', 'assessment_participants.user_id', 'users.id')
            .join('assessment_cycles', 'assessment_participants.cycle_id', 'assessment_cycles.id')
            .select('assessment_reports.id', 'assessment_reports.created_at', 'assessment_reports.updated_at', 'assessment_cycles.id as cycle_id', 'assessment_cycles.name as cycle_name', connection_1.default.raw("concat(users.first_name, ' ', users.last_name) as participant_name"))
            .orderBy('assessment_reports.created_at', 'desc');
        res.json({ success: true, data: reports });
    }
    catch (error) {
        console.error('Ошибка получения сохраненных отчетов:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});
router.post('/user/:userId/recommendations', auth_1.authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const { cycleId } = req.body;
        let participantQuery = (0, connection_1.default)('assessment_participants')
            .where('assessment_participants.user_id', userId)
            .join('users', 'assessment_participants.user_id', 'users.id')
            .join('assessment_cycles', 'assessment_participants.cycle_id', 'assessment_cycles.id')
            .select('assessment_participants.id as participant_id', 'users.first_name', 'users.last_name', 'assessment_cycles.id as cycle_id', 'assessment_cycles.name as cycle_name')
            .orderBy('assessment_participants.created_at', 'desc');
        if (cycleId)
            participantQuery = participantQuery.where('assessment_participants.cycle_id', cycleId);
        const participant = await participantQuery.first();
        if (!participant) {
            res.status(404).json({ error: 'Участник не найден' });
            return;
        }
        console.log('🔄 Принудительная генерация новых рекомендаций для участника:', participant.participant_id);
        const avgScores = await (0, connection_1.default)('assessment_responses')
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
        const responses = await (0, connection_1.default)('assessment_responses')
            .join('assessment_respondents', 'assessment_responses.respondent_id', 'assessment_respondents.id')
            .join('questions', 'assessment_responses.question_id', 'questions.id')
            .join('categories', 'questions.category_id', 'categories.id')
            .select('categories.name as category_name', 'questions.question_text as question_text', 'assessment_responses.rating_value as score', 'assessment_responses.comment as comment')
            .where('assessment_respondents.participant_id', participant.participant_id)
            .orderBy('categories.name');
        const llmText = await (0, llm_1.generateEmployeeRecommendations)({
            employeeFullName: `${participant.first_name} ${participant.last_name}`.trim(),
            cycleName: participant.cycle_name,
            overallAverage,
            categories: avgScores.map((r) => ({ category: r.category_name, avgScore: Math.round(Number(r.avg_score || 0) * 100) / 100 })),
            responses: responses.map((r) => ({ category: r.category_name, question: r.question_text, score: Number(r.score || 0), comment: r.comment }))
        });
        const existingReport = await (0, connection_1.default)('assessment_reports')
            .where('participant_id', participant.participant_id)
            .first();
        if (existingReport) {
            await (0, connection_1.default)('assessment_reports')
                .where('id', existingReport.id)
                .update({
                recommendations: llmText,
                updated_at: connection_1.default.fn.now()
            });
            console.log('✅ Рекомендации обновлены в БД');
        }
        else {
            await (0, connection_1.default)('assessment_reports').insert({
                participant_id: participant.participant_id,
                recommendations: llmText,
                status: 'completed',
                generated_at: connection_1.default.fn.now()
            });
            console.log('✅ Рекомендации сохранены в БД');
        }
        res.json({ participantId: participant.participant_id, cycleId: participant.cycle_id, recommendations: llmText });
    }
    catch (error) {
        console.error('Ошибка генерации рекомендаций:', error?.message || error);
        res.status(500).json({ error: 'Не удалось сгенерировать рекомендации' });
    }
});
router.get('/user/:userId/analytics', auth_1.authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const { cycleId } = req.query;
        let participant = null;
        if (cycleId) {
            participant = await (0, connection_1.default)('assessment_participants')
                .where('assessment_participants.user_id', userId)
                .andWhere('assessment_participants.cycle_id', cycleId)
                .join('assessment_cycles', 'assessment_participants.cycle_id', 'assessment_cycles.id')
                .select('assessment_participants.id as participant_id', 'assessment_participants.cycle_id', 'assessment_cycles.name as cycle_name', 'assessment_cycles.start_date as cycle_start', 'assessment_cycles.end_date as cycle_end')
                .first();
        }
        else {
            participant = await (0, connection_1.default)('assessment_participants')
                .where('assessment_participants.user_id', userId)
                .join('assessment_cycles', 'assessment_participants.cycle_id', 'assessment_cycles.id')
                .where('assessment_cycles.status', 'completed')
                .select('assessment_participants.id as participant_id', 'assessment_participants.cycle_id', 'assessment_cycles.name as cycle_name', 'assessment_cycles.start_date as cycle_start', 'assessment_cycles.end_date as cycle_end')
                .orderBy([{ column: 'assessment_cycles.end_date', order: 'desc' }, { column: 'assessment_participants.created_at', order: 'desc' }])
                .first();
            if (!participant) {
                participant = await (0, connection_1.default)('assessment_participants')
                    .where('assessment_participants.user_id', userId)
                    .join('assessment_cycles', 'assessment_participants.cycle_id', 'assessment_cycles.id')
                    .select('assessment_participants.id as participant_id', 'assessment_participants.cycle_id', 'assessment_cycles.name as cycle_name', 'assessment_cycles.start_date as cycle_start', 'assessment_cycles.end_date as cycle_end')
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
        const responses = await (0, connection_1.default)('assessment_responses')
            .join('assessment_respondents', 'assessment_responses.respondent_id', 'assessment_respondents.id')
            .join('users as respondent_users', 'assessment_respondents.respondent_user_id', 'respondent_users.id')
            .join('questions', 'assessment_responses.question_id', 'questions.id')
            .join('categories', 'questions.category_id', 'categories.id')
            .select('assessment_responses.rating_value as score', 'assessment_responses.text_response as text', 'assessment_responses.boolean_response as bool', 'assessment_responses.comment', 'questions.question_text', 'questions.question_type as question_type', 'categories.name as category_name', 'categories.color as category_color', 'respondent_users.first_name as respondent_first_name', 'respondent_users.last_name as respondent_last_name', 'assessment_respondents.respondent_type')
            .where('assessment_respondents.participant_id', participant.participant_id);
        const avgScores = await (0, connection_1.default)('assessment_responses')
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
        const scoreDistribution = await (0, connection_1.default)('assessment_responses')
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
    }
    catch (error) {
        console.error('Ошибка аналитики сотрудника:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});
router.get('/user/:userId/trend', auth_1.authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const { includeResponses } = req.query;
        const participants = await (0, connection_1.default)('assessment_participants')
            .where('assessment_participants.user_id', userId)
            .join('assessment_cycles', 'assessment_participants.cycle_id', 'assessment_cycles.id')
            .select('assessment_participants.id as participant_id', 'assessment_cycles.id as cycle_id', 'assessment_cycles.name as cycle_name', 'assessment_cycles.start_date as cycle_start', 'assessment_cycles.end_date as cycle_end')
            .orderBy('assessment_cycles.start_date', 'asc');
        if (!participants || participants.length === 0) {
            res.json({ userId, items: [] });
            return;
        }
        const participantIds = participants.map((p) => p.participant_id);
        const overallRows = await (0, connection_1.default)('assessment_responses')
            .join('assessment_respondents', 'assessment_responses.respondent_id', 'assessment_respondents.id')
            .select('assessment_respondents.participant_id')
            .avg('assessment_responses.rating_value as avg_score')
            .whereIn('assessment_respondents.participant_id', participantIds)
            .groupBy('assessment_respondents.participant_id');
        const overallByParticipant = {};
        for (const row of overallRows) {
            overallByParticipant[String(row.participant_id)] = Math.round(Number(row.avg_score || 0) * 100) / 100;
        }
        const byCategoryRows = await (0, connection_1.default)('assessment_responses')
            .join('assessment_respondents', 'assessment_responses.respondent_id', 'assessment_respondents.id')
            .join('questions', 'assessment_responses.question_id', 'questions.id')
            .join('categories', 'questions.category_id', 'categories.id')
            .select('assessment_respondents.participant_id', 'categories.id as category_id', 'categories.name as category_name', 'categories.color as category_color')
            .avg('assessment_responses.rating_value as avg_score')
            .whereIn('assessment_respondents.participant_id', participantIds)
            .groupBy('assessment_respondents.participant_id', 'categories.id', 'categories.name', 'categories.color')
            .orderBy('categories.name');
        const categoriesByParticipant = {};
        for (const row of byCategoryRows) {
            const pid = String(row.participant_id);
            (categoriesByParticipant[pid] = categoriesByParticipant[pid] || []).push({
                category: row.category_name,
                color: row.category_color,
                avgScore: Math.round(Number(row.avg_score || 0) * 100) / 100
            });
        }
        let responsesByParticipant = {};
        if (String(includeResponses).toLowerCase() === 'true') {
            const responseRows = await (0, connection_1.default)('assessment_responses')
                .join('assessment_respondents', 'assessment_responses.respondent_id', 'assessment_respondents.id')
                .join('users as respondent_users', 'assessment_respondents.respondent_user_id', 'respondent_users.id')
                .join('questions', 'assessment_responses.question_id', 'questions.id')
                .join('categories', 'questions.category_id', 'categories.id')
                .select('assessment_respondents.participant_id', 'categories.name as category', 'categories.color as color', 'questions.question_text as question', 'assessment_responses.rating_value as score', 'assessment_responses.comment as comment', 'respondent_users.first_name as respondent_first_name', 'respondent_users.last_name as respondent_last_name', 'assessment_respondents.respondent_type as respondent_type')
                .whereIn('assessment_respondents.participant_id', participantIds)
                .orderBy('categories.name');
            for (const r of responseRows) {
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
        const items = participants.map((p) => ({
            cycleId: p.cycle_id,
            cycleName: p.cycle_name,
            start_date: p.cycle_start,
            end_date: p.cycle_end,
            overallAverage: overallByParticipant[String(p.participant_id)] || 0,
            categories: categoriesByParticipant[String(p.participant_id)] || [],
            responses: responsesByParticipant[String(p.participant_id)] || []
        }));
        res.json({ userId, items });
    }
    catch (error) {
        console.error('Ошибка тренда сотрудника:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});
router.get('/user/:userId/recommendations', auth_1.authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const { cycleId } = req.query;
        let participantQuery = (0, connection_1.default)('assessment_participants')
            .where('assessment_participants.user_id', userId)
            .select('assessment_participants.id as participant_id', 'assessment_participants.cycle_id')
            .orderBy('assessment_participants.created_at', 'desc');
        if (cycleId)
            participantQuery = participantQuery.where('assessment_participants.cycle_id', cycleId);
        const participant = await participantQuery.first();
        if (!participant) {
            res.json({ participantId: null, cycleId: cycleId || null, recommendations: null });
            return;
        }
        const report = await (0, connection_1.default)('assessment_reports')
            .where('participant_id', participant.participant_id)
            .first();
        res.json({ participantId: participant.participant_id, cycleId: participant.cycle_id, recommendations: report?.recommendations || null });
    }
    catch (error) {
        console.error('Ошибка получения рекомендаций:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});
router.get('/summary', auth_1.authenticateToken, async (_req, res) => {
    try {
        const [users, cycles, activeCycles, participants, responses, overallAvgRow] = await Promise.all([
            (0, connection_1.default)('users').count('id as count').first(),
            (0, connection_1.default)('assessment_cycles').count('id as count').first(),
            (0, connection_1.default)('assessment_cycles').where('status', 'active').count('id as count').first(),
            (0, connection_1.default)('assessment_participants').count('id as count').first(),
            (0, connection_1.default)('assessment_responses').count('id as count').first(),
            (0, connection_1.default)('assessment_responses').avg('rating_value as avg').first(),
        ]);
        res.json({
            usersTotal: Number(users?.count || 0),
            cyclesTotal: Number(cycles?.count || 0),
            cyclesActive: Number(activeCycles?.count || 0),
            participantsTotal: Number(participants?.count || 0),
            responsesTotal: Number(responses?.count || 0),
            overallAverage: Math.round(Number(overallAvgRow?.avg || 0) * 100) / 100,
        });
    }
    catch (error) {
        console.error('Ошибка получения сводки:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});
router.post('/generate/:participantId', auth_1.authenticateToken, async (req, res) => {
    try {
        const { participantId } = req.params;
        const participant = await (0, connection_1.default)('assessment_participants')
            .join('users', 'assessment_participants.user_id', 'users.id')
            .join('assessment_cycles', 'assessment_participants.cycle_id', 'assessment_cycles.id')
            .select('assessment_participants.id as participant_id', 'users.first_name', 'users.last_name', 'users.email', 'assessment_cycles.name as cycle_title', 'assessment_cycles.id as cycle_id')
            .where('assessment_participants.id', participantId)
            .first();
        if (!participant) {
            res.status(404).json({ error: 'Участник не найден' });
            return;
        }
        const responses = await (0, connection_1.default)('assessment_responses')
            .join('questions', 'assessment_responses.question_id', 'questions.id')
            .join('categories', 'questions.category_id', 'categories.id')
            .join('assessment_respondents', 'assessment_responses.respondent_id', 'assessment_respondents.id')
            .join('users', 'assessment_respondents.respondent_user_id', 'users.id')
            .select(connection_1.default.raw('assessment_responses.rating_value as score'), 'assessment_responses.comment', 'questions.question_text as question_text', 'categories.name as category_name', 'categories.color as category_color', 'users.first_name as respondent_first_name', 'users.last_name as respondent_last_name')
            .where('assessment_respondents.participant_id', participantId);
        const responsesByCategory = responses.reduce((acc, response) => {
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
        const categoryScores = Object.entries(responsesByCategory).map(([categoryName, data]) => {
            const scores = data.responses.map((r) => r.score);
            const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
            return {
                category: categoryName,
                color: data.color,
                averageScore: Math.round(averageScore * 100) / 100,
                responseCount: scores.length
            };
        });
        const overallScore = categoryScores.reduce((sum, cat) => sum + cat.averageScore, 0) / categoryScores.length;
        const sortedScores = [...categoryScores].sort((a, b) => b.averageScore - a.averageScore);
        const strengths = sortedScores.slice(0, 3);
        const weaknesses = sortedScores.slice(-3).reverse();
        const scoreDistribution = responses.reduce((acc, response) => {
            acc[response.score] = (acc[response.score] || 0) + 1;
            return acc;
        }, {});
        const analytics = await calculateAnalytics(responses);
        const categoryAverages = categoryScores.map((cs, idx) => ({
            id: idx,
            name: cs.category,
            color: cs.color,
            average: cs.averageScore,
            count: cs.responseCount,
            distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        }));
        const totalResponses = responses.length;
        const responseDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        Object.entries(scoreDistribution).forEach(([score, count]) => {
            const s = Number(score);
            if (responseDistribution[s] !== undefined) {
                responseDistribution[s] = Number(count);
            }
        });
        const reportData = {
            overallAverage: Math.round(overallScore * 100) / 100,
            categoryAverages,
            strengths: strengths.map((s, idx) => ({ id: idx, name: s.category, color: s.color, average: s.averageScore })),
            weaknesses: weaknesses.map((w, idx) => ({ id: idx, name: w.category, color: w.color, average: w.averageScore })),
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
        const existing = await (0, connection_1.default)('assessment_reports')
            .where('participant_id', participant.participant_id)
            .first();
        if (existing) {
            await (0, connection_1.default)('assessment_reports')
                .where('id', existing.id)
                .update({
                report_data: reportData,
                summary: null,
                recommendations: null,
                status: 'completed',
                generated_at: connection_1.default.fn.now(),
                updated_at: connection_1.default.fn.now()
            });
        }
        else {
            await (0, connection_1.default)('assessment_reports')
                .insert({
                participant_id: participant.participant_id,
                report_data: reportData,
                summary: null,
                recommendations: null,
                status: 'completed',
                generated_at: connection_1.default.fn.now()
            });
        }
        res.json(report);
    }
    catch (error) {
        console.error('Ошибка генерации отчета:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});
router.get('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const report = await (0, connection_1.default)('assessment_reports')
            .where('assessment_reports.id', id)
            .join('assessment_participants', 'assessment_reports.participant_id', 'assessment_participants.id')
            .join('users', 'assessment_participants.user_id', 'users.id')
            .join('assessment_cycles', 'assessment_participants.cycle_id', 'assessment_cycles.id')
            .select('assessment_reports.id', 'assessment_reports.created_at', 'assessment_reports.updated_at', 'assessment_reports.report_data', 'assessment_cycles.name as cycle_name', connection_1.default.raw("concat(users.first_name, ' ', users.last_name) as participant_name"))
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
    }
    catch (error) {
        console.error('Ошибка получения отчета:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});
router.get('/cycle/:cycleId/analytics', auth_1.authenticateToken, async (req, res) => {
    try {
        const { cycleId } = req.params;
        const cycle = await (0, connection_1.default)('assessment_cycles')
            .select('id', 'name', 'description', 'status', 'start_date', 'end_date')
            .where('id', cycleId)
            .first();
        if (!cycle) {
            res.status(404).json({ error: 'Цикл не найден' });
            return;
        }
        const participantCount = await (0, connection_1.default)('assessment_participants')
            .where('cycle_id', cycleId)
            .count('id as count')
            .first();
        const completedCount = await (0, connection_1.default)('assessment_participants')
            .where('cycle_id', cycleId)
            .where('status', 'completed')
            .count('id as count')
            .first();
        const avgScores = await (0, connection_1.default)('assessment_responses')
            .join('assessment_respondents', 'assessment_responses.respondent_id', 'assessment_respondents.id')
            .join('assessment_participants', 'assessment_respondents.participant_id', 'assessment_participants.id')
            .join('questions', 'assessment_responses.question_id', 'questions.id')
            .join('categories', 'questions.category_id', 'categories.id')
            .select('categories.name as category_name', 'categories.color as category_color')
            .avg('assessment_responses.rating_value as avg_score')
            .where('assessment_participants.cycle_id', cycleId)
            .groupBy('categories.id', 'categories.name', 'categories.color')
            .orderBy('categories.name');
        const scoreDistribution = await (0, connection_1.default)('assessment_responses')
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
    }
    catch (error) {
        console.error('Ошибка получения аналитики:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});
router.get('/compare/:cycleId', auth_1.authenticateToken, async (req, res) => {
    try {
        const { cycleId } = req.params;
        const participants = await (0, connection_1.default)('assessment_participants')
            .join('users', 'assessment_participants.user_id', 'users.id')
            .select('assessment_participants.id as participant_id', 'users.first_name', 'users.last_name', 'users.email')
            .where('assessment_participants.cycle_id', cycleId)
            .where('assessment_participants.status', 'completed');
        const participantScores = await Promise.all(participants.map(async (participant) => {
            const scores = await (0, connection_1.default)('assessment_responses')
                .join('assessment_respondents', 'assessment_responses.respondent_id', 'assessment_respondents.id')
                .join('questions', 'assessment_responses.question_id', 'questions.id')
                .join('categories', 'questions.category_id', 'categories.id')
                .select('categories.name as category_name', 'categories.color as category_color')
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
        }));
        participantScores.sort((a, b) => b.overallScore - a.overallScore);
        res.json({
            cycleId,
            participantCount: participants.length,
            participants: participantScores
        });
    }
    catch (error) {
        console.error('Ошибка сравнения участников:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});
router.post('/compare-items', auth_1.authenticateToken, async (req, res) => {
    try {
        const { items } = req.body;
        if (!Array.isArray(items) || items.length === 0) {
            res.status(400).json({ error: 'Не переданы элементы для сравнения' });
            return;
        }
        const results = [];
        for (const [index, item] of items.entries()) {
            const { userId, cycleId } = item;
            if (!userId)
                continue;
            let participantQuery = (0, connection_1.default)('assessment_participants')
                .where('user_id', userId)
                .join('users', 'assessment_participants.user_id', 'users.id')
                .join('assessment_cycles', 'assessment_participants.cycle_id', 'assessment_cycles.id')
                .select('assessment_participants.id as participant_id', 'users.first_name', 'users.last_name', 'users.email', 'assessment_cycles.id as cycle_id', 'assessment_cycles.name as cycle_name')
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
            const scores = await (0, connection_1.default)('assessment_responses')
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
    }
    catch (error) {
        console.error('Ошибка универсального сравнения:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});
router.get('/departments/compare', auth_1.authenticateToken, async (req, res) => {
    try {
        const { cycleId, departmentIds } = req.query;
        const filterDepartmentIds = departmentIds ? departmentIds.split(',').filter(Boolean) : [];
        let baseQuery = (0, connection_1.default)('assessment_responses')
            .join('assessment_respondents', 'assessment_responses.respondent_id', 'assessment_respondents.id')
            .join('assessment_participants', 'assessment_respondents.participant_id', 'assessment_participants.id')
            .join('users', 'assessment_participants.user_id', 'users.id')
            .join('questions', 'assessment_responses.question_id', 'questions.id')
            .join('categories', 'questions.category_id', 'categories.id')
            .leftJoin('departments', 'users.department_id', 'departments.id')
            .modify(q => {
            if (cycleId)
                q.where('assessment_participants.cycle_id', cycleId);
            if (filterDepartmentIds.length > 0)
                q.whereIn('users.department_id', filterDepartmentIds);
        });
        const overallByDept = await baseQuery.clone()
            .select('users.department_id', 'departments.name as department_name')
            .avg('assessment_responses.rating_value as avg_score')
            .groupBy('users.department_id', 'departments.name');
        const byCategory = await baseQuery.clone()
            .select('users.department_id', 'departments.name as department_name', 'categories.id as category_id', 'categories.name as category_name', 'categories.color as category_color')
            .avg('assessment_responses.rating_value as avg_score')
            .groupBy('users.department_id', 'departments.name', 'categories.id', 'categories.name', 'categories.color')
            .orderBy('categories.name');
        const deptMap = {};
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
    }
    catch (error) {
        console.error('Ошибка сравнения отделов:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});
router.get('/summary', auth_1.authenticateToken, async (_req, res) => {
    try {
        const [users, cycles, activeCycles, participants, responses, overallAvgRow] = await Promise.all([
            (0, connection_1.default)('users').count('id as count').first(),
            (0, connection_1.default)('assessment_cycles').count('id as count').first(),
            (0, connection_1.default)('assessment_cycles').where('status', 'active').count('id as count').first(),
            (0, connection_1.default)('assessment_participants').count('id as count').first(),
            (0, connection_1.default)('assessment_responses').count('id as count').first(),
            (0, connection_1.default)('assessment_responses').avg('rating_value as avg').first(),
        ]);
        res.json({
            usersTotal: Number(users?.count || 0),
            cyclesTotal: Number(cycles?.count || 0),
            cyclesActive: Number(activeCycles?.count || 0),
            participantsTotal: Number(participants?.count || 0),
            responsesTotal: Number(responses?.count || 0),
            overallAverage: Math.round(Number(overallAvgRow?.avg || 0) * 100) / 100,
        });
    }
    catch (error) {
        console.error('Ошибка получения сводки:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});
async function calculateAnalytics(responses) {
    const totalResponses = responses.length;
    if (totalResponses === 0) {
        return {
            totalResponses: 0,
            averageScore: 0,
            topCategories: [],
            improvementAreas: []
        };
    }
    const categoryData = responses.reduce((acc, response) => {
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
    const categoryAverages = Object.entries(categoryData).map(([categoryName, data]) => {
        const avgScore = data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length;
        return {
            category: categoryName,
            color: data.color,
            avgScore: Math.round(avgScore * 100) / 100,
            responseCount: data.scores.length
        };
    });
    const sortedCategories = [...categoryAverages].sort((a, b) => b.avgScore - a.avgScore);
    const topCategories = sortedCategories.slice(0, 3);
    const improvementAreas = sortedCategories.slice(-3).reverse();
    const overallAverage = categoryAverages.reduce((sum, cat) => sum + cat.avgScore, 0) / categoryAverages.length;
    return {
        totalResponses,
        averageScore: Math.round(overallAverage * 100) / 100,
        topCategories,
        improvementAreas,
        categoryBreakdown: categoryAverages
    };
}
exports.default = router;
//# sourceMappingURL=reports.js.map