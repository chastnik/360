import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { 
  CategoryBarChart, 
  CategoryRadarChart, 
  OverallScoreDisplay, 
  ComparisonChart 
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
  id: number;
  name: string;
  status: string;
  participants: Participant[];
}

interface Participant {
  id: number;
  user_id: number;
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
    userId: number;
    userName: string;
    categoryAverages: CategoryAverage[];
    overallAverage: number;
    totalResponses: number;
  }>;
  overallAverage: number;
}

export const ReportsPage: React.FC = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [selectedCycle, setSelectedCycle] = useState<number | null>(null);
  const [cycleAnalytics, setCycleAnalytics] = useState<CycleAnalytics | null>(null);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [comparisonData, setComparisonData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReports();
    loadCycles();
  }, []);

  const loadReports = async () => {
    try {
      const response = await api.get('/reports');
      setReports(response.data);
    } catch (error) {
      console.error('Ошибка при загрузке отчетов:', error);
      setError('Не удалось загрузить отчеты');
    } finally {
      setLoading(false);
    }
  };

  const loadCycles = async () => {
    try {
      const response = await api.get('/cycles');
      setCycles(response.data);
    } catch (error) {
      console.error('Ошибка при загрузке циклов:', error);
    }
  };

  const loadCycleAnalytics = async (cycleId: number) => {
    try {
      const response = await api.get(`/reports/cycle/${cycleId}/analytics`);
      setCycleAnalytics(response.data);
    } catch (error) {
      console.error('Ошибка при загрузке аналитики:', error);
      setError('Не удалось загрузить аналитику');
    }
  };

  const generateReport = async (participantId: number) => {
    try {
      setGenerating(participantId);
      await api.post(`/reports/generate/${participantId}`);
      await loadReports();
      setError(null);
    } catch (error: any) {
      console.error('Ошибка при генерации отчета:', error);
      setError('Не удалось создать отчет');
    } finally {
      setGenerating(null);
    }
  };

  const handleCycleChange = (cycleId: number) => {
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
      setComparisonData(response.data);
    } catch (error) {
      console.error('Ошибка при загрузке сравнения:', error);
      setError('Не удалось загрузить сравнение');
    }
  };

  const canManageReports = user?.role === 'admin' || user?.role === 'manager';

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  const selectedCycleData = cycles.find(c => c.id === selectedCycle);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Отчеты и аналитика
          </h1>
          <button
            onClick={loadReports}
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Обновить
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

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
                  onChange={(e) => handleCycleChange(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Выберите цикл</option>
                  {cycles.map(cycle => (
                    <option key={cycle.id} value={cycle.id}>
                      {cycle.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Генерация отчетов */}
              {canManageReports && selectedCycleData && (
                <div className="mb-6">
                  <h3 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                    Генерация отчетов
                  </h3>
                  <div className="space-y-2">
                    {selectedCycleData.participants?.map(participant => (
                      <div key={participant.id} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                        <span className="text-sm text-gray-900 dark:text-white">
                          {participant.name}
                        </span>
                        <button
                          onClick={() => generateReport(participant.id)}
                          disabled={generating === participant.id}
                          className="bg-primary-600 hover:bg-primary-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          {generating === participant.id ? 'Генерация...' : 'Генерировать'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Сравнение участников */}
              {selectedCycleData && (
                <div className="mb-6">
                  <h3 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                    Сравнение участников
                  </h3>
                  <div className="space-y-2 mb-3">
                    {selectedCycleData.participants?.map(participant => (
                      <label key={participant.id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedParticipants.includes(participant.id.toString())}
                          onChange={() => handleParticipantSelect(participant.id.toString())}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-900 dark:text-white">
                          {participant.name}
                        </span>
                      </label>
                    ))}
                  </div>
                  <button
                    onClick={loadComparison}
                    disabled={selectedParticipants.length < 2}
                    className="w-full bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded font-medium transition-colors disabled:opacity-50"
                  >
                    Сравнить ({selectedParticipants.length})
                  </button>
                </div>
              )}

              {/* Список сохраненных отчетов */}
              <div>
                <h3 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                  Сохраненные отчеты ({reports.length})
                </h3>
                <div className="space-y-2">
                  {reports.slice(0, 5).map(report => (
                    <Link
                      key={report.id}
                      to={`/report/${report.id}`}
                      className="block p-2 bg-gray-50 dark:bg-gray-700 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {report.participant_name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {report.cycle_name}
                      </div>
                    </Link>
                  ))}
                  {reports.length > 5 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                      +{reports.length - 5} еще
                    </div>
                  )}
                </div>
              </div>
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

                {/* Сравнение участников */}
                {comparisonData.length > 0 && (
                  <ComparisonChart
                    data={comparisonData}
                    title="Сравнение участников"
                  />
                )}

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
      </div>
    </Layout>
  );
}; 