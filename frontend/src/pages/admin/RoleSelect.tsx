// Автор: Стас Чашин @chastnik
import React, { useEffect, useState } from 'react';
import { rolesAPI } from '../../services/api';

interface Props {
  value: string;
  onChange: (id: string) => void;
}

const RoleSelect: React.FC<Props> = ({ value, onChange }) => {
  const [roles, setRoles] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await rolesAPI.list();
      if (res.success && res.data) setRoles((res.data as any[]).map(r => ({ id: r.id, name: r.name })));
      setLoading(false);
    };
    load();
  }, []);

  return (
    <select
      value={value}
      onChange={(e)=> onChange(e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
    >
      <option value="">Выберите роль</option>
      {roles.map(r => (
        <option key={r.id} value={r.id}>{r.name}</option>
      ))}
      {loading && <option value="" disabled>Загрузка…</option>}
    </select>
  );
};

export default RoleSelect;


