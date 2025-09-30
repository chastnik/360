// © 2025 Бит.Цифра - Стас Чашин

// Автор: Стас Чашин @chastnik
import React, { useEffect, useState } from 'react';
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

export const DashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<Array<{ date: string; score: number }>>([]);

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

        // Пытаемся получить аналитику первого цикла (если есть)
        let analytics: any = { avgScores: [], overallAverage: 0 };
        if (Array.isArray(cycles) && cycles.length > 0) {
          try {
            const firstCycleId = cycles[0].id;
            const analyticsRes = await api.get(`/reports/cycle/${firstCycleId}/analytics`);
            analytics = analyticsRes.data || analytics;
          } catch {
            // оставляем дефолты, если аналитика недоступна
          }
        }

        const categories = Array.isArray(analytics.avgScores) ? analytics.avgScores.map((item: any, idx: number) => ({
          id: idx,
          name: item.category || item.category_name || `Категория ${idx + 1}`,
          color: item.color || '#3B82F6',
          average: Number(item.avgScore || item.avg_score || 0),
          count: 0
        })) : [];

        setCategoryData(categories);
        setSummary({
          usersTotal: Number(summaryData.usersTotal ?? 0),
          cyclesTotal: Number(summaryData.cyclesTotal ?? (Array.isArray(cycles) ? cycles.length : 0)),
          cyclesActive: Number(activeCount ?? 0),
          participantsTotal: Number(summaryData.participantsTotal ?? 0),
          responsesTotal: Number(summaryData.responsesTotal ?? 0),
          overallAverage: Number(summaryData.overallAverage ?? analytics.overallAverage ?? 0)
        });

        // Простой тренд (замок)
        const base = Number(analytics.overallAverage || 3);
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
    <div className="max-w-7xl mx-auto space-y-6">
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
    </div>
  );
};