/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function(knex) {
  // Очищаем существующие компетенции
  await knex('competence_matrix').del();
  await knex('competencies').del();

  // Вставляем компетенции
  await knex('competencies').insert([
    {
      name: 'JavaScript',
      description: 'Знание языка программирования JavaScript, включая ES6+, асинхронное программирование, DOM-манипуляции',
      is_active: true
    },
    {
      name: 'React.js',
      description: 'Разработка пользовательских интерфейсов с использованием библиотеки React, включая хуки, контекст, состояние',
      is_active: true
    },
    {
      name: 'Node.js',
      description: 'Серверная разработка на Node.js, включая Express, работу с базами данных, API разработку',
      is_active: true
    },
    {
      name: 'TypeScript',
      description: 'Статическая типизация в JavaScript, интерфейсы, дженерики, декораторы',
      is_active: true
    },
    {
      name: 'SQL',
      description: 'Работа с реляционными базами данных, написание запросов, оптимизация, проектирование схем',
      is_active: true
    },
    {
      name: 'Docker',
      description: 'Контейнеризация приложений, создание образов, оркестрация, работа с Docker Compose',
      is_active: true
    },
    {
      name: 'Git',
      description: 'Система контроля версий, ветвление, слияние, работа с удаленными репозиториями',
      is_active: true
    },
    {
      name: 'Архитектура ПО',
      description: 'Проектирование архитектуры программного обеспечения, паттерны проектирования, SOLID принципы',
      is_active: true
    },
    {
      name: 'Тестирование',
      description: 'Написание unit-тестов, интеграционных тестов, TDD/BDD подходы, автоматизация тестирования',
      is_active: true
    },
    {
      name: 'DevOps',
      description: 'CI/CD, автоматизация развертывания, мониторинг, логирование, инфраструктура как код',
      is_active: true
    },
    {
      name: 'Управление проектами',
      description: 'Agile/Scrum методологии, планирование, оценка задач, работа с командой',
      is_active: true
    },
    {
      name: 'Коммуникация',
      description: 'Навыки межличностного общения, презентации, документирование, работа с заказчиками',
      is_active: true
    }
  ]);
};

