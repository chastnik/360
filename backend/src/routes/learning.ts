// © 2025 Бит.Цифра - Стас Чашин

import express from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import knex from '../database/connection';
import { calculateEndDate } from '../services/calendar';

const router = express.Router();

// Получить пользователей для создания планов роста
router.get('/users', authenticateToken, async (req: AuthRequest, res) => {
  try {
    // Только админы и HR могут видеть всех пользователей, остальные только себя
    let users;
    if (req.user?.role === 'admin' || req.user?.role === 'hr') {
      users = await knex('users')
        .select('id', 'email', 'first_name', 'last_name', 'middle_name', 'position', 'old_department as department')
        .where('is_active', true)
        .orderBy('last_name', 'first_name');
    } else {
      users = await knex('users')
        .select('id', 'email', 'first_name', 'last_name', 'middle_name', 'position', 'old_department as department')
        .where({ id: req.user?.userId, is_active: true });
    }
    
    return res.json(users);
  } catch (error) {
    console.error('Error fetching users for growth plans:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Получить компетенции для learning модуля
router.get('/competencies', authenticateToken, async (req: AuthRequest, res) => {
  try {
    // Только админы и HR могут работать с компетенциями
    if (req.user?.role !== 'admin' && req.user?.role !== 'hr') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const competencies = await knex('competencies')
      .select('*')
      .where('is_active', true)
      .orderBy('name');
    
    return res.json(competencies);
  } catch (error) {
    console.error('Error fetching competencies:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Получить все курсы
router.get('/courses', authenticateToken, async (req, res) => {
  try {
    const { competency_id, search } = req.query;
    
    // Проверяем, существует ли колонка competency_id
    const hasCompetencyColumn = await knex.schema.hasColumn('training_courses', 'competency_id');
    
    let query;
    if (hasCompetencyColumn) {
      // Если колонка существует, используем JOIN
      query = knex('training_courses')
        .leftJoin('competencies as c', 'training_courses.competency_id', 'c.id')
        .select(
          'training_courses.*',
          'c.id as competency_id',
          'c.name as competency_name',
          'c.description as competency_description'
        )
        .where('training_courses.is_active', true);
    } else {
      // Если колонка не существует, получаем курсы без JOIN
      query = knex('training_courses')
        .select('*')
        .where('is_active', true);
    }
    
    // Фильтр по компетенции
    if (hasCompetencyColumn && competency_id) {
      const competencyIdStr = String(competency_id).trim();
      if (competencyIdStr && competencyIdStr !== '' && competencyIdStr !== 'null') {
        console.log('Filtering by competency_id:', competencyIdStr);
        query = query.where('training_courses.competency_id', competencyIdStr);
      }
    } else if (hasCompetencyColumn && competency_id === '') {
      // Если выбрано "Все компетенции", не фильтруем
      console.log('No competency filter applied');
    } else if (!hasCompetencyColumn && competency_id) {
      console.log('Warning: competency_id column does not exist, filter ignored');
    }
    
    // Поиск (полнотекстовый) по названию и описанию
    if (search && typeof search === 'string') {
      const searchTerm = `%${search.trim()}%`;
      query = query.where(function() {
        if (hasCompetencyColumn) {
          this.where('training_courses.name', 'ilike', searchTerm)
            .orWhere('training_courses.description', 'ilike', searchTerm);
        } else {
          this.where('name', 'ilike', searchTerm)
            .orWhere('description', 'ilike', searchTerm);
        }
      });
    }
    
    // Сортировка
    if (hasCompetencyColumn) {
      query = query.orderBy('training_courses.name');
    } else {
      query = query.orderBy('name');
    }
    
    const courses = await query;
    
    // Добавляем информацию о связях для каждого курса
    for (const course of courses) {
      // Получаем prerequisites (курсы, которые нужно пройти до этого)
      const prerequisites = await knex('course_prerequisites as cp')
        .join('training_courses as tc', 'cp.prerequisite_id', 'tc.id')
        .select('tc.id', 'tc.name', 'tc.target_level')
        .where('cp.course_id', course.id);
      
      // Получаем corequisites (курсы, которые нужно проходить параллельно)
      const corequisites = await knex('course_corequisites as cc')
        .join('training_courses as tc', 'cc.corequisite_id', 'tc.id')
        .select('tc.id', 'tc.name', 'tc.target_level')
        .where('cc.course_id', course.id);
      
      course.prerequisites = prerequisites;
      course.corequisites = corequisites;
      
      // Формируем объект компетенции, если она есть
      if (hasCompetencyColumn && course.competency_id) {
        course.competency = {
          id: course.competency_id,
          name: course.competency_name,
          description: course.competency_description
        };
      }
      
      // Удаляем промежуточные поля
      if (hasCompetencyColumn) {
        delete course.competency_id;
        delete course.competency_name;
        delete course.competency_description;
      }
    }
    
    return res.json(courses);
  } catch (error) {
    console.error('Error fetching courses:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Получить курс по ID
router.get('/courses/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Проверяем, существует ли колонка competency_id
    const hasCompetencyColumn = await knex.schema.hasColumn('training_courses', 'competency_id');
    
    let course;
    if (hasCompetencyColumn) {
      // Если колонка существует, используем JOIN
      course = await knex('training_courses')
        .leftJoin('competencies as c', 'training_courses.competency_id', 'c.id')
        .select(
          'training_courses.*',
          'c.id as competency_id',
          'c.name as competency_name',
          'c.description as competency_description'
        )
        .where('training_courses.id', id)
        .first();
    } else {
      // Если колонка не существует, получаем курс без JOIN
      course = await knex('training_courses')
        .select('*')
        .where('id', id)
        .first();
    }
    
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
    
    // Формируем объект компетенции, если она есть
    let competency = null;
    if (hasCompetencyColumn && course.competency_id) {
      competency = {
        id: course.competency_id,
        name: course.competency_name,
        description: course.competency_description
      };
    }
    
    // Удаляем промежуточные поля
    if (hasCompetencyColumn) {
      delete course.competency_id;
      delete course.competency_name;
      delete course.competency_description;
    }
    
    return res.json({
      ...course,
      competency,
      prerequisites,
      corequisites
    });
  } catch (error) {
    console.error('Error fetching course:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Создать новый курс
router.post('/courses', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { name, description, hours, target_level, system_id, competency_id, prerequisites, corequisites } = req.body;
    
    // Проверяем права доступа
    if (req.user?.role !== 'admin' && req.user?.role !== 'hr') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Проверяем, существует ли колонка competency_id
    const hasCompetencyColumn = await knex.schema.hasColumn('training_courses', 'competency_id');
    
    const insertData: any = {
      name,
      description,
      hours,
      target_level,
      system_id,
      is_active: true
    };
    
    // Добавляем competency_id только если колонка существует
    if (hasCompetencyColumn) {
      insertData.competency_id = competency_id || null;
    }
    
    const [course] = await knex('training_courses')
      .insert(insertData)
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
    
    return res.status(201).json(course);
  } catch (error) {
    console.error('Error creating course:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Обновить курс
router.put('/courses/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { name, description, hours, target_level, system_id, competency_id, is_active, prerequisites, corequisites } = req.body;
    
    console.log('Updating course:', id, 'competency_id:', competency_id);
    
    // Проверяем права доступа
    if (req.user?.role !== 'admin' && req.user?.role !== 'hr') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Проверяем, существует ли колонка competency_id
    const hasCompetencyColumn = await knex.schema.hasColumn('training_courses', 'competency_id');
    console.log('Has competency column:', hasCompetencyColumn);
    
    const updateData: any = {
      name,
      description,
      hours,
      target_level,
      system_id,
      is_active
    };
    
    // Добавляем competency_id только если колонка существует
    if (hasCompetencyColumn) {
      // Если competency_id передана и не пустая строка, используем её, иначе null
      if (competency_id !== undefined && competency_id !== null && competency_id !== '') {
        updateData.competency_id = String(competency_id).trim() || null;
      } else {
        updateData.competency_id = null;
      }
      console.log('Setting competency_id to:', updateData.competency_id);
    }
    
    const [course] = await knex('training_courses')
      .where('id', id)
      .update(updateData)
      .returning('*');
    
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    console.log('Updated course competency_id:', course.competency_id);
    
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
    
    // Получаем обновленный курс с компетенцией для ответа
    let updatedCourse = course;
    
    if (hasCompetencyColumn) {
      const courseWithCompetency = await knex('training_courses')
        .leftJoin('competencies as c', 'training_courses.competency_id', 'c.id')
        .select(
          'training_courses.*',
          'c.id as competency_id',
          'c.name as competency_name',
          'c.description as competency_description'
        )
        .where('training_courses.id', id)
        .first();
      
      if (courseWithCompetency) {
        // Формируем объект компетенции, если она есть
        if (courseWithCompetency.competency_id) {
          updatedCourse = {
            ...courseWithCompetency,
            competency: {
              id: courseWithCompetency.competency_id,
              name: courseWithCompetency.competency_name,
              description: courseWithCompetency.competency_description
            }
          };
          delete updatedCourse.competency_id;
          delete updatedCourse.competency_name;
          delete updatedCourse.competency_description;
        } else {
          updatedCourse = courseWithCompetency;
          delete updatedCourse.competency_id;
          delete updatedCourse.competency_name;
          delete updatedCourse.competency_description;
        }
      }
    }
    
    return res.json(updatedCourse);
  } catch (error) {
    console.error('Error updating course:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Удалить курс
router.delete('/courses/:id', authenticateToken, async (req: AuthRequest, res) => {
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
    
    return res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Error deleting course:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Получить планы роста
router.get('/growth-plans', authenticateToken, async (req: AuthRequest, res) => {
  try {
    // Админы и HR видят все планы, обычные пользователи только свои
    let plansQuery = knex('growth_plans as gp')
      .join('users as u', 'gp.user_id', 'u.id')
      .select('gp.*', 'u.first_name', 'u.last_name', 'u.email');
    
    if (req.user?.role !== 'admin' && req.user?.role !== 'hr') {
      plansQuery = plansQuery.where('gp.user_id', req.user?.userId);
    }
    
    const plans = await plansQuery.orderBy('gp.created_at', 'desc');
    
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
    
    return res.json(plans);
  } catch (error) {
    console.error('Error fetching growth plans:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Создать план роста
router.post('/growth-plans', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { user_id, start_date, study_load_percent, courses, courseSelections } = req.body;
    
    // Проверяем права доступа - только админы и HR могут создавать планы для других пользователей
    const targetUserId = user_id || req.user?.userId;
    if (user_id && user_id !== req.user?.userId && req.user?.role !== 'admin' && req.user?.role !== 'hr') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const [plan] = await knex('growth_plans')
      .insert({
        user_id: targetUserId,
        start_date,
        study_load_percent,
        status: 'active'
      })
      .returning('*');
    
    // Получаем ID курсов для расчета общей нагрузки
    const courseIds: number[] = [];
    if (courseSelections && Object.keys(courseSelections).length > 0) {
      courseIds.push(...Object.keys(courseSelections).map(id => parseInt(id)));
    } else if (courses && courses.length > 0) {
      courseIds.push(...courses);
    }
    
    // Рассчитываем дату завершения на основе календаря
    let endDate: Date | null = null;
    if (courseIds.length > 0) {
      // Получаем общее количество часов курсов
      const courseHours = await knex('training_courses')
        .whereIn('id', courseIds)
        .sum('hours as total_hours')
        .first();
      
      const totalHours = Number(courseHours?.total_hours || 0);
      
      if (totalHours > 0 && start_date && study_load_percent) {
        const startDateObj = new Date(start_date);
        endDate = await calculateEndDate(startDateObj, study_load_percent, totalHours, targetUserId);
        
        // Обновляем план с рассчитанной датой завершения
        if (endDate) {
          await knex('growth_plans')
            .where('id', plan.id)
            .update({ end_date: endDate.toISOString().split('T')[0] });
          plan.end_date = endDate.toISOString().split('T')[0];
        }
      }
    }
    
    // Добавляем курсы к плану с расширенной информацией
    if (courseSelections && Object.keys(courseSelections).length > 0) {
      const courseData = Object.entries(courseSelections).map(([courseId, selection]: [string, any]) => ({
        growth_plan_id: plan.id,
        course_id: parseInt(courseId),
        status: selection.status || 'planned',
        is_required: selection.isRequired !== false,
        added_automatically: selection.addedAutomatically || false,
        completion_date: selection.status === 'completed' ? new Date() : null
      }));
      await knex('growth_plan_courses').insert(courseData);
    } else if (courses && courses.length > 0) {
      // Fallback для старого формата
      const courseData = courses.map((courseId: number) => ({
        growth_plan_id: plan.id,
        course_id: courseId,
        status: 'planned',
        is_required: true,
        added_automatically: false
      }));
      await knex('growth_plan_courses').insert(courseData);
    }
    
    return res.status(201).json(plan);
  } catch (error) {
    console.error('Error creating growth plan:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Обновить план роста
router.put('/growth-plans/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { start_date, study_load_percent, status, courses } = req.body;
    const userId = req.user?.userId;
    
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
    
    // Пересчитываем дату завершения при изменении параметров
    if (start_date && study_load_percent && courses && courses.length > 0) {
      const courseHours = await knex('training_courses')
        .whereIn('id', courses)
        .sum('hours as total_hours')
        .first();
      
      const totalHours = Number(courseHours?.total_hours || 0);
      
      if (totalHours > 0) {
        const startDateObj = new Date(start_date);
        // Получаем user_id из существующего плана
        const existingPlan = await knex('growth_plans').where('id', id).first();
        const userId = existingPlan?.user_id;
        const endDate = await calculateEndDate(startDateObj, study_load_percent, totalHours, userId);
        
        if (endDate) {
          await knex('growth_plans')
            .where('id', id)
            .update({ end_date: endDate.toISOString().split('T')[0] });
          plan.end_date = endDate.toISOString().split('T')[0];
        }
      }
    }
    
    // Получаем обновленный план
    const updatedPlan = await knex('growth_plans').where('id', id).first();
    return res.json(updatedPlan || plan);
  } catch (error) {
    console.error('Error updating growth plan:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Добавить результат тестирования
router.post('/test-results', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { growth_plan_id, course_id, status, test_date, notes } = req.body;
    const userId = req.user?.userId;
    
    // Проверяем, что план существует и пользователь имеет к нему доступ
    let planQuery = knex('growth_plans').where('id', growth_plan_id);
    
    // Обычные пользователи могут добавлять результаты только к своим планам
    if (req.user?.role !== 'admin' && req.user?.role !== 'hr') {
      planQuery = planQuery.where('user_id', userId);
    }
    
    const plan = await planQuery.first();
    
    if (!plan) {
      return res.status(404).json({ error: 'Growth plan not found' });
    }
    
    // Проверяем, есть ли уже результат теста для этого курса
    const existingTest = await knex('test_results')
      .where('growth_plan_id', growth_plan_id)
      .where('course_id', course_id)
      .first();
    
    if (existingTest) {
      // Обновляем существующий результат
      const [updatedTest] = await knex('test_results')
        .where('id', existingTest.id)
        .update({
          status,
          test_date,
          notes,
          updated_at: knex.fn.now()
        })
        .returning('*');
      
      return res.json(updatedTest);
    } else {
      // Создаем новый результат
      const [testResult] = await knex('test_results')
        .insert({
          growth_plan_id,
          course_id,
          status,
          test_date,
          notes
        })
        .returning('*');
      
      return res.status(201).json(testResult);
    }
  } catch (error) {
    console.error('Error creating test result:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Удалить результат тестирования (для пересдачи)
router.delete('/test-results/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    
    // Получаем результат теста
    const testResult = await knex('test_results')
      .where('id', id)
      .first();
    
    if (!testResult) {
      return res.status(404).json({ error: 'Test result not found' });
    }
    
    // Проверяем доступ к плану
    let planQuery = knex('growth_plans').where('id', testResult.growth_plan_id);
    
    // Обычные пользователи могут удалять результаты только своих планов
    if (req.user?.role !== 'admin' && req.user?.role !== 'hr') {
      planQuery = planQuery.where('user_id', userId);
    }
    
    const plan = await planQuery.first();
    
    if (!plan) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Удаляем результат теста
    await knex('test_results')
      .where('id', id)
      .delete();
    
    return res.json({ success: true, message: 'Test result deleted' });
  } catch (error) {
    console.error('Error deleting test result:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Получить матрицу компетенций пользователя
router.get('/competence-matrix', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const matrix = await knex('competence_matrix')
      .join('competencies', 'competence_matrix.competency_id', 'competencies.id')
      .where('competence_matrix.user_id', userId)
      .select(
        'competence_matrix.id',
        'competence_matrix.competency_id',
        'competence_matrix.user_id',
        'competence_matrix.level',
        'competence_matrix.score',
        'competence_matrix.assessment_date',
        'competence_matrix.notes',
        'competence_matrix.created_at',
        'competence_matrix.updated_at',
        'competencies.name as competency_name',
        'competencies.description as competency_description'
      )
      .orderBy('competencies.name');
    
    return res.json(matrix);
  } catch (error) {
    console.error('Error fetching competence matrix:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Получить матрицу компетенций всех пользователей
router.get('/competence-matrix/all', authenticateToken, async (req: AuthRequest, res) => {
  try {
    // Проверяем права доступа - только админы и HR могут видеть матрицу всех пользователей
    if (req.user?.role !== 'admin' && req.user?.role !== 'hr') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const matrix = await knex('competence_matrix')
      .join('competencies', 'competence_matrix.competency_id', 'competencies.id')
      .join('users', 'competence_matrix.user_id', 'users.id')
      .where('users.is_active', true)
      .select(
        'competence_matrix.id',
        'competence_matrix.competency_id',
        'competence_matrix.user_id',
        'competence_matrix.level',
        'competence_matrix.score',
        'competence_matrix.assessment_date',
        'competence_matrix.notes',
        'competence_matrix.created_at',
        'competence_matrix.updated_at',
        'competencies.name as competency_name',
        'competencies.description as competency_description',
        'users.id as user_id',
        'users.first_name',
        'users.last_name',
        'users.email',
        'users.position',
        'users.old_department as department'
      )
      .orderBy('users.last_name', 'users.first_name')
      .orderBy('competencies.name');
    
    return res.json(matrix);
  } catch (error) {
    console.error('Error fetching all users competence matrix:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Обновить матрицу компетенций
router.post('/competence-matrix', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { competency_id, user_id, level, score, assessment_date, notes } = req.body;
    
    // Проверяем права доступа
    if (req.user?.role !== 'admin' && req.user?.role !== 'hr') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Используем переданный user_id или текущего пользователя
    const targetUserId = user_id || req.user?.userId;
    
    const [matrix] = await knex('competence_matrix')
      .insert({
        user_id: targetUserId,
        competency_id,
        level,
        score,
        assessment_date,
        notes
      })
      .onConflict(['user_id', 'competency_id'])
      .merge()
      .returning('*');
    
    return res.status(201).json(matrix);
  } catch (error) {
    console.error('Error updating competence matrix:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Получить график обучения (все планы роста)
router.get('/training-schedule', authenticateToken, async (req: AuthRequest, res) => {
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
    
    return res.json(schedule);
  } catch (error) {
    console.error('Error fetching training schedule:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
