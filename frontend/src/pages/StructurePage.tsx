// Автор: Стас Чашин @chastnik
import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import Avatar from '../components/Avatar';

type User = {
  id: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  email: string;
  position?: string;
  department_id?: string;
  department?: string;
  manager_id?: string | null;
  mattermost_username?: string;
  avatar_url?: string;
  role?: string;
  is_manager?: boolean;
};

type TreeNode = User & { children: TreeNode[] };

const StructurePage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<User[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/users');
        const data = res.data?.success ? res.data.data : res.data;
        const all: User[] = Array.isArray(data) ? data : [];
        // Фильтр: берем только тех, у кого указан руководитель, или кто является руководителем хотя бы одного
        const hasManager = new Set(all.filter(u => u.manager_id).map(u => String(u.id)));
        const isManager = new Set(all.filter(u => all.some(x => x.manager_id === u.id)).map(u => String(u.id)));
        const filtered = all.filter(u => u.manager_id || isManager.has(String(u.id)));
        setUsers(filtered);
        setError(null);
      } catch (e: any) {
        setError('Не удалось загрузить пользователей');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const roots = useMemo(() => {
    const byId: Record<string, TreeNode> = {};
    users.forEach(u => { byId[String(u.id)] = { ...u, children: [] }; });

    const rootsAcc: TreeNode[] = [];
    users.forEach(u => {
      const id = String(u.id);
      const mid = u.manager_id ? String(u.manager_id) : null;
      if (mid && byId[mid]) {
        byId[mid].children.push(byId[id]);
      } else {
        // верхний уровень (нет руководителя в выборке)
        rootsAcc.push(byId[id]);
      }
    });
    // Оставляем уникальные корни
    const uniq = Array.from(new Set(rootsAcc.map(n => n.id))).map(id => byId[String(id)]);
    return uniq;
  }, [users]);

  const parentMap = useMemo(() => {
    const map: Record<string, string | null> = {};
    users.forEach(u => {
      map[String(u.id)] = u.manager_id ? String(u.manager_id) : null;
    });
    return map;
  }, [users]);

  const expandPathTo = (userId: string) => {
    const updates: Record<string, boolean> = {};
    let cur: string | null = userId;
    while (cur) {
      updates[cur] = true;
      cur = parentMap[cur] || null;
    }
    setExpanded(prev => ({ ...prev, ...updates }));
    // Прокрутка к карточке
    setTimeout(() => {
      const el = document.getElementById(`user-${userId}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  };

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const q = searchQuery.toLowerCase();
    const list = users.filter(u => {
      const hay = [u.first_name, u.last_name, u.middle_name, u.email, u.position, u.mattermost_username]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    }).slice(0, 10);
    setSearchResults(list);
  }, [searchQuery, users]);

  const toggle = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const Card: React.FC<{ node: TreeNode; level: number }> = ({ node, level }) => {
    const isOpen = !!expanded[node.id];
    const hasChildren = node.children && node.children.length > 0;
    return (
      <div className="ml-4" id={`user-${node.id}`}>
        <div className="flex items-start gap-2">
          {hasChildren && (
            <button
              type="button"
              onClick={() => toggle(node.id)}
              className="mt-1 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800"
              title={isOpen ? 'Свернуть' : 'Развернуть'}
            >
              {isOpen ? '▼' : '▶'}
            </button>
          )}
          <div className="bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 p-3 shadow-sm min-w-[260px]">
            <div className="flex items-center gap-3 mb-2">
              <Avatar userId={node.id} size={40} />
              <div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                  {node.last_name} {node.first_name}{node.middle_name ? ` ${node.middle_name}` : ''}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{node.position || '—'}</div>
              </div>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{node.email}</div>
            {node.mattermost_username && (
              <div className="text-xs text-gray-500 dark:text-gray-400">MM: @{node.mattermost_username}</div>
            )}
            {node.department && (
              <div className="text-xs text-gray-500 dark:text-gray-400">Отдел: {node.department}</div>
            )}
            {node.role && (
              <div className="text-xs text-gray-500 dark:text-gray-400">Роль: {node.role}</div>
            )}
          </div>
        </div>
        {hasChildren && isOpen && (
          <div className="ml-6 mt-2 border-l border-gray-300 dark:border-gray-700 pl-3">
            {node.children.map(ch => (
              <Card key={ch.id} node={ch} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Орг. структура</h1>
      </div>
      {/* Поиск сотрудника */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-3">
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Поиск сотрудника: ФИО, email, должность, Mattermost"
            className="flex-1 px-3 py-2 border rounded dark:bg-gray-700 dark:text-white border-gray-300 dark:border-gray-600"
          />
          <button
            type="button"
            onClick={() => { if (searchResults[0]) expandPathTo(String(searchResults[0].id)); }}
            className="px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded"
            disabled={searchResults.length === 0}
          >
            Показать
          </button>
        </div>
        {searchQuery.trim() && searchResults.length > 0 && (
          <div className="mt-2 max-h-60 overflow-auto divide-y divide-gray-100 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded">
            {searchResults.map(u => (
              <button
                key={u.id}
                type="button"
                onClick={() => expandPathTo(String(u.id))}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <div className="text-sm text-gray-900 dark:text-white font-medium">{u.last_name} {u.first_name}{u.middle_name ? ` ${u.middle_name}` : ''}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{u.email}{u.position ? ` • ${u.position}` : ''}{u.mattermost_username ? ` • @${u.mattermost_username}` : ''}</div>
              </button>
            ))}
          </div>
        )}
      </div>
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>
      ) : (
        <div>
          {roots.length === 0 ? (
            <div className="text-gray-500 dark:text-gray-400">Нет данных для отображения структуры (проверьте, что у сотрудников указан руководитель).</div>
          ) : (
            <div>
              {roots.map(root => (
                <div key={root.id} className="mb-4">
                  <Card node={root} level={0} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StructurePage;


