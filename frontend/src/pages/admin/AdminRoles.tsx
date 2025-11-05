
// Автор: Стас Чашин @chastnik
import React, { useEffect, useState } from 'react';
import { rolesAPI } from '../../services/api';

interface Role {
  id: string;
  key: string;
  name: string;
  description?: string;
  is_system: boolean;
}

const ALL_PERMISSIONS = [
  // Разделы
  'ui:view:dashboard',
  'ui:view:cycles',
  'ui:view:assessments',
  'ui:view:reports',
  'ui:view:profile',
  'ui:view:admin',
  'ui:view:admin.users',
  'ui:view:admin.departments',
  'ui:view:admin.categories',
  'ui:view:admin.questions',
  'ui:view:admin.competencies',
  'ui:view:admin.mattermost',
  'ui:view:admin.settings',
  'ui:view:admin.roles',
  // Действия
  'action:reports:generate_ai',
  'action:users:create',
  'action:users:update',
  'action:users:deactivate',
];

const PERMISSION_LABELS: Record<string, string> = {
  // Разделы
  'ui:view:dashboard': 'Панель управления',
  'ui:view:cycles': 'Циклы оценки',
  'ui:view:assessments': 'Оценки',
  'ui:view:reports': 'Отчёты',
  'ui:view:profile': 'Профиль пользователя',
  'ui:view:admin': 'Администрирование',
  'ui:view:admin.users': 'Управление пользователями',
  'ui:view:admin.departments': 'Управление отделами',
  'ui:view:admin.categories': 'Управление категориями',
  'ui:view:admin.questions': 'Управление вопросами',
  'ui:view:admin.competencies': 'Управление компетенциями',
  'ui:view:admin.mattermost': 'Настройки Mattermost',
  'ui:view:admin.settings': 'Настройки системы',
  'ui:view:admin.roles': 'Управление ролями',
  // Действия
  'action:reports:generate_ai': 'Генерация отчётов с помощью ИИ',
  'action:users:create': 'Создание пользователей',
  'action:users:update': 'Редактирование пользователей',
  'action:users:deactivate': 'Деактивация пользователей',
};

