// Автор: Стас Чашин @chastnik
import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TooltipTitle } from './TooltipTitle';

interface TurnoverPrediction {
  month: string;
  predictedRate: number;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high';
}

interface LeaderCandidate {
  userId: string;
  userName: string;
  overallScore: number;
  leadershipScore: number;
  growthTrend: number;
  potential: 'high' | 'medium' | 'low';
}

interface MLAnalysisProps {
  turnoverData?: TurnoverPrediction[];
  leaders?: LeaderCandidate[];
  loading?: boolean;
}

export const MLAnalysis: React.FC<MLAnalysisProps> = ({ turnoverData = [], leaders = [], loading = false }) => {
  const { isDark } = useTheme();

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Прогноз текучести */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <TooltipTitle
          title="Прогноз текучести кадров"
          description="Прогноз текучести кадров на основе анализа трендов оценок. Алгоритм анализирует средние оценки по циклам и выявляет тенденции снижения оценок, которые могут указывать на снижение удовлетворенности сотрудников. Прогноз рассчитывается на 6 месяцев вперед с учетом уровня уверенности (confidence) и уровня риска (low/medium/high). Чем выше прогнозируемая текучесть, тем выше риск увольнений."
        />
        {turnoverData && Array.isArray(turnoverData) && turnoverData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={turnoverData}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: isDark ? '#d1d5db' : '#374151' }} />
                <YAxis domain={[0, 100]} tick={{ fill: isDark ? '#d1d5db' : '#374151' }} />
                <Tooltip
                  formatter={(value: number) => [`${value.toFixed(1)}%`, 'Прогнозируемая текучесть']}
                  contentStyle={{
                    backgroundColor: isDark ? '#1f2937' : '#ffffff',
                    borderColor: isDark ? '#374151' : '#e5e7eb',
                    color: isDark ? '#e5e7eb' : '#111827'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="predictedRate"
                  stroke="#EF4444"
                  fill="#EF4444"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
            <div className="mt-4 flex flex-wrap gap-4">
              {turnoverData.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      item.riskLevel === 'high'
                        ? 'bg-red-500'
                        : item.riskLevel === 'medium'
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {item.month}: {item.predictedRate.toFixed(1)}% (доверие: {item.confidence.toFixed(0)}%)
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
            Недостаточно данных для прогноза
          </div>
        )}
      </div>

      {/* Потенциальные лидеры */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <TooltipTitle
          title="Потенциальные лидеры"
          description="Список сотрудников с высоким потенциалом лидерства на основе результатов 360-градусной оценки. Алгоритм анализирует общий балл (overallScore), балл лидерства (leadershipScore) и тренд роста (growthTrend). Лидерство рассчитывается как комбинация общего балла (70%) и роста оценок (30%). Критерии: общий балл ≥ 2.5 и балл лидерства ≥ 2.0. Если нет лидеров по критериям, показываются топ-3 участника по оценкам."
        />
        {leaders && Array.isArray(leaders) && leaders.length > 0 ? (
          <div className="space-y-3">
            {leaders.slice(0, 5).map((leader, idx) => (
              <div
                key={leader.userId}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 font-bold">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">{leader.userName}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Общий балл: {leader.overallScore.toFixed(2)} | Лидерство: {leader.leadershipScore.toFixed(2)} | 
                      Рост: {leader.growthTrend > 0 ? '+' : ''}{leader.growthTrend.toFixed(1)}%
                    </div>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      leader.potential === 'high'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : leader.potential === 'medium'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {leader.potential === 'high' ? 'Высокий потенциал' : leader.potential === 'medium' ? 'Средний потенциал' : 'Низкий потенциал'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
            Недостаточно данных для анализа
          </div>
        )}
      </div>
    </div>
  );
};

