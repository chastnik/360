// Автор: Стас Чашин @chastnik
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
// Layout убран - компонент оборачивается в Layout на уровне роутинга
import { 
  CategoryBarChart, 
  CategoryRadarChart, 
  OverallScoreDisplay, 
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

interface ReportData {
  overallAverage: number;
  categoryAverages: Array<{
    id: number;
    name: string;
    color: string;
    average: number;
    count: number;
    distribution: {
      1: number;
      2: number;
      3: number;
      4: number;
      5: number;
    };
  }>;
  strengths: Array<{
    id: number;
    name: string;
    color: string;
    average: number;
  }>;
  weaknesses: Array<{
    id: number;
    name: string;
    color: string;
    average: number;
  }>;
  totalResponses: number;
  responseDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export const ReportViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<Report | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReport = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/reports/${id}`);
      setReport(response.data);
      
      // Парсим данные отчета
      const parsedData = JSON.parse(response.data.data);
      setReportData(parsedData);
      setError(null);
    } catch (error: any) {
      console.error('Ошибка загрузки отчета:', error);
      setError(error.response?.data?.error || 'Ошибка загрузки отчета');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadReport();
    }
  }, [id, loadReport]);

  const getScoreColor = (score: number) => {
    if (score >= 4.5) return 'text-green-600';
    if (score >= 3.5) return 'text-blue-600';
    if (score >= 2.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreText = (score: number) => {
    if (score >= 4.5) return 'Отлично';
    if (score >= 3.5) return 'Хорошо';
    if (score >= 2.5) return 'Удовлетворительно';
    return 'Требует улучшения';
  };

  const exportReport = () => {
    // Здесь можно добавить функционал экспорта в PDF
    console.log('Экспорт отчета...');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !report || !reportData) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error || 'Отчет не найден'}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
        {/* Заголовок */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <button
              onClick={() => navigate('/reports')}
              className="flex items-center text-gray-500 hover:text-gray-700 mb-2"
            >
              <span className="mr-2">←</span>
              Назад к отчетам
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Отчет оценки: {report.participant_name}
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              {report.cycle_name} • Создан: {new Date(report.created_at).toLocaleDateString()}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportReport}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Экспорт PDF
            </button>
            <button
              onClick={() => navigate('/reports')}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Закрыть
            </button>
          </div>
        </div>

        {/* Общие показатели */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <OverallScoreDisplay
            score={reportData.overallAverage}
            title="Общий средний балл"
          />
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Статистика
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-300">Всего ответов:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {reportData.totalResponses}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-300">Категорий:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {reportData.categoryAverages.length}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Общая оценка
            </h3>
            <div className="text-center">
              <div className={`text-2xl font-bold mb-2 ${getScoreColor(reportData.overallAverage)}`}>
                {getScoreText(reportData.overallAverage)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Основано на {reportData.totalResponses} ответах
              </div>
            </div>
          </div>
        </div>

        {/* Сильные и слабые стороны */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
              <span className="text-green-500 mr-2">💪</span>
              Сильные стороны
            </h3>
            <div className="space-y-3">
              {reportData.strengths.map((strength, index) => (
                <div key={strength.id} className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded">
                  <div className="flex items-center">
                    <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
                      {index + 1}
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {strength.name}
                    </span>
                  </div>
                  <span className="text-green-600 font-bold">
                    {strength.average.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
              <span className="text-orange-500 mr-2">🎯</span>
              Области для развития
            </h3>
            <div className="space-y-3">
              {reportData.weaknesses.map((weakness, index) => (
                <div key={weakness.id} className="flex justify-between items-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded">
                  <div className="flex items-center">
                    <div className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
                      {index + 1}
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {weakness.name}
                    </span>
                  </div>
                  <span className="text-orange-600 font-bold">
                    {weakness.average.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Графики */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <CategoryBarChart
            data={reportData.categoryAverages}
            title="Средние оценки по категориям"
          />
          <CategoryRadarChart
            data={reportData.categoryAverages}
            title="Профиль компетенций"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <ScoreDistributionChart
            distribution={reportData.responseDistribution}
            title="Распределение оценок"
          />
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Детализация по категориям
            </h3>
            <div className="space-y-4">
              {reportData.categoryAverages.map(category => (
                <div key={category.id} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-b-0">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {category.name}
                    </h4>
                    <span className={`text-lg font-bold ${getScoreColor(category.average)}`}>
                      {category.average.toFixed(1)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    Оценок: {category.count}
                  </div>
                  <div className="flex space-x-1">
                    {Object.entries(category.distribution).map(([score, count]) => (
                      <div key={score} className="flex-1 text-center">
                        <div className="text-xs text-gray-500 dark:text-gray-400">{score}</div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{count}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Рекомендации */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100 mb-4">
            Рекомендации для развития
          </h3>
          <div className="space-y-3 text-blue-800 dark:text-blue-200">
            <div>
              <strong>Сильные стороны:</strong> Продолжайте развивать навыки в областях {reportData.strengths.map(s => s.name).join(', ')}. 
              Эти компетенции могут стать вашими ключевыми преимуществами.
            </div>
            <div>
              <strong>Области для улучшения:</strong> Сосредоточьтесь на развитии навыков в областях {reportData.weaknesses.map(w => w.name).join(', ')}. 
              Рассмотрите возможность дополнительного обучения или наставничества.
            </div>
            <div>
              <strong>Общий совет:</strong> Ваш средний балл {reportData.overallAverage.toFixed(1)} из 5.0 показывает {getScoreText(reportData.overallAverage).toLowerCase()} уровень. 
              Регулярная работа над областями для развития поможет повысить общую эффективность.
            </div>
          </div>
        </div>
      </div>
  );
}; 