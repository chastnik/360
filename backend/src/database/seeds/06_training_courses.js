/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function(knex) {
  // Очищаем таблицы
  await knex('course_corequisites').del();
  await knex('course_prerequisites').del();
  await knex('training_courses').del();

  // Вставляем курсы
  const courses = await knex('training_courses').insert([
    {
      name: 'Основы SQL',
      description: 'Базовый курс по работе с реляционными базами данных. Изучение SQL запросов, создание таблиц, индексов.',
      hours: 16,
      target_level: 'junior',
      is_active: true
    },
    {
      name: 'Продвинутый SQL',
      description: 'Углубленное изучение SQL: оконные функции, CTE, оптимизация запросов, индексы.',
      hours: 24,
      target_level: 'middle',
      is_active: true
    },
    {
      name: 'PostgreSQL для разработчиков',
      description: 'Специфика работы с PostgreSQL: типы данных, функции, триггеры, процедуры.',
      hours: 32,
      target_level: 'middle',
      is_active: true
    },
    {
      name: 'JavaScript основы',
      description: 'Основы JavaScript: синтаксис, функции, объекты, DOM, события.',
      hours: 20,
      target_level: 'junior',
      is_active: true
    },
    {
      name: 'JavaScript продвинутый',
      description: 'Продвинутые темы JavaScript: замыкания, прототипы, асинхронность, ES6+.',
      hours: 24,
      target_level: 'middle',
      is_active: true
    },
    {
      name: 'React.js',
      description: 'Изучение React: компоненты, хуки, состояние, жизненный цикл, роутинг.',
      hours: 36,
      target_level: 'middle',
      is_active: true
    },
    {
      name: 'Node.js и Express',
      description: 'Серверная разработка на Node.js: Express, middleware, роутинг, работа с БД.',
      hours: 32,
      target_level: 'middle',
      is_active: true
    },
    {
      name: 'TypeScript',
      description: 'Изучение TypeScript: типы, интерфейсы, дженерики, декораторы.',
      hours: 24,
      target_level: 'middle',
      is_active: true
    },
    {
      name: 'Docker основы',
      description: 'Основы контейнеризации: Docker, образы, контейнеры, Docker Compose.',
      hours: 16,
      target_level: 'junior',
      is_active: true
    },
    {
      name: 'Docker продвинутый',
      description: 'Продвинутые темы Docker: multi-stage builds, volumes, networks, orchestration.',
      hours: 20,
      target_level: 'middle',
      is_active: true
    },
    {
      name: 'Git и GitHub',
      description: 'Система контроля версий: Git, ветки, слияния, GitHub, pull requests.',
      hours: 12,
      target_level: 'junior',
      is_active: true
    },
    {
      name: 'Тестирование ПО',
      description: 'Основы тестирования: unit-тесты, интеграционные тесты, TDD, BDD.',
      hours: 24,
      target_level: 'middle',
      is_active: true
    },
    {
      name: 'Архитектура ПО',
      description: 'Принципы проектирования: SOLID, паттерны проектирования, архитектурные стили.',
      hours: 40,
      target_level: 'senior',
      is_active: true
    },
    {
      name: 'Микросервисы',
      description: 'Архитектура микросервисов: разбиение, коммуникация, мониторинг, развертывание.',
      hours: 36,
      target_level: 'senior',
      is_active: true
    },
    {
      name: 'DevOps практики',
      description: 'CI/CD, автоматизация развертывания, мониторинг, логирование.',
      hours: 32,
      target_level: 'senior',
      is_active: true
    }
  ]).returning('*');

  // Создаем зависимости между курсами
  const prerequisites = [
    // Продвинутый SQL требует основы SQL
    { course: 'Продвинутый SQL', prerequisite: 'Основы SQL' },
    // PostgreSQL требует продвинутый SQL
    { course: 'PostgreSQL для разработчиков', prerequisite: 'Продвинутый SQL' },
    // JavaScript продвинутый требует основы
    { course: 'JavaScript продвинутый', prerequisite: 'JavaScript основы' },
    // React требует JavaScript продвинутый
    { course: 'React.js', prerequisite: 'JavaScript продвинутый' },
    // Node.js требует JavaScript продвинутый
    { course: 'Node.js и Express', prerequisite: 'JavaScript продвинутый' },
    // TypeScript требует JavaScript продвинутый
    { course: 'TypeScript', prerequisite: 'JavaScript продвинутый' },
    // Docker продвинутый требует основы
    { course: 'Docker продвинутый', prerequisite: 'Docker основы' },
    // Архитектура ПО требует опыт разработки
    { course: 'Архитектура ПО', prerequisite: 'React.js' },
    { course: 'Архитектура ПО', prerequisite: 'Node.js и Express' },
    // Микросервисы требуют архитектуру ПО
    { course: 'Микросервисы', prerequisite: 'Архитектура ПО' },
    // DevOps требует Docker и микросервисы
    { course: 'DevOps практики', prerequisite: 'Docker продвинутый' },
    { course: 'DevOps практики', prerequisite: 'Микросервисы' }
  ];

  for (const prereq of prerequisites) {
    const course = courses.find(c => c.name === prereq.course);
    const prerequisite = courses.find(c => c.name === prereq.prerequisite);
    
    if (course && prerequisite) {
      await knex('course_prerequisites').insert({
        course_id: course.id,
        prerequisite_id: prerequisite.id
      });
    }
  }

  // Создаем параллельные курсы (corequisites)
  const corequisites = [
    // React и TypeScript можно изучать параллельно
    { course: 'React.js', corequisite: 'TypeScript' },
    // Node.js и TypeScript можно изучать параллельно
    { course: 'Node.js и Express', corequisite: 'TypeScript' }
  ];

  for (const coreq of corequisites) {
    const course = courses.find(c => c.name === coreq.course);
    const corequisite = courses.find(c => c.name === coreq.corequisite);
    
    if (course && corequisite) {
      await knex('course_corequisites').insert({
        course_id: course.id,
        corequisite_id: corequisite.id
      });
    }
  }
};
