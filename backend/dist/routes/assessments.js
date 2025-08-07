"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const connection_1 = __importDefault(require("../database/connection"));
const auth_1 = require("../middleware/auth");
const mattermost_1 = __importDefault(require("../services/mattermost"));
const router = (0, express_1.Router)();
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ error: 'Пользователь не авторизован' });
            return;
        }
        const assessments = await (0, connection_1.default)('assessment_respondents')
            .join('assessment_participants', 'assessment_respondents.participant_id', 'assessment_participants.id')
            .join('assessment_cycles', 'assessment_participants.cycle_id', 'assessment_cycles.id')
            .join('users', 'assessment_participants.user_id', 'users.id')
            .where('assessment_respondents.respondent_user_id', userId)
            .where('assessment_cycles.status', 'active')
            .select('assessment_respondents.id as respondent_id', 'assessment_cycles.name as cycle_title', 'assessment_cycles.description as cycle_description', 'assessment_cycles.end_date', 'users.first_name as participant_first_name', 'users.last_name as participant_last_name', 'assessment_respondents.status', 'assessment_respondents.started_at', 'assessment_respondents.completed_at')
            .orderBy('assessment_cycles.start_date', 'desc');
        res.json({
            success: true,
            data: assessments
        });
    }
    catch (error) {
        console.error('Ошибка получения оценок:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});
router.post('/:respondentId/start', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { respondentId } = req.params;
        if (!userId) {
            res.status(401).json({ error: 'Пользователь не авторизован' });
            return;
        }
        const respondent = await (0, connection_1.default)('assessment_respondents')
            .where('id', respondentId)
            .where('respondent_id', userId)
            .first();
        if (!respondent) {
            res.status(404).json({ error: 'Оценка не найдена' });
            return;
        }
        await (0, connection_1.default)('assessment_respondents')
            .where('id', respondentId)
            .update({
            status: 'in_progress',
            started_at: connection_1.default.fn.now()
        });
        res.json({ message: 'Оценка начата' });
    }
    catch (error) {
        console.error('Ошибка начала оценки:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});
router.get('/:respondentId/questions', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { respondentId } = req.params;
        if (!userId) {
            res.status(401).json({ error: 'Пользователь не авторизован' });
            return;
        }
        const respondent = await (0, connection_1.default)('assessment_respondents')
            .where('id', respondentId)
            .where('respondent_id', userId)
            .first();
        if (!respondent) {
            res.status(404).json({ error: 'Оценка не найдена' });
            return;
        }
        const questions = await (0, connection_1.default)('questions')
            .join('categories', 'questions.category_id', 'categories.id')
            .where('questions.is_active', true)
            .select('questions.id', 'questions.text', 'questions.category_id', 'categories.name as category_name', 'categories.color as category_color')
            .orderBy('categories.id', 'asc')
            .orderBy('questions.order_index', 'asc');
        const existingResponses = await (0, connection_1.default)('assessment_responses')
            .where('respondent_id', respondentId)
            .select('question_id', 'score', 'comment');
        const questionsWithAnswers = questions.map(question => {
            const existingResponse = existingResponses.find(r => r.question_id === question.id);
            return {
                ...question,
                existingScore: existingResponse?.score || null,
                existingComment: existingResponse?.comment || null
            };
        });
        res.json(questionsWithAnswers);
    }
    catch (error) {
        console.error('Ошибка получения вопросов:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});
router.post('/:respondentId/responses', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { respondentId } = req.params;
        const { questionId, score, comment } = req.body;
        if (!userId) {
            res.status(401).json({ error: 'Пользователь не авторизован' });
            return;
        }
        const respondent = await (0, connection_1.default)('assessment_respondents')
            .where('id', respondentId)
            .where('respondent_id', userId)
            .first();
        if (!respondent) {
            res.status(404).json({ error: 'Оценка не найдена' });
            return;
        }
        const question = await (0, connection_1.default)('questions')
            .where('id', questionId)
            .where('is_active', true)
            .first();
        if (!question) {
            res.status(404).json({ error: 'Вопрос не найден' });
            return;
        }
        if (score < 1 || score > 5) {
            res.status(400).json({ error: 'Оценка должна быть от 1 до 5' });
            return;
        }
        await (0, connection_1.default)('assessment_responses')
            .insert({
            respondent_id: respondentId,
            question_id: questionId,
            score: score,
            comment: comment || null
        })
            .onConflict(['respondent_id', 'question_id'])
            .merge({
            score: score,
            comment: comment || null,
            updated_at: connection_1.default.fn.now()
        });
        res.json({ message: 'Ответ сохранен' });
    }
    catch (error) {
        console.error('Ошибка сохранения ответа:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});
router.post('/:respondentId/complete', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { respondentId } = req.params;
        if (!userId) {
            res.status(401).json({ error: 'Пользователь не авторизован' });
            return;
        }
        const respondent = await (0, connection_1.default)('assessment_respondents')
            .where('id', respondentId)
            .where('respondent_id', userId)
            .first();
        if (!respondent) {
            res.status(404).json({ error: 'Оценка не найдена' });
            return;
        }
        const totalQuestions = await (0, connection_1.default)('questions')
            .where('is_active', true)
            .count('id as count')
            .first();
        const answeredQuestions = await (0, connection_1.default)('assessment_responses')
            .where('respondent_id', respondentId)
            .count('id as count')
            .first();
        const totalCount = Number(totalQuestions?.count || 0);
        const answeredCount = Number(answeredQuestions?.count || 0);
        if (answeredCount < totalCount) {
            res.status(400).json({
                error: 'Необходимо ответить на все вопросы перед завершением',
                progress: {
                    answered: answeredCount,
                    total: totalCount
                }
            });
            return;
        }
        await (0, connection_1.default)('assessment_respondents')
            .where('id', respondentId)
            .update({
            status: 'completed',
            completed_at: connection_1.default.fn.now()
        });
        const participantInfo = await (0, connection_1.default)('assessment_respondents')
            .join('assessment_participants', 'assessment_respondents.participant_id', 'assessment_participants.id')
            .join('assessment_cycles', 'assessment_participants.cycle_id', 'assessment_cycles.id')
            .join('users', 'assessment_participants.user_id', 'users.id')
            .where('assessment_respondents.id', respondentId)
            .select('assessment_participants.id as participant_id', 'assessment_cycles.title as cycle_title', 'users.mattermost_username as participant_username', 'users.first_name as participant_first_name', 'users.last_name as participant_last_name')
            .first();
        if (participantInfo) {
            const respondentStats = await (0, connection_1.default)('assessment_respondents')
                .where('participant_id', participantInfo.participant_id)
                .select(connection_1.default.raw('COUNT(*) as total'), connection_1.default.raw('COUNT(CASE WHEN status = ? THEN 1 END) as completed', ['completed']))
                .first();
            if (respondentStats && Number(respondentStats.completed) === Number(respondentStats.total)) {
                try {
                    if (participantInfo.participant_username) {
                        await mattermost_1.default.notifyAssessmentComplete(participantInfo.participant_username, participantInfo.cycle_title, String(participantInfo.participant_id));
                        console.log(`Уведомление о завершении оценки отправлено участнику ${participantInfo.participant_username}`);
                    }
                }
                catch (error) {
                    console.error('Ошибка отправки уведомления о завершении оценки:', error);
                }
            }
        }
        res.json({ message: 'Оценка завершена' });
    }
    catch (error) {
        console.error('Ошибка завершения оценки:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});
router.get('/:respondentId/progress', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { respondentId } = req.params;
        if (!userId) {
            res.status(401).json({ error: 'Пользователь не авторизован' });
            return;
        }
        const respondent = await (0, connection_1.default)('assessment_respondents')
            .join('assessment_participants', 'assessment_respondents.participant_id', 'assessment_participants.id')
            .join('assessment_cycles', 'assessment_participants.cycle_id', 'assessment_cycles.id')
            .join('users', 'assessment_participants.user_id', 'users.id')
            .where('assessment_respondents.id', respondentId)
            .where('assessment_respondents.respondent_id', userId)
            .select('assessment_cycles.title as cycle_title', 'users.first_name as participant_first_name', 'users.last_name as participant_last_name', 'assessment_respondents.status', 'assessment_respondents.started_at', 'assessment_respondents.completed_at')
            .first();
        if (!respondent) {
            res.status(404).json({ error: 'Оценка не найдена' });
            return;
        }
        const totalQuestions = await (0, connection_1.default)('questions')
            .where('is_active', true)
            .count('id as count')
            .first();
        const answeredQuestions = await (0, connection_1.default)('assessment_responses')
            .where('respondent_id', respondentId)
            .count('id as count')
            .first();
        const categoryProgress = await (0, connection_1.default)('categories')
            .leftJoin('questions', 'categories.id', 'questions.category_id')
            .leftJoin('assessment_responses', function () {
            this.on('questions.id', '=', 'assessment_responses.question_id')
                .andOn('assessment_responses.respondent_id', '=', String(respondentId));
        })
            .where('questions.is_active', true)
            .groupBy('categories.id', 'categories.name', 'categories.color')
            .orderBy('categories.id');
        const totalCount = Number(totalQuestions?.count || 0);
        const answeredCount = Number(answeredQuestions?.count || 0);
        const progressPercentage = totalCount > 0
            ? Math.round((answeredCount / totalCount) * 100)
            : 0;
        res.json({
            respondent,
            progress: {
                totalQuestions: totalCount,
                answeredQuestions: answeredCount,
                progressPercentage,
                categoryProgress
            }
        });
    }
    catch (error) {
        console.error('Ошибка получения прогресса:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});
exports.default = router;
//# sourceMappingURL=assessments.js.map