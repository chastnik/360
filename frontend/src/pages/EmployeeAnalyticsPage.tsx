import React, { useEffect, useState } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import api from '../services/api';
import { CategoryBarChart, CategoryRadarChart, OverallScoreDisplay, ScoreDistributionChart } from '../components/ReportCharts';

export const EmployeeAnalyticsPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const [searchParams] = useSearchParams();
  const cycleId = searchParams.get('cycleId') || undefined;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/reports/user/${userId}/analytics`, { params: { cycleId } });
        setData(res.data);
        setError(null);
      } catch (e: any) {
        console.error(e);
        setError('Не удалось загрузить аналитику сотрудника');
      } finally {
        setLoading(false);
      }
    };
    if (userId) load();
  }, [userId, cycleId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>;
  }

  const categoryAverages = Array.isArray(data?.avgScores)
    ? data.avgScores.map((item: any, idx: number) => ({ id: idx, name: item.category, color: item.color, average: item.avgScore, count: 0 }))
    : [];

  const distribution = (() => {
    const init: any = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    if (Array.isArray(data?.scoreDistribution)) {
      for (const d of data.scoreDistribution) { const s = Number(d.score); if (init[s] !== undefined) init[s] = Number(d.count || 0); }
    }
    return init;
  })();

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Аналитика сотрудника</h1>
        {data?.cycle && (
          <p className="text-gray-600 dark:text-gray-300">Цикл: {data.cycle.name}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <OverallScoreDisplay score={Number(data?.overallAverage || 0)} title="Общий средний балл" />
        <ScoreDistributionChart distribution={distribution} title="Распределение оценок" />
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Статистика</h3>
          <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <div>Ответов: {Array.isArray(data?.responses) ? data.responses.length : 0}</div>
            <div>Категорий: {categoryAverages.length}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoryBarChart data={categoryAverages} title="Средние оценки по категориям" />
        <CategoryRadarChart data={categoryAverages} title="Профиль компетенций" />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Ответы респондентов</h3>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {Array.isArray(data?.responses) && data.responses.length > 0 ? data.responses.map((r: any, idx: number) => (
            <div key={idx} className="py-3">
              <div className="text-sm text-gray-500 dark:text-gray-400">Категория: {r.category}</div>
              <div className="font-medium text-gray-900 dark:text-white">{r.question}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Оценка: {r.score}{r.respondent ? ` • ${r.respondent}` : ''}{r.respondentType ? ` • ${r.respondentType}` : ''}</div>
              {r.comment && (
                <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">Комментарий: {r.comment}</div>
              )}
            </div>
          )) : (
            <div className="text-gray-500 dark:text-gray-400">Нет ответов</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeAnalyticsPage;


