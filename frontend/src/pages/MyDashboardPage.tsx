// Автор: Стас Чашин @chastnik
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CategoryBarChart, CategoryRadarChart, OverallScoreDisplay, TrendChart } from '../components/ReportCharts';
import api from '../services/api';

interface RecentAssessment {
  cycle_id: string;
  cycle_name: string;
  end_date: string;
  status: string;
  completed_at?: string;
  averageScore: number;
}

interface ImprovementArea {
  category: string;
  color: string;
  averageScore: number;
}

interface CompetenceProgress {
  competency: string;
  level: string;
  score: number;
  assessmentDate: string;
}

interface UpcomingDeadline {
  id: string;
  cycleName: string;
  participantName: string;
  endDate: string;
  status: string;
}

interface TrendDataItem {
  date: string;
  score: number;
}

interface CategoryDataItem {
  id: number;
  name: string;
  color: string;
  average: number;
  count: number;
}

interface DashboardData {
  recentAssessments: RecentAssessment[];
  improvementAreas: ImprovementArea[];
  competenceProgress: CompetenceProgress[];
  upcomingDeadlines: UpcomingDeadline[];
  overallAverage: number;
  trendData: TrendDataItem[];
  categoryData: CategoryDataItem[];
}

export const MyDashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get('/reports/my-dashboard');
        setData(res.data);
        setError(null);
      } catch (e: any) {
        console.error(e);
        setError('Не удалось загрузить данные дашборда');
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getDaysUntilDeadline = (endDate: string) => {
    const now = new Date();
    const end = new Date(endDate);
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
            ✓ Завершено
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
            В процессе
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">
            {status}
          </span>
        );
    }
  };

  const getLevelBadge = (level: string) => {
    const levelMap: Record<string, { label: string; color: string }> = {
      novice: { label: 'Новичок', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400' },
      beginner: { label: 'Начинающий', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
      competent: { label: 'Компетентный', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
      proficient: { label: 'Опытный', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
      expert: { label: 'Эксперт', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' }
    };
    const levelInfo = levelMap[level] || { label: level, color: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${levelInfo.color}`}>
        {levelInfo.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Мой дашборд</h1>
          <p className="text-gray-600 dark:text-gray-300">Персональная информация о ваших оценках и прогрессе</p>
        </div>
      </div>

      {/* Основные графики */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OverallScoreDisplay 
          score={data?.overallAverage ?? 0} 
          title="Общий средний балл" 
        />
        <TrendChart 
          data={data?.trendData ?? []} 
          title="Динамика общего среднего балла" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoryBarChart 
          data={data?.categoryData ?? []} 
          title="Средние оценки по категориям" 
        />
        <CategoryRadarChart 
          data={data?.categoryData ?? []} 
          title="Профиль компетенций" 
        />
      </div>

      {/* Виджеты в сетке */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Виджет: Мои оценки */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Мои оценки</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Последние оценки пользователя</p>
          {data?.recentAssessments && data.recentAssessments.length > 0 ? (
            <div className="space-y-3">
              {data.recentAssessments.map((assessment, index) => (
                <div
                  key={index}
                  className="border-b border-gray-200 dark:border-gray-700 pb-3 last:border-b-0 last:pb-0"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900 dark:text-white">{assessment.cycle_name}</h3>
                    {getStatusBadge(assessment.status)}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      Средний балл: <span className="font-semibold text-gray-900 dark:text-white">{assessment.averageScore.toFixed(2)}</span>
                    </span>
                    <span className="text-gray-500 dark:text-gray-500">
                      {formatDate(assessment.end_date)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p>Нет доступных оценок</p>
            </div>
          )}
        </div>

        {/* Виджет: Мои улучшения */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Мои улучшения</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Области для развития</p>
          {data?.improvementAreas && data.improvementAreas.length > 0 ? (
            <div className="space-y-3">
              {data.improvementAreas.map((area, index) => (
                <div
                  key={index}
                  className="border-b border-gray-200 dark:border-gray-700 pb-3 last:border-b-0 last:pb-0"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: area.color || '#3B82F6' }}
                      ></div>
                      <h3 className="font-medium text-gray-900 dark:text-white">{area.category}</h3>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {area.averageScore.toFixed(2)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: `${(area.averageScore / 5) * 100}%`,
                        backgroundColor: area.color || '#3B82F6'
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p>Нет данных об областях для развития</p>
            </div>
          )}
        </div>

        {/* Виджет: Мои достижения */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Мои достижения</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Прогресс по компетенциям</p>
          {data?.competenceProgress && data.competenceProgress.length > 0 ? (
            <div className="space-y-3">
              {data.competenceProgress.map((competence, index) => (
                <div
                  key={index}
                  className="border-b border-gray-200 dark:border-gray-700 pb-3 last:border-b-0 last:pb-0"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900 dark:text-white">{competence.competency}</h3>
                    {getLevelBadge(competence.level)}
                  </div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600 dark:text-gray-400">
                      Балл: <span className="font-semibold text-gray-900 dark:text-white">{competence.score}</span>/100
                    </span>
                    <span className="text-gray-500 dark:text-gray-500">
                      {formatDate(competence.assessmentDate)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full"
                      style={{ width: `${competence.score}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p>Нет данных о компетенциях</p>
            </div>
          )}
        </div>

        {/* Виджет: Ближайшие дедлайны */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Ближайшие дедлайны</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Мои оценки, требующие внимания</p>
          {data?.upcomingDeadlines && data.upcomingDeadlines.length > 0 ? (
            <div className="space-y-3">
              {data.upcomingDeadlines.map((deadline, index) => {
                const daysLeft = getDaysUntilDeadline(deadline.endDate);
                const isUrgent = daysLeft <= 3;
                return (
                  <div
                    key={index}
                    className={`border-b border-gray-200 dark:border-gray-700 pb-3 last:border-b-0 last:pb-0 ${
                      isUrgent ? 'bg-red-50 dark:bg-red-900/10 p-3 rounded-lg' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900 dark:text-white">{deadline.cycleName}</h3>
                      {getStatusBadge(deadline.status)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      Участник: {deadline.participantName}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-semibold ${isUrgent ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                        {daysLeft > 0 ? `Осталось ${daysLeft} ${daysLeft === 1 ? 'день' : daysLeft < 5 ? 'дня' : 'дней'}` : 'Просрочено'}
                      </span>
                      <Link
                        to={`/assessments`}
                        className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
                      >
                        Перейти →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p>Нет активных дедлайнов</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

