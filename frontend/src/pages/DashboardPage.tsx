
// Автор: Стас Чашин @chastnik
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CategoryBarChart, CategoryRadarChart, OverallScoreDisplay, TrendChart } from '../components/ReportCharts';
import api from '../services/api';

interface Summary {
  usersTotal: number;
  cyclesTotal: number;
  cyclesActive: number;
  participantsTotal: number;
  responsesTotal: number;
  overallAverage: number;
}

interface Cycle {
  id: string;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  participants?: any[];
  respondent_count?: number;
}

export const DashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<Array<{ date: string; score: number }>>([]);
  const [recentCycles, setRecentCycles] = useState<Cycle[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        // Сводка с бэкенда
        const summaryRes = await api.get('/reports/summary');
        const summaryData = summaryRes.data || {};

        // Берем список циклов
        const cyclesRes = await api.get('/cycles');
        const cycles = cyclesRes.data?.success ? cyclesRes.data.data : cyclesRes.data;
        const activeCount = Number(summaryData.cyclesActive ?? (Array.isArray(cycles) ? cycles.filter((c: any) => c.status === 'active').length : 0));
        
        // Сохраняем последние циклы для таблицы (сортируем по дате создания, берем последние 10)
        if (Array.isArray(cycles)) {
          const sortedCycles = cycles
            .sort((a: any, b: any) => new Date(b.created_at || b.start_date).getTime() - new Date(a.created_at || a.start_date).getTime())
            .slice(0, 10);
          setRecentCycles(sortedCycles);
        } else {
          setRecentCycles([]);
        }

        // Получаем агрегированные данные по всем циклам
        let categoryDataList: any[] = [];
        if (Array.isArray(cycles) && cycles.length > 0) {
          try {
            // Получаем аналитику по всем циклам и агрегируем данные
            const analyticsPromises = cycles.map((cycle: any) => 
              api.get(`/reports/cycle/${cycle.id}/analytics`).catch((error: any) => {
                // Не логируем 401 ошибки - они обрабатываются interceptor'ом
                if (error?.response?.status !== 401) {
                  console.warn(`Ошибка получения аналитики для цикла ${cycle.id}:`, error?.response?.data?.error || error?.message);
                }
                return null;
              })
            );
            const analyticsResults = await Promise.all(analyticsPromises);
            
            // Агрегируем данные по категориям из всех циклов
            const categoryMap = new Map<string, { total: number; count: number; color: string }>();
            
            analyticsResults.forEach((result: any) => {
              if (result?.data?.avgScores && Array.isArray(result.data.avgScores)) {
                result.data.avgScores.forEach((item: any) => {
                  const categoryName = item.category || item.category_name || '';
                  const avgScore = Number(item.avgScore || item.avg_score || 0);
                  const color = item.color || item.category_color || '#3B82F6';
                  
                  if (categoryName) {
                    const existing = categoryMap.get(categoryName);
                    if (existing) {
                      existing.total += avgScore;
                      existing.count += 1;
                    } else {
                      categoryMap.set(categoryName, { total: avgScore, count: 1, color });
                    }
                  }
                });
              }
            });
            
            // Преобразуем в массив со средними значениями
            categoryDataList = Array.from(categoryMap.entries()).map(([name, data], idx) => ({
              id: idx,
              name: name,
              color: data.color,
              average: data.count > 0 ? Math.round((data.total / data.count) * 100) / 100 : 0,
              count: 0
            })).sort((a, b) => a.name.localeCompare(b.name));
          } catch (error) {
            console.error('Ошибка получения агрегированной аналитики:', error);
            // Если ошибка, пробуем получить данные хотя бы из первого цикла
            try {
              const firstCycleId = cycles[0].id;
              const analyticsRes = await api.get(`/reports/cycle/${firstCycleId}/analytics`);
              const analytics = analyticsRes.data || { avgScores: [] };
              categoryDataList = Array.isArray(analytics.avgScores) ? analytics.avgScores.map((item: any, idx: number) => ({
                id: idx,
                name: item.category || item.category_name || `Категория ${idx + 1}`,
                color: item.color || '#3B82F6',
                average: Number(item.avgScore || item.avg_score || 0),
                count: 0
              })) : [];
            } catch {
              // оставляем пустой массив, если аналитика недоступна
            }
          }
        }

        const categories = categoryDataList;

        setCategoryData(categories);
        setSummary({
          usersTotal: Number(summaryData.usersTotal ?? 0),
          cyclesTotal: Number(summaryData.cyclesTotal ?? (Array.isArray(cycles) ? cycles.length : 0)),
          cyclesActive: Number(activeCount ?? 0),
          participantsTotal: Number(summaryData.participantsTotal ?? 0),
          responsesTotal: Number(summaryData.responsesTotal ?? 0),
          overallAverage: Number(summaryData.overallAverage ?? 0)
        });

        // Простой тренд (замок)
        const base = Number(summaryData.overallAverage || 3);
        setTrendData([
          { date: 'Янв', score: Math.max(0, base - 0.3) },
          { date: 'Фев', score: Math.max(0, base - 0.2) },
          { date: 'Мар', score: Math.max(0, base - 0.1) },
          { date: 'Апр', score: base },
          { date: 'Май', score: Math.min(5, base + 0.1) },
          { date: 'Июн', score: Math.min(5, base + 0.2) }
        ]);
        setError(null);
      } catch (e) {
        console.error(e);
        setError('Не удалось загрузить данные для дашборда');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Дашборд</h1>
          <p className="text-gray-600 dark:text-gray-300">Обзор ключевых показателей системы 360</p>
        </div>
      </div>

      {/* Карточки показателей */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-5 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">Активных циклов</div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{summary?.cyclesActive ?? 0}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-5 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">Всего циклов</div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{summary?.cyclesTotal ?? 0}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-5 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">Всего ответов</div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{summary?.responsesTotal ?? 0}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-5 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">Средний балл</div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{(summary?.overallAverage ?? 0).toFixed(2)}</div>
        </div>
      </div>

      {/* Основные графики */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OverallScoreDisplay score={summary?.overallAverage ?? 0} title="Общий средний балл по системе" />
        <TrendChart data={trendData} title="Динамика общего среднего балла" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoryBarChart data={categoryData} title="Средние оценки по категориям (срез)" />
        <CategoryRadarChart data={categoryData} title="Профиль компетенций (срез)" />
      </div>

      {/* Таблица Recent Feedback Cycles */}
      <div className="card p-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Последние циклы оценки</h2>

        {recentCycles.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                    Название цикла
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                    Статус
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                    Дата начала
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                    Дата окончания
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                    Прогресс
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentCycles.map((cycle, index) => {
                  const calculateProgress = (cycle: Cycle): number => {
                    if (cycle.status === 'completed' || cycle.status === 'cancelled') {
                      return 100;
                    }
                    if (cycle.status === 'draft') {
                      return 0;
                    }
                    // Для активных циклов считаем прогресс по датам
                    const now = new Date().getTime();
                    const start = new Date(cycle.start_date).getTime();
                    const end = new Date(cycle.end_date).getTime();
                    if (now < start) return 0;
                    if (now > end) return 100;
                    return Math.round(((now - start) / (end - start)) * 100);
                  };

                  const progress = calculateProgress(cycle);

                  const getStatusBadge = (status: string) => {
                    switch (status) {
                      case 'active':
                        return (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            ● Активен
                          </span>
                        );
                      case 'completed':
                        return (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                            ✓ Завершен
                          </span>
                        );
                      case 'cancelled':
                        return (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                            ✕ Отменен
                          </span>
                        );
                      case 'draft':
                      default:
                        return (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                            ○ Черновик
                          </span>
                        );
                    }
                  };

                  return (
                    <tr
                      key={cycle.id}
                      className={`border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                        index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900/50'
                      }`}
                    >
                      <td className="py-4 px-4 text-sm font-medium text-gray-900 dark:text-white">
                        {cycle.name}
                      </td>
                      <td className="py-4 px-4">
                        {getStatusBadge(cycle.status)}
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-400">
                        {new Date(cycle.start_date).toLocaleDateString('ru-RU', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-400">
                        {new Date(cycle.end_date).toLocaleDateString('ru-RU', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                cycle.status === 'completed' || cycle.status === 'cancelled'
                                  ? 'bg-blue-500 dark:bg-blue-400'
                                  : cycle.status === 'active'
                                  ? 'bg-green-500 dark:bg-green-400'
                                  : 'bg-yellow-500 dark:bg-yellow-400'
                              }`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[3rem]">
                            {progress}%
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/cycles`}
                            className="btn btn-outline btn-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Просмотр
                          </Link>
                          {cycle.status === 'completed' && (
                            <Link
                              to={`/reports`}
                              className="btn btn-ghost btn-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                              title="Просмотр отчета"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                            </Link>
                          )}
                          {cycle.status === 'active' && (
                            <Link
                              to={`/assessments`}
                              className="btn btn-ghost btn-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
                              title="Начать оценку"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Циклы оценки пока отсутствуют</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">Создайте первый цикл оценки для начала работы</p>
          </div>
        )}
      </div>
    </div>
  );
};