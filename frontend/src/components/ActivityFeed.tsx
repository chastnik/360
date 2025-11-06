// Автор: Стас Чашин @chastnik
import React from 'react';
import { Link } from 'react-router-dom';
import { TooltipTitle } from './TooltipTitle';

interface Insight {
  id: string;
  type: 'warning' | 'info' | 'success' | 'recommendation';
  title: string;
  message: string;
  timestamp: string;
  relatedEntity?: {
    type: 'cycle' | 'department' | 'user';
    id: string;
    name: string;
  };
  actionUrl?: string;
}

interface ActivityItem {
  id: string;
  type: 'cycle_started' | 'cycle_completed' | 'assessment_submitted' | 'report_generated' | 'insight';
  title: string;
  description: string;
  timestamp: string;
  user?: string;
  relatedEntity?: {
    type: 'cycle' | 'department' | 'user';
    id: string;
    name: string;
  };
  insight?: Insight;
}

interface ActivityFeedProps {
  activities?: ActivityItem[];
  insights?: Insight[];
  loading?: boolean;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities = [], insights = [], loading = false }) => {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'только что';
    if (diffMins < 60) return `${diffMins} мин. назад`;
    if (diffHours < 24) return `${diffHours} ч. назад`;
    if (diffDays < 7) return `${diffDays} дн. назад`;
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'cycle_started':
        return (
          <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'cycle_completed':
        return (
          <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'assessment_submitted':
        return (
          <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'report_generated':
        return (
          <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'insight':
        return (
          <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      case 'info':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      case 'success':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'recommendation':
        return 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800';
      default:
        return 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  const allItems = [
    ...insights.map(insight => ({
      id: insight.id,
      type: 'insight' as const,
      title: insight.title,
      description: insight.message,
      timestamp: insight.timestamp,
      relatedEntity: insight.relatedEntity,
      insight
    })),
    ...activities
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 20);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <TooltipTitle
        title="Лента активности и Insights"
        description="Лента активности показывает последние события в системе: запуск циклов, завершение циклов, отправка оценок, генерация отчетов. Insights - это автоматически сгенерированные аналитические наблюдения, такие как предупреждения о снижении вовлеченности, рекомендации по дополнительным оценкам и другие важные инсайты. События сортируются по времени (последние сверху), показывается до 20 последних записей."
      />
      <div className="space-y-4 max-h-[600px] overflow-y-auto">
        {allItems.length > 0 ? (
          allItems.map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-lg border ${
                item.type === 'insight' && item.insight
                  ? getInsightColor(item.insight.type)
                  : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">{getActivityIcon(item.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">{item.title}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{item.description}</p>
                      {item.relatedEntity && (
                        <div className="mt-2">
                          <Link
                            to={
                              item.relatedEntity.type === 'cycle'
                                ? '/cycles'
                                : item.relatedEntity.type === 'department'
                                ? '/structure'
                                : '/reports'
                            }
                            className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
                          >
                            {item.relatedEntity.name}
                          </Link>
                        </div>
                      )}
                      {item.insight?.actionUrl && (
                        <div className="mt-2">
                          <Link
                            to={item.insight.actionUrl}
                            className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
                          >
                            Подробнее →
                          </Link>
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {formatTime(item.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            Нет активности для отображения
          </div>
        )}
      </div>
    </div>
  );
};

