// © 2025 Бит.Цифра - Стас Чашин

import express from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import knex from '../database/connection';
import { calculateEndDate } from '../services/calendar';
import multer from 'multer';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB для сертификатов

// Получить пользователей для создания планов роста
router.get('/users', authenticateToken, async (_req: AuthRequest, res) => {
  try {
    // Все авторизованные пользователи могут видеть всех активных пользователей
    // Это нужно для матрицы компетенций и других функций
    const users = await knex('users')
      .select('id', 'email', 'first_name', 'last_name', 'middle_name', 'position', 'old_department as department')
      .where('is_active', true)
      .orderBy('last_name', 'first_name');
    
    return res.json(users);
  } catch (error) {
    console.error('Error fetching users for growth plans:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Получить компетенции для learning модуля
router.get('/competencies', authenticateToken, async (_req: AuthRequest, res) => {
  try {
    // Все авторизованные пользователи могут просматривать компетенции
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
    // Проверяем, нужны ли все планы (для матрицы компетенций)
    const allPlans = req.query.all === 'true';
    
    // Параметры пагинации (только если не запрошены все планы)
    const page = allPlans ? 1 : (parseInt(req.query.page as string) || 1);
    const limit = allPlans ? 999999 : (parseInt(req.query.limit as string) || 20);
    const offset = (page - 1) * limit;
    
    // Параметры фильтров
    const search = req.query.search as string;
    const status = req.query.status as string;
    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;
    const userId = req.query.userId as string;
    
    // Админы и HR видят все планы, обычные пользователи только свои
    // Но если запрошены все планы (для матрицы компетенций), показываем все
    let plansQuery = knex('growth_plans as gp')
      .join('users as u', 'gp.user_id', 'u.id')
      .select('gp.*', 'u.first_name', 'u.last_name', 'u.email', 'u.position', 'u.old_department as department');
    
    if (!allPlans && req.user?.role !== 'admin' && req.user?.role !== 'hr') {
      plansQuery = plansQuery.where('gp.user_id', req.user?.userId);
    }
    
    // Применяем фильтры (только если не запрошены все планы)
    if (!allPlans) {
      if (search) {
        plansQuery = plansQuery.where(function() {
          this.where('u.first_name', 'ilike', `%${search}%`)
            .orWhere('u.last_name', 'ilike', `%${search}%`)
            .orWhere('u.email', 'ilike', `%${search}%`)
            .orWhere('u.position', 'ilike', `%${search}%`)
            .orWhere('u.old_department', 'ilike', `%${search}%`);
        });
      }
      
      if (status && status !== 'all') {
        plansQuery = plansQuery.where('gp.status', status);
      }
      
      if (dateFrom) {
        plansQuery = plansQuery.where('gp.start_date', '>=', dateFrom);
      }
      
      if (dateTo) {
        plansQuery = plansQuery.where('gp.start_date', '<=', dateTo);
      }
      
      if (userId) {
        plansQuery = plansQuery.where('gp.user_id', userId);
      }
    }
    
    // Получаем общее количество планов для пагинации (только если не запрошены все планы)
    let total = 0;
    if (!allPlans) {
      const countQuery = plansQuery.clone().clearSelect().clearOrder().count('* as count').first();
      const totalCount = await countQuery;
      total = Number(totalCount?.count || 0);
    }
    
    // Применяем пагинацию и сортировку
    const plans = await plansQuery
      .orderBy('gp.created_at', 'desc')
      .limit(limit)
      .offset(offset);
    
    // Если запрошены все планы, устанавливаем total равным количеству планов
    if (allPlans) {
      total = plans.length;
    }
    
    // Получаем курсы для каждого плана и пересчитываем дату завершения
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
      
      // Получаем сертификаты для каждого результата теста
      for (const testResult of testResults) {
        const certificates = await knex('certificates')
          .where('test_result_id', testResult.id)
          .select('id', 'name', 'file_name', 'file_size', 'file_mime', 'created_at')
          .orderBy('created_at', 'desc');
        testResult.certificates = certificates;
      }
      
      plan.test_results = testResults;
      
      // Проверяем, все ли курсы пройдены, и обновляем статус ПИРа
      // Курс считается завершенным, если есть хотя бы один успешный результат (passed)
      if (plan.status === 'active' && courses.length > 0 && testResults.length > 0) {
        const passedCourseIds = new Set(testResults
          .filter((tr: any) => tr.status === 'passed')
          .map((tr: any) => tr.course_id));
        
        const allCoursesPassed = courses.every((course: any) => passedCourseIds.has(course.id));
        
        if (allCoursesPassed) {
          // Все курсы пройдены - обновляем статус на completed
          await knex('growth_plans')
            .where('id', plan.id)
            .update({ status: 'completed' });
          plan.status = 'completed';
        }
      }
      
      // Пересчитываем дату завершения для активных планов
      if (plan.status === 'active' && courses.length > 0 && plan.start_date && plan.study_load_percent) {
        try {
          // Получаем общее количество часов курсов
          const courseHours = await knex('training_courses')
            .whereIn('id', courses.map((c: any) => c.id))
            .sum('hours as total_hours')
            .first();
          
          const totalHours = Number(courseHours?.total_hours || 0);
          
          if (totalHours > 0) {
            const startDateObj = new Date(plan.start_date);
            const recalculatedEndDate = await calculateEndDate(
              startDateObj,
              plan.study_load_percent,
              totalHours,
              plan.user_id
            );
            
            if (recalculatedEndDate) {
              const newEndDate = recalculatedEndDate.toISOString().split('T')[0];
              // Обновляем дату завершения, если она изменилась или не была установлена
              if (!plan.end_date || plan.end_date !== newEndDate) {
                await knex('growth_plans')
                  .where('id', plan.id)
                  .update({ end_date: newEndDate });
                plan.end_date = newEndDate;
              }
            }
          }
        } catch (recalcError) {
          console.error(`Ошибка пересчета даты завершения для ПИР ${plan.id}:`, recalcError);
          // Продолжаем работу, даже если пересчет не удался
        }
      }
    }
    
    // Если запрошены все планы (для матрицы компетенций), возвращаем массив
    if (allPlans) {
      return res.json(plans);
    }
    
    // Иначе возвращаем объект с пагинацией
    return res.json({
      plans,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
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
    
    // Всегда создаем новый результат тестирования (для истории)
    // Старые результаты не удаляются
    try {
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
    } catch (insertError: any) {
      // Если ошибка из-за unique constraint, пытаемся удалить его и повторить
      if (insertError.code === '23505' && insertError.constraint === 'test_results_growth_plan_id_course_id_unique') {
        try {
          // Удаляем constraint, если он еще существует
          await knex.raw(`
            ALTER TABLE test_results 
            DROP CONSTRAINT IF EXISTS test_results_growth_plan_id_course_id_unique;
          `);
          
          // Повторяем вставку
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
        } catch (retryError) {
          console.error('Error creating test result after removing constraint:', retryError);
          return res.status(500).json({ error: 'Internal server error' });
        }
      }
      throw insertError;
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
      .join('users', 'competence_matrix.user_id', 'users.id')
      .where('competence_matrix.user_id', userId)
      .select(
        'competence_matrix.id',
        'competence_matrix.competency_id',
        'competence_matrix.user_id',
        'competence_matrix.level',
        'competence_matrix.score',
        'competence_matrix.assessment_date',
        'competence_matrix.notes',
        'competence_matrix.source',
        'competence_matrix.created_at',
        'competence_matrix.updated_at',
        'competencies.name as competency_name',
        'competencies.description as competency_description',
        'users.first_name',
        'users.last_name',
        'users.email',
        'users.position',
        'users.old_department as department'
      )
      .orderBy('competencies.name');
    
    // Получаем сертификаты для каждой компетенции
    for (const entry of matrix) {
      // Сертификаты, привязанные напрямую к компетенции (ручной ввод)
      const directCertificates = await knex('certificates')
        .where('competence_matrix_id', entry.id)
        .select('id', 'name', 'file_name', 'file_size', 'file_mime', 'created_at')
        .orderBy('created_at', 'desc');
      
      // Сертификаты из результатов тестов
      // Находим все результаты тестов пользователя с сертификатами
      const testResultsWithCerts = await knex('test_results as tr')
        .join('growth_plans as gp', 'tr.growth_plan_id', 'gp.id')
        .join('training_courses as tc', 'tr.course_id', 'tc.id')
        .join('certificates as c', 'c.test_result_id', 'tr.id')
        .where('gp.user_id', entry.user_id)
        .where('tr.status', 'passed')
        .select(
          'c.id',
          'c.name',
          'c.file_name',
          'c.file_size',
          'c.file_mime',
          'c.created_at',
          'tc.name as course_name',
          'tc.competency_id as course_competency_id'
        );
      
      // Фильтруем сертификаты: оставляем только те, которые связаны с текущей компетенцией
      // Связь может быть через:
      // 1. competency_id курса совпадает с competency_id компетенции
      // 2. Название курса содержит название компетенции или наоборот
      // 3. Название курса содержит ключевые слова из названия компетенции (более гибкое сопоставление)
      // 4. Если у пользователя есть сертификаты из тестов, показываем их для всех его компетенций
      const competencyNameLower = entry.competency_name.toLowerCase();
      // Извлекаем ключевые слова из названия компетенции (слова длиннее 2 символов)
      const competencyKeywords = competencyNameLower
        .split(/[\s\-_]+/)
        .filter((w: string) => w.length > 2)
        .map((w: string) => w.trim());
      
      const testResultCertificates = testResultsWithCerts
        .filter((cert: any) => {
          // Проверяем связь через competency_id (самый надежный способ)
          if (cert.course_competency_id && String(cert.course_competency_id) === String(entry.competency_id)) {
            return true;
          }
          // Проверяем связь по названию (только если competency_id не совпал)
          const courseNameLower = (cert.course_name || '').toLowerCase();
          if (courseNameLower && competencyNameLower) {
            // Точное совпадение или включение
            if (courseNameLower.includes(competencyNameLower) || 
                competencyNameLower.includes(courseNameLower)) {
              return true;
            }
            // Проверяем совпадение по ключевым словам (только если слова длиннее 2 символов)
            if (competencyKeywords.length > 0 && competencyKeywords.some((keyword: string) => courseNameLower.includes(keyword))) {
              return true;
            }
          }
          // Если нет прямой связи, не показываем сертификат для этой компетенции
          return false;
        })
        .map((cert: any) => ({
          id: cert.id,
          name: cert.name,
          file_name: cert.file_name,
          file_size: cert.file_size,
          file_mime: cert.file_mime,
          created_at: cert.created_at
        }));
      
      // Объединяем оба типа сертификатов
      entry.certificates = [...directCertificates, ...testResultCertificates];
      
      // Логируем итоговый результат
      if (entry.certificates.length > 0) {
        console.log(`[DEBUG /competence-matrix] Итого для компетенции ${entry.competency_name} (${entry.competency_id}) пользователя ${entry.user_id}: ${entry.certificates.length} сертификатов (${directCertificates.length} прямых + ${testResultCertificates.length} из тестов)`);
      } else if (testResultsWithCerts.length > 0) {
        console.log(`[DEBUG /competence-matrix] Для компетенции ${entry.competency_name} найдено ${testResultsWithCerts.length} сертификатов из тестов, но ни один не прошел фильтрацию. Сертификаты:`, testResultsWithCerts.map((c: any) => ({ id: c.id, name: c.name, course: c.course_name })));
      }
    }
    
    return res.json(matrix);
  } catch (error) {
    console.error('Error fetching competence matrix:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Получить матрицу компетенций всех пользователей
router.get('/competence-matrix/all', authenticateToken, async (_req: AuthRequest, res) => {
  try {
    // Все авторизованные пользователи могут видеть матрицу всех пользователей
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
        'competence_matrix.source',
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
    
    // Оптимизация: получаем все сертификаты одним запросом
    const matrixIds = matrix.map(m => m.id);
    const userIds = [...new Set(matrix.map(m => m.user_id))];
    
    // Получаем все прямые сертификаты одним запросом
    const allDirectCertificates = matrixIds.length > 0
      ? await knex('certificates')
          .whereIn('competence_matrix_id', matrixIds)
          .select('id', 'name', 'file_name', 'file_size', 'file_mime', 'created_at', 'competence_matrix_id')
          .orderBy('created_at', 'desc')
      : [];

    // Получаем все сертификаты из тестов одним запросом
    const allTestResultsWithCerts = userIds.length > 0
      ? await knex('test_results as tr')
          .join('growth_plans as gp', 'tr.growth_plan_id', 'gp.id')
          .join('training_courses as tc', 'tr.course_id', 'tc.id')
          .join('certificates as c', 'c.test_result_id', 'tr.id')
          .whereIn('gp.user_id', userIds)
          .where('tr.status', 'passed')
          .select(
            'c.id',
            'c.name',
            'c.file_name',
            'c.file_size',
            'c.file_mime',
            'c.created_at',
            'tc.name as course_name',
            'tc.competency_id as course_competency_id',
            'gp.user_id'
          )
      : [];

    // Создаем мапы для быстрого доступа
    const directCertsMap = new Map<string, any[]>();
    allDirectCertificates.forEach((cert: any) => {
      const key = cert.competence_matrix_id;
      if (!directCertsMap.has(key)) {
        directCertsMap.set(key, []);
      }
      directCertsMap.get(key)!.push(cert);
    });

    const testCertsMap = new Map<string, any[]>();
    allTestResultsWithCerts.forEach((cert: any) => {
      const key = `${cert.user_id}_${cert.course_competency_id || 'null'}`;
      if (!testCertsMap.has(key)) {
        testCertsMap.set(key, []);
      }
      testCertsMap.get(key)!.push(cert);
    });

    // Обрабатываем каждую запись матрицы
    for (const entry of matrix) {
      // Получаем прямые сертификаты из мапы
      const directCertificates = directCertsMap.get(entry.id) || [];
      
      // Получаем сертификаты из тестов для этого пользователя
      const userTestCerts = allTestResultsWithCerts.filter(
        (cert: any) => cert.user_id === entry.user_id
      );
      
      // Фильтруем сертификаты: оставляем только те, которые связаны с текущей компетенцией
      const competencyNameLower = entry.competency_name.toLowerCase();
      const competencyKeywords = competencyNameLower
        .split(/[\s\-_]+/)
        .filter((w: string) => w.length > 2)
        .map((w: string) => w.trim());
      
      const testResultCertificates = userTestCerts
        .filter((cert: any) => {
          // Проверяем связь через competency_id (самый надежный способ)
          if (cert.course_competency_id && String(cert.course_competency_id) === String(entry.competency_id)) {
            return true;
          }
          // Проверяем связь по названию
          const courseNameLower = (cert.course_name || '').toLowerCase();
          if (courseNameLower && competencyNameLower) {
            if (courseNameLower.includes(competencyNameLower) || 
                competencyNameLower.includes(courseNameLower)) {
              return true;
            }
            if (competencyKeywords.length > 0 && competencyKeywords.some((keyword: string) => courseNameLower.includes(keyword))) {
              return true;
            }
          }
          return false;
        })
        .map((cert: any) => ({
          id: cert.id,
          name: cert.name,
          file_name: cert.file_name,
          file_size: cert.file_size,
          file_mime: cert.file_mime,
          created_at: cert.created_at
        }));
      
      // Объединяем оба типа сертификатов
      entry.certificates = [...directCertificates, ...testResultCertificates];
    }
    
    return res.json(matrix);
  } catch (error) {
    console.error('Error fetching all users competence matrix:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Обновить матрицу компетенций
router.post('/competence-matrix', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { competency_id, user_id, level, score, assessment_date, notes, source } = req.body;
    
    // Проверяем права доступа
    if (req.user?.role !== 'admin' && req.user?.role !== 'hr') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Используем переданный user_id или текущего пользователя
    const targetUserId = user_id || req.user?.userId;
    
    // Определяем source: если не указан, то 'manual' (так как это ручное указание)
    const competenceSource = source || 'manual';
    
    const insertData: any = {
      user_id: targetUserId,
      competency_id,
      level,
      score,
      assessment_date,
      notes,
      source: competenceSource
    };
    
    const [matrix] = await knex('competence_matrix')
      .insert(insertData)
      .onConflict(['user_id', 'competency_id'])
      .merge()
      .returning('*');
    
    return res.status(201).json(matrix);
  } catch (error) {
    console.error('Error updating competence matrix:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Удалить компетенцию из матрицы
router.delete('/competence-matrix/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    
    // Проверяем права доступа
    if (req.user?.role !== 'admin' && req.user?.role !== 'hr') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Проверяем, существует ли запись
    const existingEntry = await knex('competence_matrix')
      .where('id', id)
      .first();
    
    if (!existingEntry) {
      return res.status(404).json({ error: 'Competence entry not found' });
    }
    
    // Удаляем запись
    await knex('competence_matrix')
      .where('id', id)
      .delete();
    
    return res.json({ success: true, message: 'Competence entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting competence matrix entry:', error);
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

// ==================== СЕРТИФИКАТЫ ====================

// Загрузить сертификат для компетенции (ручной ввод)
router.post('/certificates/competence', authenticateToken, upload.single('certificate'), async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    const { competence_matrix_id, name } = req.body;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не загружен' });
    }
    
    if (!competence_matrix_id || !name) {
      return res.status(400).json({ error: 'Не указаны competence_matrix_id или name' });
    }
    
    // Проверяем, что компетенция принадлежит пользователю или пользователь имеет права
    const competence = await knex('competence_matrix')
      .where('id', competence_matrix_id)
      .first();
    
    if (!competence) {
      return res.status(404).json({ error: 'Competence matrix entry not found' });
    }
    
    // Проверяем доступ (пользователь может загружать только для своих компетенций, админы и HR - для любых)
    if (req.user?.role !== 'admin' && req.user?.role !== 'hr' && competence.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Проверяем MIME тип (разрешаем PDF, изображения)
    const allowedMimes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/tiff', 'image/tif'];
    if (!allowedMimes.includes(req.file.mimetype)) {
      return res.status(400).json({ error: 'Неподдерживаемый формат файла. Разрешены: PDF, JPEG, PNG, TIFF' });
    }
    
    // Обрабатываем кодировку для названия и имени файла
    // Multer может передавать данные в latin1, нужно конвертировать в UTF-8
    let decodedName = typeof name === 'string' ? name.trim() : String(name).trim();
    
    // Исправляем кодировку названия (если пришло в неправильной кодировке)
    try {
      // Проверяем, содержит ли строка символы, которые выглядят как неправильно декодированные UTF-8
      if (/Ð|Ñ|Ð|Ñ/.test(decodedName)) {
        // Пытаемся исправить: если строка выглядит как latin1 интерпретация UTF-8
        decodedName = Buffer.from(decodedName, 'latin1').toString('utf8');
      }
    } catch {
      // Если не удалось декодировать, оставляем как есть
    }
    
    let decodedFileName = req.file.originalname || 'certificate';
    
    // Исправляем кодировку имени файла (multer передает в latin1)
    if (req.file.originalname) {
      try {
        // Multer всегда передает originalname в latin1, нужно конвертировать в UTF-8
        decodedFileName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
      } catch {
        decodedFileName = req.file.originalname;
      }
    }
    
    // Сохраняем сертификат
    const [certificate] = await knex('certificates')
      .insert({
        user_id: competence.user_id,
        competence_matrix_id: parseInt(competence_matrix_id),
        test_result_id: null,
        name: decodedName,
        file_data: req.file.buffer,
        file_mime: req.file.mimetype,
        file_name: decodedFileName,
        file_size: req.file.size
      })
      .returning('*');
    
    return res.status(201).json({
      id: certificate.id,
      name: certificate.name,
      file_name: certificate.file_name,
      file_size: certificate.file_size,
      file_mime: certificate.file_mime,
      competence_matrix_id: certificate.competence_matrix_id,
      created_at: certificate.created_at
    });
  } catch (error) {
    console.error('Error uploading certificate for competence:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Загрузить сертификат для результата тестирования
router.post('/certificates/test-result', authenticateToken, upload.single('certificate'), async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    const { test_result_id, name } = req.body;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не загружен' });
    }
    
    if (!test_result_id || !name) {
      return res.status(400).json({ error: 'Не указаны test_result_id или name' });
    }
    
    // Проверяем, что результат теста существует
    const testResult = await knex('test_results')
      .join('growth_plans', 'test_results.growth_plan_id', 'growth_plans.id')
      .where('test_results.id', test_result_id)
      .select('test_results.*', 'growth_plans.user_id')
      .first();
    
    if (!testResult) {
      return res.status(404).json({ error: 'Test result not found' });
    }
    
    // Проверяем доступ (пользователь может загружать только для своих тестов, админы и HR - для любых)
    if (req.user?.role !== 'admin' && req.user?.role !== 'hr' && testResult.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Проверяем MIME тип
    const allowedMimes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/tiff', 'image/tif'];
    if (!allowedMimes.includes(req.file.mimetype)) {
      return res.status(400).json({ error: 'Неподдерживаемый формат файла. Разрешены: PDF, JPEG, PNG, TIFF' });
    }
    
    // Обрабатываем кодировку для названия и имени файла
    // Multer может передавать данные в latin1, нужно конвертировать в UTF-8
    let decodedName = typeof name === 'string' ? name.trim() : String(name).trim();
    
    // Исправляем кодировку названия (если пришло в неправильной кодировке)
    try {
      // Проверяем, содержит ли строка символы, которые выглядят как неправильно декодированные UTF-8
      if (/Ð|Ñ|Ð|Ñ/.test(decodedName)) {
        // Пытаемся исправить: если строка выглядит как latin1 интерпретация UTF-8
        decodedName = Buffer.from(decodedName, 'latin1').toString('utf8');
      }
    } catch {
      // Если не удалось декодировать, оставляем как есть
    }
    
    let decodedFileName = req.file.originalname || 'certificate';
    
    // Исправляем кодировку имени файла (multer передает в latin1)
    if (req.file.originalname) {
      try {
        // Multer всегда передает originalname в latin1, нужно конвертировать в UTF-8
        decodedFileName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
      } catch {
        decodedFileName = req.file.originalname;
      }
    }
    
    // Сохраняем сертификат
    const [certificate] = await knex('certificates')
      .insert({
        user_id: testResult.user_id,
        competence_matrix_id: null,
        test_result_id: parseInt(test_result_id),
        name: decodedName,
        file_data: req.file.buffer,
        file_mime: req.file.mimetype,
        file_name: decodedFileName,
        file_size: req.file.size
      })
      .returning('*');
    
    return res.status(201).json({
      id: certificate.id,
      name: certificate.name,
      file_name: certificate.file_name,
      file_size: certificate.file_size,
      file_mime: certificate.file_mime,
      test_result_id: certificate.test_result_id,
      created_at: certificate.created_at
    });
  } catch (error) {
    console.error('Error uploading certificate for test result:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Получить сертификат (файл)
router.get('/certificates/:id/file', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const certificate = await knex('certificates')
      .where('id', id)
      .first();
    
    if (!certificate) {
      return res.status(404).json({ error: 'Certificate not found' });
    }
    
    // Проверяем доступ (пользователь может просматривать только свои сертификаты, админы и HR - все)
    if (req.user?.role !== 'admin' && req.user?.role !== 'hr' && certificate.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.setHeader('Content-Type', certificate.file_mime || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(certificate.file_name)}"`);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(certificate.file_data);
    return;
  } catch (error) {
    console.error('Error fetching certificate file:', error);
    res.status(500).json({ error: 'Internal server error' });
    return;
  }
});

// Получить информацию о сертификатах пользователя
router.get('/certificates', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    const { user_id, competence_matrix_id, test_result_id } = req.query;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    // Определяем, для какого пользователя запрашиваем сертификаты
    let targetUserId = user_id ? String(user_id) : userId;
    
    // Проверяем доступ:
    // - Пользователь может видеть свои сертификаты
    // - Пользователь может видеть сертификаты других пользователей (публичный профиль)
    // - Админы и HR могут видеть все сертификаты
    // Сертификаты являются публичной информацией в профиле пользователя
    // Сертификаты могут быть связаны либо с competence_matrix_id, либо с test_result_id
    // Для test_result_id нужно получить компетенцию через training_courses
    
    let query = knex('certificates')
      .where('certificates.user_id', targetUserId)
      .leftJoin('competence_matrix', 'certificates.competence_matrix_id', 'competence_matrix.id')
      .leftJoin('competencies as comp1', 'competence_matrix.competency_id', 'comp1.id')
      .leftJoin('test_results', 'certificates.test_result_id', 'test_results.id')
      .leftJoin('training_courses', 'test_results.course_id', 'training_courses.id')
      .leftJoin('competencies as comp2', 'training_courses.competency_id', 'comp2.id')
      .select(
        'certificates.id',
        'certificates.name',
        'certificates.file_name',
        'certificates.file_size',
        'certificates.file_mime',
        'certificates.competence_matrix_id',
        'certificates.test_result_id',
        'certificates.created_at',
        'certificates.updated_at',
        knex.raw('COALESCE(comp1.name, comp2.name) as competency_name'),
        knex.raw('COALESCE(comp1.id, comp2.id) as competency_id')
      )
      .orderBy('certificates.created_at', 'desc');
    
    // Фильтр по компетенции
    if (competence_matrix_id) {
      query = query.where('certificates.competence_matrix_id', competence_matrix_id);
    }
    
    // Фильтр по результату теста
    if (test_result_id) {
      query = query.where('certificates.test_result_id', test_result_id);
    }
    
    const certificates = await query;
    
    return res.json(certificates);
  } catch (error) {
    console.error('Error fetching certificates:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Поиск сертификатов (по компетенциям, ФИО, тексту)
router.get('/certificates/search', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    const { search, competency_id, user_name } = req.query;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    // Все авторизованные пользователи могут искать сертификаты
    // Сертификаты являются публичной информацией в профилях пользователей
    // Сертификаты могут быть связаны либо с competence_matrix_id, либо с test_result_id
    // Для test_result_id нужно получить компетенцию через training_courses
    let query = knex('certificates')
      .join('users', 'certificates.user_id', 'users.id')
      .leftJoin('competence_matrix', 'certificates.competence_matrix_id', 'competence_matrix.id')
      .leftJoin('competencies as comp1', 'competence_matrix.competency_id', 'comp1.id')
      .leftJoin('test_results', 'certificates.test_result_id', 'test_results.id')
      .leftJoin('training_courses', 'test_results.course_id', 'training_courses.id')
      .leftJoin('competencies as comp2', 'training_courses.competency_id', 'comp2.id')
      .select(
        'certificates.id',
        'certificates.name',
        'certificates.file_name',
        'certificates.file_size',
        'certificates.file_mime',
        'certificates.competence_matrix_id',
        'certificates.test_result_id',
        'certificates.created_at',
        'certificates.updated_at',
        'users.id as user_id',
        'users.first_name',
        'users.last_name',
        'users.email',
        'users.position',
        knex.raw('COALESCE(comp1.name, comp2.name) as competency_name'),
        knex.raw('COALESCE(comp1.id, comp2.id) as competency_id')
      );
    
    // Поиск по тексту (название сертификата, имя файла)
    if (search && typeof search === 'string' && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      query = query.where(function() {
        this.where('certificates.name', 'ilike', searchTerm)
          .orWhere('certificates.file_name', 'ilike', searchTerm);
      });
    }
    
    // Поиск по компетенции (может быть через competence_matrix или через training_courses)
    if (competency_id && String(competency_id).trim()) {
      const compId = String(competency_id).trim();
      query = query.where(function() {
        this.where('comp1.id', compId)
          .orWhere('comp2.id', compId);
      });
    }
    
    // Поиск по ФИО пользователя
    if (user_name && typeof user_name === 'string' && user_name.trim()) {
      const nameTerm = `%${user_name.trim()}%`;
      query = query.where(function() {
        this.where('users.first_name', 'ilike', nameTerm)
          .orWhere('users.last_name', 'ilike', nameTerm)
          .orWhere(knex.raw("COALESCE(users.first_name, '') || ' ' || COALESCE(users.last_name, '')"), 'ilike', nameTerm);
      });
    }
    
    const certificates = await query
      .orderBy('certificates.created_at', 'desc');
    
    console.log('Certificates search result:', {
      search,
      competency_id,
      user_name,
      count: certificates.length
    });
    
    return res.json(certificates);
  } catch (error) {
    console.error('Error searching certificates:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Удалить сертификат
router.delete('/certificates/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const certificate = await knex('certificates')
      .where('id', id)
      .first();
    
    if (!certificate) {
      return res.status(404).json({ error: 'Certificate not found' });
    }
    
    // Проверяем доступ (пользователь может удалять только свои сертификаты, админы и HR - все)
    if (req.user?.role !== 'admin' && req.user?.role !== 'hr' && certificate.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    await knex('certificates')
      .where('id', id)
      .delete();
    
    return res.json({ success: true });
  } catch (error) {
    console.error('Error deleting certificate:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
