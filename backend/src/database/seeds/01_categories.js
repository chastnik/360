exports.seed = function(knex) {
  return knex('categories').del()
    .then(function () {
      return knex('categories').insert([
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          name: 'Лидерство',
          description: 'Способность вести за собой, принимать решения и мотивировать команду',
          icon: 'crown',
          color: '#1e3a8a',
          sort_order: 1
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          name: 'Коммуникация',
          description: 'Навыки общения, активного слушания и обратной связи',
          icon: 'chat',
          color: '#3b82f6',
          sort_order: 2
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440003',
          name: 'Командная работа',
          description: 'Способность работать в команде и сотрудничать',
          icon: 'users',
          color: '#06b6d4',
          sort_order: 3
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440004',
          name: 'Решение проблем',
          description: 'Аналитические способности и творческий подход',
          icon: 'lightbulb',
          color: '#f59e0b',
          sort_order: 4
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440005',
          name: 'Профессиональное развитие',
          description: 'Стремление к обучению и развитию',
          icon: 'academic-cap',
          color: '#10b981',
          sort_order: 5
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440006',
          name: 'Результативность',
          description: 'Способность достигать целей и выполнять задачи',
          icon: 'target',
          color: '#dc2626',
          sort_order: 6
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440007',
          name: 'Адаптивность',
          description: 'Гибкость и способность к изменениям',
          icon: 'refresh',
          color: '#7c3aed',
          sort_order: 7
        }
      ]);
    });
}; 