const AdminRoles: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [form, setForm] = useState({ key: '', name: '', description: '' });
  const [formError, setFormError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<'info' | 'permissions'>('info');
  const [editForm, setEditForm] = useState({ name: '', description: '' });
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await rolesAPI.list();
    if (res.success && res.data) setRoles(res.data as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openRole = async (role: Role) => {
    setSelectedRole(role);
    setEditForm({ name: role.name, description: role.description || '' });
    setEditError(null);
    setEditMode('info');
    const res = await rolesAPI.getPermissions(role.id);
    if (res.success && res.data) setPermissions(res.data);
  };

  const saveRole = async () => {
    if (!selectedRole) return;
    setEditError(null);
    if (!editForm.name.trim()) {
      setEditError('Название роли не может быть пустым');
      return;
    }
    setSaving(true);
    const res = await rolesAPI.update(selectedRole.id, { 
      name: editForm.name.trim(), 
      description: editForm.description.trim() || undefined 
    });
    setSaving(false);
    if (res.success && res.data) {
      // Обновляем выбранную роль из ответа API
      setSelectedRole({ ...selectedRole, ...res.data });
      // Обновляем список ролей
      await load();
      setEditError(null);
    } else {
      setEditError(res.error || 'Ошибка при обновлении роли');
    }
  };

  const togglePermission = (perm: string) => {
    setPermissions(prev => prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Роли</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Список ролей */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Справочник ролей</h2>
            <button
              onClick={async () => {
                setFormError(null);
                if (!form.key || !form.name) { 
                  setFormError('Укажите key и name'); 
                  return; 
                }
                const res = await rolesAPI.create({ key: form.key, name: form.name, description: form.description });
                if (res.success) { 
                  setForm({ key: '', name: '', description: '' }); 
                  setFormError(null);
                  load(); 
                } else {
                  setFormError(res.error || 'Ошибка при создании роли');
                }
              }}
              className="px-3 py-2 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded"
            >Добавить</button>
          </div>
          {formError && (
            <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-600 dark:text-red-400">
              {formError}
            </div>
          )}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <input 
              value={form.key} 
              onChange={e=>{setForm({...form, key: e.target.value}); setFormError(null);}} 
              placeholder="key (латиница)" 
              className={`px-2 py-1 border rounded dark:bg-gray-700 dark:text-white ${!form.key && formError ? 'border-red-500 dark:border-red-500' : ''}`} 
            />
            <input 
              value={form.name} 
              onChange={e=>{setForm({...form, name: e.target.value}); setFormError(null);}} 
              placeholder="Название" 
              className={`px-2 py-1 border rounded dark:bg-gray-700 dark:text-white ${!form.name && formError ? 'border-red-500 dark:border-red-500' : ''}`} 
            />
            <input 
              value={form.description} 
              onChange={e=>setForm({...form, description: e.target.value})} 
              placeholder="Описание" 
              className="px-2 py-1 border rounded dark:bg-gray-700 dark:text-white" 
            />
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {roles.map(r => (
              <button key={r.id} onClick={()=>openRole(r)} className={`w-full text-left py-2 ${selectedRole?.id===r.id?'text-primary-600 dark:text-primary-400':'text-gray-900 dark:text-gray-200'}`}> {r.name} <span className="text-xs text-gray-500 dark:text-gray-400">({r.key})</span></button>
            ))}
            {loading && <div className="text-sm text-gray-500 dark:text-gray-400">Загрузка…</div>}
          </div>
        </div>

        {/* Информация о роли и права */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          {!selectedRole ? (
            <div className="text-gray-500 dark:text-gray-400">Выберите роль слева</div>
          ) : (
            <div>
              {/* Вкладки */}
              <div className="flex space-x-2 mb-4 border-b border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setEditMode('info')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    editMode === 'info'
                      ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  Информация
                </button>
                <button
                  onClick={() => setEditMode('permissions')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    editMode === 'permissions'
                      ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  Права доступа
                </button>
              </div>

              {/* Редактирование информации о роли */}
              {editMode === 'info' && (
                <div>
                  <div className="mb-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Редактирование роли</h3>
                    {editError && (
                      <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-600 dark:text-red-400">
                        {editError}
                      </div>
                    )}
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Key (технический ключ)
                        </label>
                        <input
                          type="text"
                          value={selectedRole.key}
                          disabled
                          className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 bg-gray-100 text-gray-500 cursor-not-allowed"
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Технический ключ нельзя изменить</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Название *
                        </label>
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={e => { setEditForm({ ...editForm, name: e.target.value }); setEditError(null); }}
                          className={`w-full px-3 py-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600 ${!editForm.name.trim() && editError ? 'border-red-500 dark:border-red-500' : ''}`}
                          placeholder="Название роли"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Описание
                        </label>
                        <textarea
                          value={editForm.description}
                          onChange={e => { setEditForm({ ...editForm, description: e.target.value }); setEditError(null); }}
                          rows={3}
                          className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
                          placeholder="Описание роли"
                        />
                      </div>
                      {selectedRole.is_system && (
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-sm text-blue-600 dark:text-blue-400">
                          Это системная роль
                        </div>
                      )}
                      <div className="flex justify-end">
                        <button
                          onClick={saveRole}
                          disabled={saving}
                          className="px-4 py-2 text-sm bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded"
                        >
                          {saving ? 'Сохранение...' : 'Сохранить изменения'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Права доступа */}
              {editMode === 'permissions' && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Права доступа</h3>
                    <button
                      onClick={async () => {
                        const res = await rolesAPI.setPermissions(selectedRole.id, permissions);
                        if (!res.success) alert(res.error);
                        else {
                          // Обновляем список ролей после сохранения
                          await load();
                        }
                      }}
                      className="px-3 py-2 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded"
                    >Сохранить права</button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {ALL_PERMISSIONS.map(p => (
                      <label key={p} className="flex items-start space-x-2 cursor-pointer">
                        <input type="checkbox" checked={permissions.includes(p)} onChange={()=>togglePermission(p)} className="mt-1" />
                        <div className="flex-1">
                          <span className="text-sm text-gray-800 dark:text-gray-200 font-mono">{p}</span>
                          <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{PERMISSION_LABELS[p] || 'Неизвестное право'}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminRoles;


