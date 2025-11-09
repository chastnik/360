
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
  'ui:view:admin.logs',
  // Действия
  'action:reports:generate_ai',
  'action:users:create',
  'action:users:update',
  'action:users:deactivate',
  'action:vacations:create',
  'action:vacations:update',
  'action:vacations:delete',
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
  'ui:view:admin.logs': 'Просмотр логов системы',
  // Действия
  'action:reports:generate_ai': 'Генерация отчётов с помощью ИИ',
  'action:users:create': 'Создание пользователей',
  'action:users:update': 'Редактирование пользователей',
  'action:users:deactivate': 'Деактивация пользователей',
  'action:vacations:create': 'Создание отпусков для других пользователей',
  'action:vacations:update': 'Редактирование отпусков других пользователей',
  'action:vacations:delete': 'Удаление отпусков других пользователей',
};

const AdminRoles: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [form, setForm] = useState({ key: '', name: '', description: '' });
  const [formError, setFormError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editMode, setEditMode] = useState<'info' | 'permissions'>('info');
  const [editForm, setEditForm] = useState({ name: '', description: '' });
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await rolesAPI.list();
    if (res.success && res.data) setRoles(res.data as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showAddModal) {
        closeAddModal();
      }
    };
    if (showAddModal) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [showAddModal]);

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

  const handleAddRole = async () => {
    setFormError(null);
    if (!form.key || !form.name) { 
      setFormError('Укажите key и name'); 
      return; 
    }
    setCreating(true);
    const res = await rolesAPI.create({ key: form.key, name: form.name, description: form.description });
    setCreating(false);
    if (res.success) { 
      setForm({ key: '', name: '', description: '' }); 
      setFormError(null);
      setShowAddModal(false);
      await load(); 
    } else {
      setFormError(res.error || 'Ошибка при создании роли');
    }
  };

  const openAddModal = () => {
    setForm({ key: '', name: '', description: '' });
    setFormError(null);
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setForm({ key: '', name: '', description: '' });
    setFormError(null);
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
              onClick={openAddModal}
              className="px-3 py-2 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded"
            >Добавить</button>
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

      {/* Модальное окно добавления роли */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={closeAddModal}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Добавить новую роль</h2>
              <button
                onClick={closeAddModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {formError && (
              <div className="mb-4 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-600 dark:text-red-400">
                {formError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Key (технический ключ) *
                </label>
                <input 
                  type="text"
                  value={form.key} 
                  onChange={e=>{setForm({...form, key: e.target.value}); setFormError(null);}} 
                  placeholder="key (латиница)" 
                  className={`w-full px-3 py-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600 ${!form.key && formError ? 'border-red-500 dark:border-red-500' : ''}`} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Название *
                </label>
                <input 
                  type="text"
                  value={form.name} 
                  onChange={e=>{setForm({...form, name: e.target.value}); setFormError(null);}} 
                  placeholder="Название роли" 
                  className={`w-full px-3 py-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600 ${!form.name && formError ? 'border-red-500 dark:border-red-500' : ''}`} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Описание
                </label>
                <textarea 
                  value={form.description} 
                  onChange={e=>setForm({...form, description: e.target.value})} 
                  placeholder="Описание роли" 
                  rows={3}
                  className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600" 
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={closeAddModal}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                Отмена
              </button>
              <button
                onClick={handleAddRole}
                disabled={creating}
                className="px-4 py-2 text-sm bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded"
              >
                {creating ? 'Создание...' : 'Добавить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRoles;


