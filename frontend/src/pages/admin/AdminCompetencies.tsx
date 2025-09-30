
// Автор: Стас Чашин @chastnik
import React, { useEffect, useState } from 'react';
import api from '../../services/api';

type Competency = {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

const AdminCompetencies: React.FC = () => {
  const [items, setItems] = useState<Competency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<{ id?: string; name: string; description: string }>({ name: '', description: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/competencies');
      const data = res.data?.success ? res.data.data : res.data;
      setItems(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e: any) {
      setError('Не удалось загрузить компетенции');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    try {
      setSaving(true);
      if (form.id) {
        await api.put(`/admin/competencies/${form.id}`, { name: form.name, description: form.description });
      } else {
        await api.post('/admin/competencies', { name: form.name, description: form.description });
      }
      setForm({ name: '', description: '' });
      await load();
    } catch (e: any) {
      setError('Не удалось сохранить компетенцию');
    } finally {
      setSaving(false);
    }
  };

  const edit = (c: Competency) => setForm({ id: c.id, name: c.name, description: c.description || '' });
  const remove = async (id: string) => {
    if (!window.confirm('Удалить компетенцию?')) return;
    try { await api.delete(`/admin/competencies/${id}`); await load(); } catch { setError('Ошибка удаления'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Компетенции</h1>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{form.id ? 'Редактировать' : 'Добавить'} компетенцию</h2>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Название *</label>
            <input value={form.name} onChange={e=>setForm(f=>({...f, name: e.target.value}))} className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:text-white" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Описание</label>
            <textarea value={form.description} onChange={e=>setForm(f=>({...f, description: e.target.value}))} className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:text-white" rows={3} />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded">{saving ? 'Сохранение...' : 'Сохранить'}</button>
            {form.id && <button type="button" onClick={()=>setForm({ name: '', description: '' })} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded">Отмена</button>}
          </div>
        </form>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Список</h2>
        {loading ? (
          <div className="text-gray-500 dark:text-gray-400">Загрузка...</div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {items.map(c => (
              <div key={c.id} className="py-3 flex items-start justify-between">
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">{c.name}</div>
                  {c.description && <div className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{c.description}</div>}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={()=>edit(c)} className="text-primary-600 hover:text-primary-800">Редактировать</button>
                  <button onClick={()=>remove(c.id)} className="text-red-600 hover:text-red-800">Удалить</button>
                </div>
              </div>
            ))}
            {items.length === 0 && <div className="text-gray-500 dark:text-gray-400">Нет записей</div>}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCompetencies;


