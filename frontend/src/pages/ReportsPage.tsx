import React, { useState, useEffect } from 'react';
// import { Link } from 'react-router-dom';
// Layout убран - компонент оборачивается в Layout на уровне роутинга
import { useAuth } from '../contexts/AuthContext';
import { 
  CategoryBarChart, 
  CategoryRadarChart, 
  OverallScoreDisplay, 
  ComparisonChart,
  OverlayRadarChart,
  ScoreDistributionChart
} from '../components/ReportCharts';
import api from '../services/api';

interface Report {
  id: number;
  cycle_id: number;
  user_id: number;
  cycle_name: string;
  participant_name: string;
  data: string;
  created_at: string;
  updated_at: string;
}

interface Cycle {
  id: string;
  name: string;
  status: string;
  participants: Participant[];
}

interface Participant {
  id: string;
  user_id: string;
  name: string;
  email: string;
  status: string;
}

interface CategoryAverage {
  id: number;
  name: string;
  color: string;
  average: number;
  count: number;
}

interface CycleAnalytics {
  totalRespondents: number;
  categoryAverages: CategoryAverage[];
  participantSummaries: Array<{
    userId: string;
    userName: string;
    categoryAverages: CategoryAverage[];
    overallAverage: number;
    totalResponses: number;
  }>;
  overallAverage: number;
}

