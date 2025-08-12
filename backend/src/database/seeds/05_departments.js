// Автор: Стас Чашин @chastnik
/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Удаляем существующие записи
  await knex('departments').del();

  // Вставляем отделы
  await knex('departments').insert([
    {
      id: '550e8400-e29b-41d4-a716-446655440201',
      name: 'Информационные технологии',
      description: 'Разработка и поддержка IT-систем',
      code: 'IT',
      is_active: true,
      sort_order: 1,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440202', 
      name: 'Управление персоналом',
      description: 'HR-процессы и развитие сотрудников',
      code: 'HR',
      is_active: true,
      sort_order: 2,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440203',
      name: 'Продажи',
      description: 'Отдел продаж и работы с клиентами',
      code: 'SALES',
      is_active: true,
      sort_order: 3,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440204',
      name: 'Финансы',
      description: 'Финансовое планирование и учет',
      code: 'FIN',
      is_active: true,
      sort_order: 4,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440205',
      name: 'Маркетинг',
      description: 'Продвижение и реклама',
      code: 'MKT',
      is_active: true,
      sort_order: 5,
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);
};
