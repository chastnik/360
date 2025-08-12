// Автор: Стас Чашин @chastnik
const bcrypt = require('bcryptjs');

exports.seed = async function(knex) {
  // Удаляем существующих пользователей (только для разработки)
  await knex('users').del();

  // Хешируем пароли
  const adminHash = await bcrypt.hash('admin123', 10);
  const managerHash = await bcrypt.hash('manager123', 10);
  const userHash = await bcrypt.hash('user123', 10);

  // Вставляем тестовых пользователей
  await knex('users').insert([
    {
      id: '550e8400-e29b-41d4-a716-446655440100',
      email: 'admin@company.com',
      password_hash: adminHash,
      first_name: 'Администратор',
      last_name: 'Системы',
      middle_name: 'Управление',
      role: 'admin',
      position: 'Системный администратор',
      department: 'IT',
      is_active: true
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440101',
      email: 'manager@company.com',
      password_hash: managerHash,
      first_name: 'Менеджер',
      last_name: 'Проектов',
      middle_name: 'HR',
      role: 'manager',
      position: 'HR менеджер',
      department: 'Управление персоналом',
      is_active: true
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440102',
      email: 'user@company.com',
      password_hash: userHash,
      first_name: 'Пользователь',
      last_name: 'Тестовый',
      middle_name: 'Обычный',
      role: 'user',
      position: 'Сотрудник',
      department: 'Разработка',
      manager_id: '550e8400-e29b-41d4-a716-446655440101', // Менеджер
      is_active: true
    }
  ]);
};
