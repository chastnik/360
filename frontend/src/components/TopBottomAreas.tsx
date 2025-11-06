// Автор: Стас Чашин @chastnik
import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TooltipTitle } from './TooltipTitle';

interface AreaScore {
  name: string;
  score: number;
  change?: number; // процент изменения
  count?: number; // количество оценок
}

interface TopBottomAreasProps {
  topAreas?: AreaScore[];
  bottomAreas?: AreaScore[];
  title?: string;
}

export const TopBottomAreas: React.FC<TopBottomAreasProps> = ({
  topAreas = [],
  bottomAreas = [],
  title = 'Лучшие и худшие области'
}) => {
  const { isDark } = useTheme();

  const combinedData = [
    ...topAreas.map((area, idx) => ({ ...area, rank: idx + 1, type: 'top' })),
    ...bottomAreas.map((area, idx) => ({ ...area, rank: idx + 1, type: 'bottom' }))
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Лучшие области */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <TooltipTitle
          title="🏆 Топ-5 лучших областей"
          description="Список 5 категорий компетенций с наивысшими средними оценками. Рассчитывается как среднее арифметическое всех оценок по вопросам каждой категории из всех завершенных циклов оценки. Показывает области, в которых организация или сотрудники демонстрируют наилучшие результаты. Сортировка по убыванию среднего балла."
        />
        {topAreas.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topAreas} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} />
                <XAxis type="number" domain={[0, 5]} tick={{ fill: isDark ? '#d1d5db' : '#374151' }} />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={120}
                  tick={{ fontSize: 12, fill: isDark ? '#d1d5db' : '#374151' }}
                />
                <Tooltip
                  formatter={(value: number, name: string, props: any) => [
                    `${value.toFixed(2)}${props.payload.change ? ` (${props.payload.change > 0 ? '+' : ''}${props.payload.change.toFixed(1)}%)` : ''}`,
                    'Средний балл'
                  ]}
                  contentStyle={{
                    backgroundColor: isDark ? '#1f2937' : '#ffffff',
                    borderColor: isDark ? '#374151' : '#e5e7eb',
                    color: isDark ? '#e5e7eb' : '#111827'
                  }}
                />
                <Bar dataKey="score" fill="#10B981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {topAreas.map((area, idx) => (
                <div
                  key={area.name}
                  className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-green-600 dark:text-green-400">#{idx + 1}</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{area.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {area.change !== undefined && (
                      <span
                        className={`text-xs font-medium ${
                          area.change > 0
                            ? 'text-green-600 dark:text-green-400'
                            : area.change < 0
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        {area.change > 0 ? '↑' : area.change < 0 ? '↓' : '→'} {Math.abs(area.change).toFixed(1)}%
                      </span>
                    )}
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {area.score.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
            Нет данных для отображения
          </div>
        )}
      </div>

      {/* Худшие области */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <TooltipTitle
          title="⚠️ Топ-5 областей для улучшения"
          description="Список 5 категорий компетенций с наименьшими средними оценками. Рассчитывается как среднее арифметическое всех оценок по вопросам каждой категории из всех завершенных циклов оценки. Показывает области, которые требуют внимания и развития. Сортировка по возрастанию среднего балла."
        />
        {bottomAreas.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={bottomAreas} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} />
                <XAxis type="number" domain={[0, 5]} tick={{ fill: isDark ? '#d1d5db' : '#374151' }} />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={120}
                  tick={{ fontSize: 12, fill: isDark ? '#d1d5db' : '#374151' }}
                />
                <Tooltip
                  formatter={(value: number, name: string, props: any) => [
                    `${value.toFixed(2)}${props.payload.change ? ` (${props.payload.change > 0 ? '+' : ''}${props.payload.change.toFixed(1)}%)` : ''}`,
                    'Средний балл'
                  ]}
                  contentStyle={{
                    backgroundColor: isDark ? '#1f2937' : '#ffffff',
                    borderColor: isDark ? '#374151' : '#e5e7eb',
                    color: isDark ? '#e5e7eb' : '#111827'
                  }}
                />
                <Bar dataKey="score" fill="#EF4444" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {bottomAreas.map((area, idx) => (
                <div
                  key={area.name}
                  className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-red-600 dark:text-red-400">#{idx + 1}</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{area.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {area.change !== undefined && (
                      <span
                        className={`text-xs font-medium ${
                          area.change > 0
                            ? 'text-green-600 dark:text-green-400'
                            : area.change < 0
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        {area.change > 0 ? '↑' : area.change < 0 ? '↓' : '→'} {Math.abs(area.change).toFixed(1)}%
                      </span>
                    )}
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {area.score.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
            Нет данных для отображения
          </div>
        )}
      </div>
    </div>
  );
};

