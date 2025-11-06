
import React, { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';

interface CompetenceMatrixEntry {
  id: number;
  competency_id: string;
  competency_name: string;
  competency_description: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_position?: string;
  user_department?: string;
  level: 'junior' | 'middle' | 'senior';
  score: number;
  assessment_date: string;
  notes?: string;
  source?: 'training' | 'manual';
}

interface Competency {
  id: string;
  name: string;
  description: string;
  is_active?: boolean;
}

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  position?: string;
  department?: string;
}

const CompetenceMatrixPage: React.FC = () => {
  const [matrixData, setMatrixData] = useState<CompetenceMatrixEntry[]>([]);
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedCompetencyIds, setSelectedCompetencyIds] = useState<string[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [competencySearchQuery, setCompetencySearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Загружаем матрицу компетенций всех пользователей
      const [matrixResponse, competenciesResponse, usersResponse, growthPlansResponse] = await Promise.all([
        api.get('/learning/competence-matrix/all').catch(err => {
          console.error('Matrix API error:', err);
          // Если нет прав, пробуем получить только свои компетенции
          return api.get('/learning/competence-matrix').catch(() => ({ data: [] }));
        }),
        api.get('/learning/competencies').catch(err => {
          console.error('Competencies API error:', err);
          return { data: [] };
        }),
        api.get('/learning/users').catch(err => {
          console.error('Users API error:', err);
          return { data: [] };
        }),
        api.get('/learning/growth-plans').catch(err => {
          console.error('Growth plans API error:', err);
          return { data: [] };
        })
      ]);

      let matrixEntries: CompetenceMatrixEntry[] = [];
      
      // Обрабатываем данные матрицы
      const matrixItems = Array.isArray(matrixResponse.data) ? matrixResponse.data : [];
      matrixItems.forEach((item: any) => {
        matrixEntries.push({
          id: item.id,
          competency_id: item.competency_id,
          competency_name: item.competency_name,
          competency_description: item.competency_description || '',
          user_id: item.user_id,
          user_name: item.first_name && item.last_name 
            ? `${item.last_name} ${item.first_name}` 
            : item.email || '',
          user_email: item.email || '',
          user_position: item.position,
          user_department: item.department,
          level: item.level,
          score: item.score || 0,
          assessment_date: item.assessment_date,
          notes: item.notes,
          source: item.source || 'training'
        });
      });

      // Обрабатываем компетенции из пройденных тестов
      const growthPlans = Array.isArray(growthPlansResponse.data) ? growthPlansResponse.data : [];
      const competenciesList = Array.isArray(competenciesResponse.data) ? competenciesResponse.data : [];
      
      growthPlans.forEach((plan: any) => {
        if (Array.isArray(plan.test_results) && Array.isArray(plan.courses)) {
          plan.test_results.forEach((testResult: any) => {
            if (testResult.status === 'passed' && testResult.course_id) {
              const course = plan.courses.find((c: any) => c.id === testResult.course_id);
              
              if (course) {
                // Ищем компетенцию по названию
                let matchedCompetency: Competency | null = null;
                matchedCompetency = competenciesList.find((comp: any) => 
                  comp.name && course.name && 
                  (comp.name.toLowerCase().includes(course.name.toLowerCase()) ||
                   course.name.toLowerCase().includes(comp.name.toLowerCase()))
                );
                
                // Проверяем, есть ли уже запись в матрице
                const existingEntry = matrixEntries.find(
                  (e: CompetenceMatrixEntry) => 
                    e.user_id === plan.user_id &&
                    ((matchedCompetency && e.competency_id === matchedCompetency.id) ||
                     (!matchedCompetency && e.competency_name === course.name))
                );
                
                if (!existingEntry) {
                  const userName = plan.first_name && plan.last_name 
                    ? `${plan.last_name} ${plan.first_name}` 
                    : plan.email || '';
                  
                  matrixEntries.push({
                    id: `test-${testResult.id}` as any,
                    competency_id: matchedCompetency?.id || `course-${course.id}`,
                    competency_name: matchedCompetency?.name || course.name,
                    competency_description: matchedCompetency?.description || course.description || '',
                    user_id: plan.user_id,
                    user_name: userName,
                    user_email: plan.email || '',
                    user_position: plan.position,
                    user_department: plan.department,
                    level: course.target_level as 'junior' | 'middle' | 'senior',
                    score: 75,
                    assessment_date: testResult.test_date,
                    notes: `Получено через успешное прохождение теста по курсу "${course.name}"`,
                    source: 'training'
                  });
                }
              }
            }
          });
        }
      });

      setMatrixData(matrixEntries);
      setCompetencies(competenciesList);
      setUsers(Array.isArray(usersResponse.data) ? usersResponse.data : []);
      
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Фильтруем пользователей для поиска
  const filteredUsers = useMemo(() => {
    if (!userSearchQuery) return users;
    const query = userSearchQuery.toLowerCase();
    return users.filter(user => 
      `${user.last_name} ${user.first_name}`.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      (user.position && user.position.toLowerCase().includes(query))
    );
  }, [users, userSearchQuery]);

  // Фильтруем компетенции для поиска
  const filteredCompetencies = useMemo(() => {
    if (!competencySearchQuery) return competencies;
    const query = competencySearchQuery.toLowerCase();
    return competencies.filter(comp => 
      comp.name.toLowerCase().includes(query) ||
      (comp.description && comp.description.toLowerCase().includes(query))
    );
  }, [competencies, competencySearchQuery]);

  // Получаем уникальный список компетенций из матрицы
  const uniqueCompetencies = useMemo(() => {
    const compMap = new Map<string, Competency>();
    matrixData.forEach(entry => {
      if (!compMap.has(entry.competency_id)) {
        compMap.set(entry.competency_id, {
          id: entry.competency_id,
          name: entry.competency_name,
          description: entry.competency_description
        });
      }
    });
    return Array.from(compMap.values());
  }, [matrixData]);

  // Получаем уникальный список пользователей из матрицы
  const uniqueUsers = useMemo(() => {
    const userMap = new Map<string, User>();
    matrixData.forEach(entry => {
      if (!userMap.has(entry.user_id)) {
        userMap.set(entry.user_id, {
          id: entry.user_id,
          first_name: entry.user_name.split(' ')[1] || '',
          last_name: entry.user_name.split(' ')[0] || '',
          email: entry.user_email,
          position: entry.user_position,
          department: entry.user_department
        });
      }
    });
    return Array.from(userMap.values());
  }, [matrixData]);

  // Фильтруем данные матрицы
  const filteredMatrix = useMemo(() => {
    let filtered = matrixData;

    // Фильтр по пользователям
    if (selectedUserIds.length > 0) {
      filtered = filtered.filter(entry => selectedUserIds.includes(entry.user_id));
    }

    // Фильтр по компетенциям (показываем сотрудников, у которых есть хотя бы одна из выбранных)
    if (selectedCompetencyIds.length > 0) {
      const userIdsWithSelectedCompetencies = new Set<string>();
      filtered.forEach(entry => {
        if (selectedCompetencyIds.includes(entry.competency_id)) {
          userIdsWithSelectedCompetencies.add(entry.user_id);
        }
      });
      filtered = filtered.filter(entry => userIdsWithSelectedCompetencies.has(entry.user_id));
    }

    return filtered;
  }, [matrixData, selectedUserIds, selectedCompetencyIds]);

  // Группируем данные по пользователям
  const matrixByUser = useMemo(() => {
    const userMap = new Map<string, Map<string, CompetenceMatrixEntry>>();
    
    filteredMatrix.forEach(entry => {
      if (!userMap.has(entry.user_id)) {
        userMap.set(entry.user_id, new Map());
      }
      const userCompetencies = userMap.get(entry.user_id)!;
      // Если компетенция уже есть, берем более свежую
      const existing = userCompetencies.get(entry.competency_id);
      if (!existing || new Date(entry.assessment_date) > new Date(existing.assessment_date)) {
        userCompetencies.set(entry.competency_id, entry);
      }
    });

    return userMap;
  }, [filteredMatrix]);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'junior': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'middle': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'senior': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'junior': return '🌱';
      case 'middle': return '🌿';
      case 'senior': return '🌳';
      default: return '❓';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-blue-600 dark:text-blue-400';
    if (score >= 40) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleCompetencySelection = (competencyId: string) => {
    setSelectedCompetencyIds(prev => 
      prev.includes(competencyId)
        ? prev.filter(id => id !== competencyId)
        : [...prev, competencyId]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const sortedUsers = Array.from(matrixByUser.keys())
    .map(userId => uniqueUsers.find(u => u.id === userId))
    .filter((u): u is User => u !== undefined)
    .sort((a, b) => {
      const nameA = `${a.last_name} ${a.first_name}`;
      const nameB = `${b.last_name} ${b.first_name}`;
      return nameA.localeCompare(nameB);
    });

  const sortedCompetencies = uniqueCompetencies.sort((a, b) => 
    a.name.localeCompare(b.name)
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          🧠 Матрица компетенций
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Просмотр компетенций всех сотрудников
        </p>
      </div>

      {/* Фильтры */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Фильтр по сотрудникам */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Поиск сотрудников
            </label>
            <input
              type="text"
              value={userSearchQuery}
              onChange={(e) => setUserSearchQuery(e.target.value)}
              placeholder="Введите имя, email или должность..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white mb-3"
            />
            <div className="max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md">
              {filteredUsers.length === 0 ? (
                <div className="p-3 text-gray-500 dark:text-gray-400 text-sm">
                  Сотрудники не найдены
                </div>
              ) : (
                filteredUsers.map(user => (
                  <label
                    key={user.id}
                    className="flex items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedUserIds.includes(user.id)}
                      onChange={() => toggleUserSelection(user.id)}
                      className="mr-2 text-blue-500"
                    />
                    <span className="text-sm text-gray-900 dark:text-white">
                      {user.last_name} {user.first_name}
                      {user.position && <span className="text-gray-500 dark:text-gray-400 ml-2">({user.position})</span>}
                    </span>
                  </label>
                ))
              )}
            </div>
            {selectedUserIds.length > 0 && (
              <button
                onClick={() => setSelectedUserIds([])}
                className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
              >
                Очистить выбранные ({selectedUserIds.length})
              </button>
            )}
          </div>

          {/* Фильтр по компетенциям */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Поиск компетенций
            </label>
            <input
              type="text"
              value={competencySearchQuery}
              onChange={(e) => setCompetencySearchQuery(e.target.value)}
              placeholder="Введите название компетенции..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white mb-3"
            />
            <div className="max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md">
              {filteredCompetencies.length === 0 ? (
                <div className="p-3 text-gray-500 dark:text-gray-400 text-sm">
                  Компетенции не найдены
                </div>
              ) : (
                filteredCompetencies.map(comp => (
                  <label
                    key={comp.id}
                    className="flex items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCompetencyIds.includes(comp.id)}
                      onChange={() => toggleCompetencySelection(comp.id)}
                      className="mr-2 text-blue-500"
                    />
                    <span className="text-sm text-gray-900 dark:text-white">
                      {comp.name}
                    </span>
                  </label>
                ))
              )}
            </div>
            {selectedCompetencyIds.length > 0 && (
              <button
                onClick={() => setSelectedCompetencyIds([])}
                className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
              >
                Очистить выбранные ({selectedCompetencyIds.length})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Таблица матрицы */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider sticky left-0 bg-gray-50 dark:bg-gray-700 z-10">
                  Сотрудник
                </th>
                {sortedCompetencies.map(comp => (
                  <th
                    key={comp.id}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[120px]"
                    title={comp.description}
                  >
                    <div className="truncate">{comp.name}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {sortedUsers.length === 0 ? (
                <tr>
                  <td colSpan={sortedCompetencies.length + 1} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    Нет данных для отображения
                  </td>
                </tr>
              ) : (
                sortedUsers.map(user => {
                  const userCompetencies = matrixByUser.get(user.id) || new Map();
                  return (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3 whitespace-nowrap sticky left-0 bg-white dark:bg-gray-800 z-10 border-r border-gray-200 dark:border-gray-700">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {user.last_name} {user.first_name}
                        </div>
                        {user.position && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {user.position}
                          </div>
                        )}
                        {user.email && (
                          <div className="text-xs text-gray-400 dark:text-gray-500">
                            {user.email}
                          </div>
                        )}
                      </td>
                      {sortedCompetencies.map(comp => {
                        const entry = userCompetencies.get(comp.id);
                        return (
                          <td key={comp.id} className="px-4 py-3 text-center">
                            {entry ? (
                              <div className="flex flex-col items-center">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(entry.level)}`}>
                                  {getLevelIcon(entry.level)} {entry.level}
                                </span>
                                <span className={`text-xs font-medium mt-1 ${getScoreColor(entry.score)}`}>
                                  {entry.score}/100
                                </span>
                                <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                  {new Date(entry.assessment_date).toLocaleDateString('ru-RU')}
                                </span>
                                {entry.source && (
                                  <span 
                                    className={`text-xs mt-1 px-2 py-0.5 rounded ${
                                      entry.source === 'manual' 
                                        ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400' 
                                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                                    }`}
                                    title={entry.source === 'manual' ? 'Указано вручную' : 'Получено через обучение'}
                                  >
                                    {entry.source === 'manual' ? '✏️ Вручную' : '📚 Обучение'}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-300 dark:text-gray-600">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {sortedUsers.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-md mt-6">
          <div className="text-6xl mb-4">🧠</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Данные не найдены
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Используйте фильтры для поиска сотрудников и компетенций
          </p>
        </div>
      )}
    </div>
  );
};

export default CompetenceMatrixPage;
