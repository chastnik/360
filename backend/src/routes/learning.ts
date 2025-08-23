import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { knex } from '../database/connection';

const router = express.Router();

// Получить все курсы
router.get('/courses', authenticateToken, async (req, res) => {
  try {
    const courses = await knex('training_courses')
      .select('*')
      .where('is_active', true)
      .orderBy('name');
    
    res.json(courses);
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Получить курс по ID
router.get('/courses/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const course = await knex('training_courses')
      .select('*')
      .where('id', id)
      .first();
    
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    // Получаем prerequisites
    const prerequisites = await knex('course_prerequisites as cp')
      .join('training_courses as tc', 'cp.prerequisite_id', 'tc.id')
      .select('tc.*')
      .where('cp.course_id', id);
    
    // Получаем corequisites
    const corequisites = await knex('course_corequisites as cc')
      .join('training_courses as tc', 'cc.corequisite_id', 'tc.id')
      .select('tc.*')
      .where('cc.course_id', id);
    
    res.json({
      ...course,
      prerequisites,
      corequisites
    });
  } catch (error) {
    console.error('Error fetching course:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Создать новый курс
router.post('/courses', authenticateToken, async (req, res) => {
  try {
    const { name, description, hours, target_level, system_id, prerequisites, corequisites } = req.body;
    
    // Проверяем права доступа
    if (req.user?.role !== 'admin' && req.user?.role !== 'hr') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const [course] = await knex('training_courses')
      .insert({
        name,
        description,
        hours,
        target_level,
        system_id,
        is_active: true
      })
      .returning('*');
    
    // Добавляем prerequisites
    if (prerequisites && prerequisites.length > 0) {
      const prereqData = prerequisites.map((prereqId: number) => ({
        course_id: course.id,
        prerequisite_id: prereqId
      }));
      await knex('course_prerequisites').insert(prereqData);
    }
    
    // Добавляем corequisites
    if (corequisites && corequisites.length > 0) {
      const coreqData = corequisites.map((coreqId: number) => ({
        course_id: course.id,
        corequisite_id: coreqId
      }));
      await knex('course_corequisites').insert(coreqData);
    }
    
    res.status(201).json(course);
  } catch (error) {
    console.error('Error creating course:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Обновить курс
router.put('/courses/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, hours, target_level, system_id, is_active, prerequisites, corequisites } = req.body;
    
    // Проверяем права доступа
    if (req.user?.role !== 'admin' && req.user?.role !== 'hr') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const [course] = await knex('training_courses')
      .where('id', id)
      .update({
        name,
        description,
        hours,
        target_level,
        system_id,
        is_active
      })
      .returning('*');
    
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    // Обновляем prerequisites
    await knex('course_prerequisites').where('course_id', id).del();
    if (prerequisites && prerequisites.length > 0) {
      const prereqData = prerequisites.map((prereqId: number) => ({
        course_id: id,
        prerequisite_id: prereqId
      }));
      await knex('course_prerequisites').insert(prereqData);
    }
    
    // Обновляем corequisites
    await knex('course_corequisites').where('course_id', id).del();
    if (corequisites && corequisites.length > 0) {
      const coreqData = corequisites.map((coreqId: number) => ({
        course_id: id,
        corequisite_id: coreqId
      }));
      await knex('course_corequisites').insert(coreqData);
    }
    
    res.json(course);
  } catch (error) {
    console.error('Error updating course:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Удалить курс
router.delete('/courses/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Проверяем права доступа
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const deleted = await knex('training_courses')
      .where('id', id)
      .del();
    
    if (!deleted) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Получить планы роста пользователя
router.get('/growth-plans', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    
    const plans = await knex('growth_plans as gp')
      .select('gp.*')
      .where('gp.user_id', userId)
      .orderBy('gp.created_at', 'desc');
    
    // Получаем курсы для каждого плана
    for (const plan of plans) {
      const courses = await knex('growth_plan_courses as gpc')
        .join('training_courses as tc', 'gpc.course_id', 'tc.id')
        .select('tc.*')
        .where('gpc.growth_plan_id', plan.id);
      
      plan.courses = courses;
      
      // Получаем результаты тестирования
      const testResults = await knex('test_results as tr')
        .join('training_courses as tc', 'tr.course_id', 'tc.id')
        .select('tr.*', 'tc.name as course_name')
        .where('tr.growth_plan_id', plan.id);
      
      plan.test_results = testResults;
    }
    
    res.json(plans);
  } catch (error) {
    console.error('Error fetching growth plans:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Создать план роста
router.post('/growth-plans', authenticateToken, async (req, res) => {
  try {
    const { start_date, study_load_percent, courses } = req.body;
    const userId = req.user?.id;
    
    const [plan] = await knex('growth_plans')
      .insert({
        user_id: userId,
        start_date,
        study_load_percent,
        status: 'active'
      })
      .returning('*');
    
    // Добавляем курсы к плану
    if (courses && courses.length > 0) {
      const courseData = courses.map((courseId: number) => ({
        growth_plan_id: plan.id,
        course_id: courseId
      }));
      await knex('growth_plan_courses').insert(courseData);
    }
    
    res.status(201).json(plan);
  } catch (error) {
    console.error('Error creating growth plan:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Обновить план роста
router.put('/growth-plans/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { start_date, study_load_percent, status, courses } = req.body;
    const userId = req.user?.id;
    
    // Проверяем, что план принадлежит пользователю
    const existingPlan = await knex('growth_plans')
      .where({ id, user_id: userId })
      .first();
    
    if (!existingPlan) {
      return res.status(404).json({ error: 'Growth plan not found' });
    }
    
    const [plan] = await knex('growth_plans')
      .where('id', id)
      .update({
        start_date,
        study_load_percent,
        status
      })
      .returning('*');
    
    // Обновляем курсы
    await knex('growth_plan_courses').where('growth_plan_id', id).del();
    if (courses && courses.length > 0) {
      const courseData = courses.map((courseId: number) => ({
        growth_plan_id: id,
        course_id: courseId
      }));
      await knex('growth_plan_courses').insert(courseData);
    }
    
    res.json(plan);
  } catch (error) {
    console.error('Error updating growth plan:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Добавить результат тестирования
router.post('/test-results', authenticateToken, async (req, res) => {
  try {
    const { growth_plan_id, course_id, status, test_date, notes } = req.body;
    const userId = req.user?.id;
    
    // Проверяем, что план принадлежит пользователю
    const plan = await knex('growth_plans')
      .where({ id: growth_plan_id, user_id: userId })
      .first();
    
    if (!plan) {
      return res.status(404).json({ error: 'Growth plan not found' });
    }
    
    const [testResult] = await knex('test_results')
      .insert({
        growth_plan_id,
        course_id,
        status,
        test_date,
        notes
      })
      .returning('*');
    
    res.status(201).json(testResult);
  } catch (error) {
    console.error('Error creating test result:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Получить матрицу компетенций пользователя
router.get('/competence-matrix', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    
    const matrix = await knex('competence_matrix as cm')
      .join('competencies as c', 'cm.competency_id', 'c.id')
      .select('cm.*', 'c.name as competency_name', 'c.description as competency_description')
      .where('cm.user_id', userId)
      .orderBy('c.name');
    
    res.json(matrix);
  } catch (error) {
    console.error('Error fetching competence matrix:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Обновить матрицу компетенций
router.post('/competence-matrix', authenticateToken, async (req, res) => {
  try {
    const { competency_id, level, score, assessment_date, notes } = req.body;
    const userId = req.user?.id;
    
    // Проверяем права доступа
    if (req.user?.role !== 'admin' && req.user?.role !== 'hr') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const [matrix] = await knex('competence_matrix')
      .insert({
        user_id: userId,
        competency_id,
        level,
        score,
        assessment_date,
        notes
      })
      .onConflict(['user_id', 'competency_id'])
      .merge()
      .returning('*');
    
    res.status(201).json(matrix);
  } catch (error) {
    console.error('Error updating competence matrix:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Получить график обучения (все планы роста)
router.get('/training-schedule', authenticateToken, async (req, res) => {
  try {
    // Проверяем права доступа
    if (req.user?.role !== 'admin' && req.user?.role !== 'hr') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const schedule = await knex('growth_plans as gp')
      .join('users as u', 'gp.user_id', 'u.id')
      .select(
        'gp.*',
        'u.first_name',
        'u.last_name',
        'u.email'
      )
      .orderBy('gp.start_date', 'desc');
    
    // Получаем курсы для каждого плана
    for (const plan of schedule) {
      const courses = await knex('growth_plan_courses as gpc')
        .join('training_courses as tc', 'gpc.course_id', 'tc.id')
        .select('tc.*')
        .where('gpc.growth_plan_id', plan.id);
      
      plan.courses = courses;
      
      // Получаем результаты тестирования
      const testResults = await knex('test_results as tr')
        .join('training_courses as tc', 'tr.course_id', 'tc.id')
        .select('tr.*', 'tc.name as course_name')
        .where('tr.growth_plan_id', plan.id);
      
      plan.test_results = testResults;
    }
    
    res.json(schedule);
  } catch (error) {
    console.error('Error fetching training schedule:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
