
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

const AdminRoles: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [form, setForm] = useState({ key: '', name: '', description: '' });

  const load = async () => {
    setLoading(true);
    const res = await rolesAPI.list();
    if (res.success && res.data) setRoles(res.data as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openRole = async (role: Role) => {
    setSelectedRole(role);
    const res = await rolesAPI.getPermissions(role.id);
    if (res.success && res.data) setPermissions(res.data);
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
                if (!form.key || !form.name) { alert('Укажите key и name'); return; }
                const res = await rolesAPI.create({ key: form.key, name: form.name, description: form.description });
                if (res.success) { setForm({ key: '', name: '', description: '' }); load(); }
                else alert(res.error);
              }}
              className="px-3 py-2 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded"
            >Добавить</button>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <input value={form.key} onChange={e=>setForm({...form, key: e.target.value})} placeholder="key (латиница)" className="px-2 py-1 border rounded dark:bg-gray-700 dark:text-white" />
            <input value={form.name} onChange={e=>setForm({...form, name: e.target.value})} placeholder="Название" className="px-2 py-1 border rounded dark:bg-gray-700 dark:text-white" />
            <input value={form.description} onChange={e=>setForm({...form, description: e.target.value})} placeholder="Описание" className="px-2 py-1 border rounded dark:bg-gray-700 dark:text-white" />
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {roles.map(r => (
              <button key={r.id} onClick={()=>openRole(r)} className={`w-full text-left py-2 ${selectedRole?.id===r.id?'text-primary-600':''}`}> {r.name} <span className="text-xs text-gray-500">({r.key})</span></button>
            ))}
            {loading && <div className="text-sm text-gray-500">Загрузка…</div>}
          </div>
        </div>

        {/* Права роли */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          {!selectedRole ? (
            <div className="text-gray-500 dark:text-gray-400">Выберите роль слева</div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">Права: {selectedRole.name}</h2>
                <button
                  onClick={async ()=>{
                    const res = await rolesAPI.setPermissions(selectedRole.id, permissions);
                    if (!res.success) alert(res.error);
                  }}
                  className="px-3 py-2 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded"
                >Сохранить</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {ALL_PERMISSIONS.map(p => (
                  <label key={p} className="flex items-center space-x-2">
                    <input type="checkbox" checked={permissions.includes(p)} onChange={()=>togglePermission(p)} />
                    <span className="text-sm text-gray-800 dark:text-gray-200">{p}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminRoles;