export const ReportsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'cycle' | 'users' | 'departments' | 'employee'>('cycle');
  const [userCompareItems, setUserCompareItems] = useState<Array<{ userId: string; cycleId?: string }>>([]);
  const [departmentIds, setDepartmentIds] = useState<string[]>([]);
  const [departmentsData, setDepartmentsData] = useState<any[]>([]);
  const [usersAll, setUsersAll] = useState<any[]>([]);
  const [usersQuery, setUsersQuery] = useState('');
  const [departmentsAll, setDepartmentsAll] = useState<any[]>([]);
  const [departmentsQuery, setDepartmentsQuery] = useState('');

  // Состояние аналитики сотрудника
  const [employeeUserId, setEmployeeUserId] = useState<string | null>(null);
  const [employeeCycleId, setEmployeeCycleId] = useState<string | null>(null);
  const [employeeData, setEmployeeData] = useState<any | null>(null);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [selectedCycle, setSelectedCycle] = useState<string | null>(null);
  const [cycleAnalytics, setCycleAnalytics] = useState<CycleAnalytics | null>(null);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [comparisonData, setComparisonData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCycles();
  }, []);

  useEffect(() => {
    if ((activeTab === 'users' || activeTab === 'employee') && usersAll.length === 0) {
      (async () => {
        try {
          const res = await api.get('/users');
          const data = res.data?.success ? res.data.data : res.data;
          setUsersAll(Array.isArray(data) ? data : []);
        } catch (e) {
          console.error('Ошибка загрузки пользователей:', e);
        }
      })();
    } else if (activeTab === 'departments' && departmentsAll.length === 0) {
      (async () => {
        try {
          const res = await api.get('/departments');
          const data = res.data?.success ? res.data.data : res.data;
          setDepartmentsAll(Array.isArray(data) ? data : []);
        } catch (e) {
          console.error('Ошибка загрузки отделов:', e);
        }
      })();
    }
  }, [activeTab, usersAll.length, departmentsAll.length]);

  // удалено: загрузка сохраненных отчетов

  const loadUserComparison = async () => {
    if (userCompareItems.length < 2) return;
    try {
      const response = await api.post(`/reports/compare-items`, { items: userCompareItems });
      const payload = response.data?.items || [];
      const mapped = payload.map((p: any, idx: number) => ({
        participantId: String(p.participant?.id || idx),
        participantName: p.participant?.name || p.participant?.email || `Сотрудник ${idx + 1}`,
        overallAverage: Number(p.overallScore || 0),
        categoryAverages: Array.isArray(p.categoryScores) ? p.categoryScores.map((c: any, cidx: number) => ({
          id: cidx,
          name: c.category,
          color: c.color,
          average: Number(c.avgScore || 0),
          count: 0
        })) : []
      }));
      setComparisonData(mapped);
    } catch (error) {
      console.error('Ошибка сравнения сотрудников:', error);
      setError('Не удалось загрузить сравнение сотрудников');
    }
  };

  const loadDepartmentsComparison = async () => {
    try {
      const params: any = {};
      if (selectedCycle) params.cycleId = selectedCycle;
      if (departmentIds.length > 0) params.departmentIds = departmentIds.join(',');
      const response = await api.get(`/reports/departments/compare`, { params });
      setDepartmentsData(response.data?.departments || []);
    } catch (error) {
      console.error('Ошибка сравнения отделов:', error);
      setError('Не удалось загрузить сравнение отделов');
    }
  };

  const loadEmployeeAnalytics = async () => {
    if (!employeeUserId) return;
    try {
      setEmployeeData(null);
      const res = await api.get(`/reports/user/${employeeUserId}/analytics`, {
        params: { cycleId: employeeCycleId || undefined }
      });
      setEmployeeData(res.data);
    } catch (e) {
      console.error('Ошибка аналитики сотрудника:', e);
      setError('Не удалось загрузить аналитику сотрудника');
    }
  };

  const loadCycles = async () => {
    try {
      const response = await api.get('/cycles');
      // Обрабатываем новый формат API
      const cyclesData = response.data?.success ? response.data.data : response.data;
      setCycles(Array.isArray(cyclesData) ? cyclesData : []);
    } catch (error) {
      console.error('Ошибка при загрузке циклов:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCycleAnalytics = async (cycleId: string) => {
    try {
      const response = await api.get(`/reports/cycle/${cycleId}/analytics`);
      const data = response.data;

      const totalRespondents = Array.isArray(data.scoreDistribution)
        ? data.scoreDistribution.reduce((sum: number, d: any) => sum + Number(d.count || 0), 0)
        : 0;

      const categoryAverages = Array.isArray(data.avgScores)
        ? data.avgScores.map((item: any, idx: number) => ({
            id: idx,
            name: item.category,
            color: item.color,
            average: Number(item.avgScore || 0),
            count: 0,
          }))
        : [];

      // Параллельно получаем участников цикла и их средние баллы
      const [cycleRes, compareRes] = await Promise.all([
        api.get(`/cycles/${cycleId}`),
        api.get(`/reports/compare/${cycleId}`)
      ]);

      const cycleData = cycleRes.data?.data || cycleRes.data || {};
      const rawParticipants = Array.isArray(cycleData.participants) ? cycleData.participants : [];

      const comparePayload = compareRes.data || {};
      const scoresByParticipant: Record<string, number> = {};
      if (Array.isArray(comparePayload.participants)) {
        for (const p of comparePayload.participants) {
          const pid = String(p.participant?.id || p.participantId || '');
          scoresByParticipant[pid] = Number(p.overallScore || 0);
        }
      }

      const participantSummaries: CycleAnalytics['participantSummaries'] = rawParticipants.map((p: any) => ({
        userId: String(p.id),
        userName: `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || p.email || 'Участник',
        categoryAverages: [],
        overallAverage: scoresByParticipant[String(p.id)] ?? 0,
        totalResponses: Array.isArray(p.respondents) ? p.respondents.length : 0,
      }));

      const normalized: CycleAnalytics = {
        totalRespondents,
        categoryAverages,
        participantSummaries,
        overallAverage: Number(data.overallAverage || 0),
      };

      setCycleAnalytics(normalized);
      setError(null);
    } catch (error) {
      console.error('Ошибка при загрузке аналитики:', error);
      setError('Не удалось загрузить аналитику');
    }
  };

  const generateReport = async (participantId: string) => {
    try {
      setGenerating(participantId);
      await api.post(`/reports/generate/${participantId}`);
      setError(null);
    } catch (error: any) {
      console.error('Ошибка при генерации отчета:', error);
      setError('Не удалось создать отчет');
    } finally {
      setGenerating(null);
    }
  };

  const handleCycleChange = (cycleId: string) => {
    setSelectedCycle(cycleId);
    setCycleAnalytics(null);
    setSelectedParticipants([]);
    setComparisonData([]);
    loadCycleAnalytics(cycleId);
  };

  const handleParticipantSelect = (participantId: string) => {
    setSelectedParticipants(prev => 
      prev.includes(participantId) 
        ? prev.filter(id => id !== participantId)
        : [...prev, participantId]
    );
  };

  const loadComparison = async () => {
    if (!selectedCycle || selectedParticipants.length < 2) return;

    try {
      const response = await api.get(`/reports/compare/${selectedCycle}`, {
        params: { participants: selectedParticipants }
      });
      const payload = response.data;
      const mapped = Array.isArray(payload?.participants) ? payload.participants.map((p: any, idx: number) => ({
        participantId: String(p.participant?.id || p.participantId || idx),
        participantName: p.participant?.name || p.participantName || p.participant?.email || `Участник ${idx+1}`,
        overallAverage: Number(p.overallScore || 0),
        categoryAverages: Array.isArray(p.categoryScores)
          ? p.categoryScores.map((c: any, cidx: number) => ({
              id: cidx,
              name: c.category,
              color: c.color,
              average: Number(c.avgScore || 0),
              count: 0,
            }))
          : [],
      })) : [];
      setComparisonData(mapped);
    } catch (error) {
      console.error('Ошибка при загрузке сравнения:', error);
      setError('Не удалось загрузить сравнение');
    }
  };

  const canManageReports = user?.role === 'admin' || user?.role === 'manager';

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // const selectedCycleData = Array.isArray(cycles) ? cycles.find(c => c.id === selectedCycle) : null;

  return (
    <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Отчеты и аналитика
          </h1>
          <div />
        </div>

        {/* Вкладки */}
        <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-6" aria-label="Tabs">
            {[
              { key: 'cycle', label: 'Аналитика цикла' },
              { key: 'employee', label: 'Аналитика сотрудника' },
              { key: 'users', label: 'Сравнение сотрудников' },
              { key: 'departments', label: 'Сравнение отделов' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`${activeTab === tab.key ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {activeTab === 'cycle' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Боковая панель с управлением */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Управление отчетами
              </h2>
              
              {/* Выбор цикла */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Выберите цикл
                </label>
                <select
                  value={selectedCycle || ''}
                  onChange={(e) => handleCycleChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Выберите цикл</option>
                  {Array.isArray(cycles) ? cycles.map(cycle => (
                    <option key={cycle.id} value={cycle.id}>
                      {cycle.name}
                    </option>
                  )) : null}
                </select>
              </div>

              {/* Блок "Генерация отчетов" удален по требованию */}

              {/* Блок "Сравнение участников" удален по требованию */}

              {/* Удален блок сохраненных отчетов по требованию */}
            </div>
          </div>

          {/* Основная область с аналитикой */}
          <div className="lg:col-span-2">
            {!selectedCycle ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
                <div className="text-gray-500 dark:text-gray-400 mb-4">
                  <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Выберите цикл для анализа
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Выберите цикл оценки из боковой панели, чтобы просмотреть аналитику и отчеты.
                </p>
              </div>
            ) : cycleAnalytics ? (
              <div className="space-y-6">
                {/* Общая статистика */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <OverallScoreDisplay
                    score={cycleAnalytics.overallAverage}
                    title="Общий средний балл"
                  />
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                      Статистика
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">Участников:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {cycleAnalytics.participantSummaries.length}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">Всего ответов:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {cycleAnalytics.totalRespondents}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">Категорий:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {cycleAnalytics.categoryAverages.length}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Графики */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <CategoryBarChart
                    data={cycleAnalytics.categoryAverages}
                    title="Средние оценки по категориям"
                  />
                  <CategoryRadarChart
                    data={cycleAnalytics.categoryAverages}
                    title="Радарная диаграмма компетенций"
                  />
                </div>

                {/* Блок "Сравнение участников" удален по требованию */}

                {/* Список участников */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Участники цикла
                  </h3>
                  <div className="space-y-3">
                    {cycleAnalytics.participantSummaries.map(participant => (
                      <div key={participant.userId} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {participant.userName}
                        </span>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {participant.totalResponses} ответов
                          </span>
                          <span className="text-lg font-bold text-primary-600">
                            {participant.overallAverage.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              </div>
            )}
          </div>
        </div>
        )}

        {activeTab === 'users' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-md font-medium text-gray-900 dark:text-white mb-3">Подбор сотрудников</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Добавьте минимум двух сотрудников (можно из разных циклов) для сравнения</p>
                <input
                  value={usersQuery}
                  onChange={e => setUsersQuery(e.target.value)}
                  className="w-full mb-2 px-3 py-2 border rounded dark:bg-gray-700 dark:text-white"
                  placeholder="Поиск: имя, фамилия, email, должность, Mattermost..."
                />
                <div className="max-h-60 overflow-auto border border-gray-200 dark:border-gray-700 rounded">
                  {usersAll
                    .filter(u => {
                      if (!usersQuery.trim()) return true;
                      const q = usersQuery.toLowerCase();
                      const hay = [u.first_name, u.last_name, u.email, u.position, u.old_department, u.mattermost_username]
                        .filter(Boolean)
                        .join(' ')
                        .toLowerCase();
                      return hay.includes(q);
                    })
                    .slice(0, 20)
                    .map(u => (
                      <div key={u.id} className="flex items-center justify-between px-3 py-2 border-b last:border-b-0 border-gray-100 dark:border-gray-700">
                        <div className="text-sm text-gray-900 dark:text-white">
                          <div className="font-medium">{u.first_name} {u.last_name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{u.email}{u.position ? ` • ${u.position}` : ''}</div>
                        </div>
                        <button
                          onClick={() => setUserCompareItems(prev => prev.find(p => p.userId === u.id) ? prev : [...prev, { userId: u.id, cycleId: undefined }])}
                          className="px-2 py-1 text-sm bg-primary-600 text-white rounded"
                        >Добавить</button>
                      </div>
                  ))}
                </div>

                {userCompareItems.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {userCompareItems.map((it, idx) => {
                      const u = usersAll.find(x => x.id === it.userId);
                      return (
                        <div key={idx} className="p-2 bg-gray-50 dark:bg-gray-700 rounded">
                          <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-900 dark:text-white">
                              {u ? `${u.first_name} ${u.last_name} • ${u.email}` : it.userId}
                            </div>
                            <button onClick={() => setUserCompareItems(prev => prev.filter((_,i)=>i!==idx))} className="px-2 py-1 text-sm bg-gray-200 dark:bg-gray-600 rounded">Удалить</button>
                          </div>
                          <div className="mt-2">
                            <select
                              value={it.cycleId || ''}
                              onChange={e => setUserCompareItems(prev => prev.map((p,i)=> i===idx ? { ...p, cycleId: e.target.value || undefined } : p))}
                              className="w-full px-2 py-1 border rounded dark:bg-gray-800 dark:text-white"
                            >
                              <option value="">Без указания цикла (последний)</option>
                              {cycles.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <button onClick={loadUserComparison} disabled={userCompareItems.filter(i=>i.userId).length<2} className="w-full mt-3 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded font-medium disabled:opacity-50">Сравнить сотрудников</button>
              </div>
            </div>
            <div className="lg:col-span-2">
              {comparisonData.length>0 ? (
                <div className="space-y-6">
                  <ComparisonChart data={comparisonData as any} title="Сравнение сотрудников (столбцы)" />
                  <OverlayRadarChart data={comparisonData as any} title="Сравнение профилей (радар)" />
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-500 dark:text-gray-400">Добавьте сотрудников и нажмите "Сравнить"</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'employee' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Справочник сотрудников + выбор цикла */}
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-md font-medium text-gray-900 dark:text-white mb-3">Выбор сотрудника</h3>
                <input
                  value={usersQuery}
                  onChange={e => setUsersQuery(e.target.value)}
                  className="w-full mb-2 px-3 py-2 border rounded dark:bg-gray-700 dark:text-white"
                  placeholder="Поиск: имя, фамилия, email, должность, Mattermost..."
                />
                <div className="max-h-60 overflow-auto border border-gray-200 dark:border-gray-700 rounded">
                  {usersAll
                    .filter(u => {
                      if (!usersQuery.trim()) return true;
                      const q = usersQuery.toLowerCase();
                      const hay = [u.first_name, u.last_name, u.email, u.position, u.old_department, u.mattermost_username]
                        .filter(Boolean)
                        .join(' ')
                        .toLowerCase();
                      return hay.includes(q);
                    })
                    .slice(0, 20)
                    .map(u => (
                      <button
                        key={u.id}
                        onClick={() => { setEmployeeUserId(u.id); }}
                        className={`w-full text-left px-3 py-2 border-b last:border-b-0 border-gray-100 dark:border-gray-700 ${employeeUserId===u.id?'bg-gray-100 dark:bg-gray-700':''}`}
                      >
                        <div className="text-sm text-gray-900 dark:text-white font-medium">{u.first_name} {u.last_name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{u.email}{u.position ? ` • ${u.position}` : ''}</div>
                      </button>
                  ))}
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Цикл (опционально)</label>
                  <select
                    value={employeeCycleId || ''}
                    onChange={(e)=> setEmployeeCycleId(e.target.value || null)}
                    className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Последний</option>
                    {cycles.map(c=>(<option key={c.id} value={c.id}>{c.name}</option>))}
                  </select>
                </div>

                <button onClick={loadEmployeeAnalytics} disabled={!employeeUserId} className="w-full mt-3 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded font-medium disabled:opacity-50">Показать аналитику</button>
              </div>
            </div>

            {/* Вывод аналитики */}
            <div className="lg:col-span-2 space-y-6">
              {!employeeData ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-500 dark:text-gray-400">Выберите сотрудника и нажмите "Показать аналитику"</div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <OverallScoreDisplay score={Number(employeeData?.overallAverage || 0)} title="Общий средний балл" />
                    <ScoreDistributionChart title="Распределение оценок" distribution={(()=>{const init:any={1:0,2:0,3:0,4:0,5:0}; (employeeData?.scoreDistribution||[]).forEach((d:any)=>{const s=Number(d.score); if(init[s]!==undefined) init[s]=Number(d.count||0)}); return init;})()} />
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <CategoryBarChart data={(employeeData?.avgScores||[]).map((x:any,i:number)=>({id:i,name:x.category,color:x.color,average:Number(x.avgScore||0),count:0}))} title="Средние оценки по категориям" />
                    <CategoryRadarChart data={(employeeData?.avgScores||[]).map((x:any,i:number)=>({id:i,name:x.category,color:x.color,average:Number(x.avgScore||0),count:0}))} title="Профиль компетенций" />
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Ответы респондентов</h3>
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {Array.isArray(employeeData?.responses) && employeeData.responses.length>0 ? employeeData.responses.map((r:any,idx:number)=>(
                        <div key={idx} className="py-3">
                          <div className="text-sm text-gray-500 dark:text-gray-400">Категория: {r.category}</div>
                          <div className="font-medium text-gray-900 dark:text-white">{r.question}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-300">Оценка: {r.score}{r.respondent?` • ${r.respondent}`:''}{r.respondentType?` • ${r.respondentType}`:''}</div>
                          {r.comment && (<div className="mt-1 text-sm text-gray-700 dark:text-gray-300">Комментарий: {r.comment}</div>)}
                        </div>
                      )) : (
                        <div className="text-gray-500 dark:text-gray-400">Нет ответов</div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {activeTab === 'departments' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-md font-medium text-gray-900 dark:text-white mb-3">Выбор отделов</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Выберите отделы из справочника</p>
                <input
                  value={departmentsQuery}
                  onChange={e => setDepartmentsQuery(e.target.value)}
                  className="w-full mb-2 px-3 py-2 border rounded dark:bg-gray-700 dark:text-white"
                  placeholder="Поиск отдела: название, код, руководитель..."
                />
                <div className="max-h-60 overflow-auto border border-gray-200 dark:border-gray-700 rounded">
                  {departmentsAll
                    .filter(d => {
                      if (!departmentsQuery.trim()) return true;
                      const q = departmentsQuery.toLowerCase();
                      const hay = [d.name, d.description, d.code, d.head_name]
                        .filter(Boolean)
                        .join(' ')
                        .toLowerCase();
                      return hay.includes(q);
                    })
                    .slice(0, 20)
                    .map(d => (
                      <div key={d.id} className="flex items-center justify-between px-3 py-2 border-b last:border-b-0 border-gray-100 dark:border-gray-700">
                        <div className="text-sm text-gray-900 dark:text-white">
                          <div className="font-medium">{d.name}{d.code ? ` • ${d.code}` : ''}</div>
                          {d.head_name && (<div className="text-xs text-gray-500 dark:text-gray-400">Руководитель: {d.head_name}</div>)}
                        </div>
                        <button
                          onClick={() => setDepartmentIds(prev => prev.includes(d.id) ? prev : [...prev, d.id])}
                          className="px-2 py-1 text-sm bg-primary-600 text-white rounded"
                        >Добавить</button>
                      </div>
                  ))}
                </div>

                {departmentIds.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {departmentIds.map((id, idx) => {
                      const d = departmentsAll.find(x => x.id === id);
                      return (
                        <div key={id} className="flex items-center justify-between px-2 py-1 bg-gray-50 dark:bg-gray-700 rounded">
                          <span className="text-sm text-gray-900 dark:text-white">{d ? d.name : id}</span>
                          <button onClick={() => setDepartmentIds(prev => prev.filter((_,i)=>i!==idx))} className="px-2 py-1 text-sm bg-gray-200 dark:bg-gray-600 rounded">Удалить</button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <button onClick={loadDepartmentsComparison} className="w-full mt-3 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded font-medium">Сравнить отделы</button>
              </div>
            </div>
            <div className="lg:col-span-2">
              {departmentsData.length>0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Отделы</h3>
                  <CategoryBarChart data={departmentsData.map((d:any, idx:number)=>({ id: idx, name: d.departmentName, color: '#3B82F6', average: d.overallScore, count: 0 }))} title="Общая оценка по отделам" />
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-500 dark:text-gray-400">Укажите отделы и нажмите "Сравнить отделы"</div>
              )}
            </div>
          </div>
        )}
      </div>
  );
}; 