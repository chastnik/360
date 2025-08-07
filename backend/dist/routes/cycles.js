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
router.get('/', auth_1.authenticateToken, async (_req, res) => {
    try {
        const cycles = await (0, connection_1.default)('assessment_cycles')
            .select('id', 'name', 'description', 'status', 'start_date', 'end_date', 'created_at')
            .orderBy('created_at', 'desc');
        res.json({
            success: true,
            data: cycles
        });
    }
    catch (error) {
        console.error('Ошибка получения циклов оценки:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});
router.get('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const cycle = await (0, connection_1.default)('assessment_cycles')
            .where('id', id)
            .first();
        if (!cycle) {
            res.status(404).json({ error: 'Цикл оценки не найден' });
            return;
        }
        const participants = await (0, connection_1.default)('assessment_participants')
            .join('users', 'assessment_participants.user_id', '=', 'users.id')
            .where('assessment_participants.cycle_id', id)
            .select('assessment_participants.id', 'users.first_name', 'users.last_name', 'users.email', 'users.role', 'users.mattermost_username', 'assessment_participants.status');
        const respondents = await (0, connection_1.default)('assessment_respondents')
            .join('users', 'assessment_respondents.respondent_user_id', '=', 'users.id')
            .join('assessment_participants', 'assessment_respondents.participant_id', '=', 'assessment_participants.id')
            .where('assessment_participants.cycle_id', id)
            .select('assessment_respondents.id', 'assessment_respondents.participant_id', 'users.first_name', 'users.last_name', 'users.email', 'users.mattermost_username', 'assessment_respondents.status');
        const participantsWithRespondents = participants.map(participant => ({
            ...participant,
            respondents: respondents.filter(r => r.participant_id === participant.id)
        }));
        res.json({
            ...cycle,
            participants: participantsWithRespondents
        });
    }
    catch (error) {
        console.error('Ошибка получения деталей цикла:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});
router.post('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        const { name, description, start_date, end_date } = req.body;
        if (user?.role !== 'admin' && user?.role !== 'hr' && user?.role !== 'manager') {
            res.status(403).json({ error: 'Недостаточно прав доступа' });
            return;
        }
        const [newCycle] = await (0, connection_1.default)('assessment_cycles')
            .insert({
            name,
            description,
            start_date,
            end_date,
            status: 'draft',
            created_by: user.userId
        })
            .returning('*');
        const cycle = newCycle;
        res.status(201).json(cycle);
    }
    catch (error) {
        console.error('Ошибка создания цикла оценки:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});
router.put('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        const { id } = req.params;
        const { name, description, start_date, end_date } = req.body;
        if (user?.role !== 'admin' && user?.role !== 'hr' && user?.role !== 'manager') {
            res.status(403).json({ error: 'Недостаточно прав доступа' });
            return;
        }
        const cycle = await (0, connection_1.default)('assessment_cycles')
            .where('id', id)
            .first();
        if (!cycle) {
            res.status(404).json({ error: 'Цикл оценки не найден' });
            return;
        }
        if (cycle.status === 'active') {
            res.status(400).json({ error: 'Нельзя редактировать активный цикл' });
            return;
        }
        await (0, connection_1.default)('assessment_cycles')
            .where('id', id)
            .update({
            name: name,
            description,
            start_date,
            end_date,
            updated_at: connection_1.default.fn.now()
        });
        const updatedCycle = await (0, connection_1.default)('assessment_cycles')
            .where('id', id)
            .first();
        res.json(updatedCycle);
    }
    catch (error) {
        console.error('Ошибка обновления цикла оценки:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});
router.post('/:id/participants', auth_1.authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        const { id } = req.params;
        const { user_id } = req.body;
        const userIds = Array.isArray(user_id) ? user_id : [user_id];
        if (user?.role !== 'admin' && user?.role !== 'hr' && user?.role !== 'manager') {
            res.status(403).json({ error: 'Недостаточно прав доступа' });
            return;
        }
        const cycle = await (0, connection_1.default)('assessment_cycles')
            .where('id', id)
            .first();
        if (!cycle) {
            res.status(404).json({ error: 'Цикл оценки не найден' });
            return;
        }
        if (cycle.status === 'active') {
            res.status(400).json({ error: 'Нельзя добавлять участников в активный цикл' });
            return;
        }
        const existingUsers = await (0, connection_1.default)('users')
            .whereIn('id', userIds)
            .where('is_active', true);
        if (existingUsers.length !== userIds.length) {
            res.status(400).json({ error: 'Один или несколько пользователей не найдены' });
            return;
        }
        const participantData = userIds.map((userId) => ({
            cycle_id: id,
            user_id: userId,
            status: 'invited'
        }));
        await (0, connection_1.default)('assessment_participants')
            .insert(participantData)
            .onConflict(['cycle_id', 'user_id'])
            .merge();
        res.json({ message: 'Участники успешно добавлены' });
    }
    catch (error) {
        console.error('Ошибка добавления участников:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});
router.post('/:id/participants/:participantId/respondents', auth_1.authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        const { id, participantId } = req.params;
        const { respondentIds } = req.body;
        if (user?.role !== 'admin' && user?.role !== 'hr' && user?.role !== 'manager') {
            res.status(403).json({ error: 'Недостаточно прав доступа' });
            return;
        }
        const cycle = await (0, connection_1.default)('assessment_cycles')
            .where('id', id)
            .first();
        if (!cycle) {
            res.status(404).json({ error: 'Цикл оценки не найден' });
            return;
        }
        const participant = await (0, connection_1.default)('assessment_participants')
            .where('id', participantId)
            .where('cycle_id', id)
            .first();
        if (!participant) {
            res.status(404).json({ error: 'Участник не найден' });
            return;
        }
        if (cycle.status === 'active') {
            res.status(400).json({ error: 'Нельзя добавлять респондентов в активный цикл' });
            return;
        }
        const participantUser = await (0, connection_1.default)('users')
            .where('id', participant.user_id)
            .first();
        let allRespondentIds = [...respondentIds];
        if (participantUser?.manager_id && !allRespondentIds.includes(participantUser.manager_id)) {
            const manager = await (0, connection_1.default)('users')
                .where('id', participantUser.manager_id)
                .where('is_active', true)
                .first();
            if (manager) {
                allRespondentIds.push(participantUser.manager_id);
            }
        }
        const existingUsers = await (0, connection_1.default)('users')
            .whereIn('id', allRespondentIds)
            .where('is_active', true);
        if (existingUsers.length !== allRespondentIds.length) {
            res.status(400).json({ error: 'Один или несколько респондентов не найдены' });
            return;
        }
        const respondentData = allRespondentIds.map((respondentId) => {
            let respondentType = 'peer';
            if (respondentId === participant.user_id) {
                respondentType = 'self';
            }
            else if (respondentId === participantUser?.manager_id) {
                respondentType = 'manager';
            }
            return {
                participant_id: participantId,
                respondent_user_id: respondentId,
                respondent_type: respondentType,
                status: 'invited'
            };
        });
        await (0, connection_1.default)('assessment_respondents')
            .insert(respondentData)
            .onConflict(['participant_id', 'respondent_user_id'])
            .merge();
        let message = 'Респонденты успешно добавлены';
        if (participantUser?.manager_id && allRespondentIds.includes(participantUser.manager_id)) {
            const manager = existingUsers.find(u => u.id === participantUser.manager_id);
            if (manager) {
                message += `. Руководитель ${manager.first_name} ${manager.last_name} добавлен автоматически`;
            }
        }
        res.json({
            message,
            totalRespondents: allRespondentIds.length,
            managerAdded: participantUser?.manager_id && allRespondentIds.includes(participantUser.manager_id)
        });
    }
    catch (error) {
        console.error('Ошибка добавления респондентов:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});
router.post('/:id/start', auth_1.authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        const { id } = req.params;
        if (user?.role !== 'admin' && user?.role !== 'hr' && user?.role !== 'manager') {
            res.status(403).json({ error: 'Недостаточно прав доступа' });
            return;
        }
        const cycle = await (0, connection_1.default)('assessment_cycles')
            .where('id', id)
            .first();
        if (!cycle) {
            res.status(404).json({ error: 'Цикл оценки не найден' });
            return;
        }
        if (cycle.status === 'active') {
            res.status(400).json({ error: 'Цикл уже активен' });
            return;
        }
        const participantsCount = await (0, connection_1.default)('assessment_participants')
            .where('cycle_id', id)
            .count('id as count')
            .first();
        if (!participantsCount || participantsCount.count === 0) {
            res.status(400).json({ error: 'Нет участников для запуска цикла' });
            return;
        }
        await (0, connection_1.default)('assessment_cycles')
            .where('id', id)
            .update({
            status: 'active',
            start_date: connection_1.default.fn.now()
        });
        await (0, connection_1.default)('assessment_participants')
            .where('cycle_id', id)
            .update({ status: 'active' });
        await (0, connection_1.default)('assessment_respondents')
            .whereIn('participant_id', (0, connection_1.default)('assessment_participants')
            .where('cycle_id', id)
            .select('id'))
            .update({ status: 'active' });
        try {
            const participants = await (0, connection_1.default)('assessment_participants')
                .join('users', 'assessment_participants.user_id', 'users.id')
                .where('assessment_participants.cycle_id', id)
                .whereNotNull('users.mattermost_username')
                .select('users.mattermost_username', 'assessment_participants.id as participant_id');
            for (const participant of participants) {
                mattermost_1.default.requestRespondentSelection(participant.mattermost_username, cycle.name, participant.participant_id.toString(), 4).catch(error => {
                    console.error(`Ошибка отправки запроса участнику ${participant.mattermost_username}:`, error);
                });
            }
            const respondents = await (0, connection_1.default)('assessment_respondents')
                .join('assessment_participants', 'assessment_respondents.participant_id', 'assessment_participants.id')
                .join('users as respondent_users', 'assessment_respondents.respondent_id', 'respondent_users.id')
                .join('users as participant_users', 'assessment_participants.user_id', 'participant_users.id')
                .where('assessment_participants.cycle_id', id)
                .whereNotNull('respondent_users.mattermost_username')
                .select('assessment_respondents.id as respondent_id', 'respondent_users.mattermost_username as respondent_username', 'participant_users.first_name as participant_first_name', 'participant_users.last_name as participant_last_name');
            for (const respondent of respondents) {
                const participantName = `${respondent.participant_first_name} ${respondent.participant_last_name}`;
                mattermost_1.default.notifyRespondentAssessment(respondent.respondent_username, participantName, cycle.title, respondent.respondent_id).catch(error => {
                    console.error(`Ошибка отправки уведомления респонденту ${respondent.respondent_username}:`, error);
                });
            }
            console.log(`Уведомления отправлены для цикла "${cycle.title}": ${participants.length} участников, ${respondents.length} респондентов`);
        }
        catch (error) {
            console.error('Ошибка отправки уведомлений Mattermost:', error);
        }
        res.json({ message: 'Цикл оценки успешно запущен' });
    }
    catch (error) {
        console.error('Ошибка запуска цикла оценки:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});
router.delete('/:id/participants/:participantId', auth_1.authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        const { id, participantId } = req.params;
        if (user?.role !== 'admin' && user?.role !== 'hr' && user?.role !== 'manager') {
            res.status(403).json({ error: 'Недостаточно прав доступа' });
            return;
        }
        const cycle = await (0, connection_1.default)('assessment_cycles')
            .where('id', id)
            .first();
        if (!cycle) {
            res.status(404).json({ error: 'Цикл оценки не найден' });
            return;
        }
        if (cycle.status === 'active') {
            res.status(400).json({ error: 'Нельзя удалять участников из активного цикла' });
            return;
        }
        await (0, connection_1.default)('assessment_respondents')
            .where('participant_id', participantId)
            .del();
        await (0, connection_1.default)('assessment_participants')
            .where('id', participantId)
            .where('cycle_id', id)
            .del();
        res.json({ message: 'Участник успешно удален' });
    }
    catch (error) {
        console.error('Ошибка удаления участника:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});
exports.default = router;
//# sourceMappingURL=cycles.js.map