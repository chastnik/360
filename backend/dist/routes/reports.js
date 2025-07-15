"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const connection_1 = __importDefault(require("../database/connection"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/', auth_1.authenticateToken, async (_req, res) => {
    try {
        const reports = await (0, connection_1.default)('assessment_cycles')
            .select('id', 'title', 'description', 'status', 'start_date', 'end_date')
            .where('status', 'active')
            .orderBy('created_at', 'desc');
        res.json(reports);
    }
    catch (error) {
        console.error('Ошибка получения отчетов:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});
router.post('/generate/:participantId', auth_1.authenticateToken, async (req, res) => {
    try {
        const { participantId } = req.params;
        const participant = await (0, connection_1.default)('assessment_participants')
            .join('users', 'assessment_participants.user_id', 'users.id')
            .join('assessment_cycles', 'assessment_participants.cycle_id', 'assessment_cycles.id')
            .select('assessment_participants.id as participant_id', 'users.first_name', 'users.last_name', 'users.email', 'assessment_cycles.title as cycle_title', 'assessment_cycles.id as cycle_id')
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
            .join('users', 'assessment_respondents.respondent_id', 'users.id')
            .select('assessment_responses.score', 'assessment_responses.comment', 'questions.text as question_text', 'categories.name as category_name', 'categories.color as category_color', 'users.first_name as respondent_first_name', 'users.last_name as respondent_last_name')
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
        res.json(report);
    }
    catch (error) {
        console.error('Ошибка генерации отчета:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});
router.get('/cycle/:cycleId/analytics', auth_1.authenticateToken, async (req, res) => {
    try {
        const { cycleId } = req.params;
        const cycle = await (0, connection_1.default)('assessment_cycles')
            .select('id', 'title', 'description', 'status', 'start_date', 'end_date')
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
            .avg('assessment_responses.score as avg_score')
            .where('assessment_participants.cycle_id', cycleId)
            .groupBy('categories.id', 'categories.name', 'categories.color')
            .orderBy('categories.name');
        const scoreDistribution = await (0, connection_1.default)('assessment_responses')
            .join('assessment_respondents', 'assessment_responses.respondent_id', 'assessment_respondents.id')
            .join('assessment_participants', 'assessment_respondents.participant_id', 'assessment_participants.id')
            .select('assessment_responses.score')
            .count('assessment_responses.score as count')
            .where('assessment_participants.cycle_id', cycleId)
            .groupBy('assessment_responses.score')
            .orderBy('assessment_responses.score');
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
                .avg('assessment_responses.score as avg_score')
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
        acc[response.category_name].scores.push(response.score);
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