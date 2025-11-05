
// Автор: Стас Чашин @chastnik
import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { useTheme } from '../contexts/ThemeContext';

interface CategoryAverage {
  id: number;
  name: string;
  color: string;
  average: number;
  count: number;
  distribution?: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

interface CategoryBarChartProps {
  data: CategoryAverage[];
  title: string;
}

export const CategoryBarChart: React.FC<CategoryBarChartProps> = ({ data, title }) => {
  const { isDark } = useTheme();
  
  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{title}</h3>
        <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
          Нет данных для отображения
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} />
          <XAxis 
            dataKey="name" 
            tick={{ fontSize: 12, fill: isDark ? '#d1d5db' : '#374151' }}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis domain={[0, 5]} tick={{ fill: isDark ? '#d1d5db' : '#374151' }} />
          <Tooltip 
            formatter={(value: number) => [value.toFixed(2), 'Средняя оценка']}
            contentStyle={{ backgroundColor: isDark ? '#1f2937' : '#ffffff', borderColor: isDark ? '#374151' : '#e5e7eb', color: isDark ? '#e5e7eb' : '#111827' }}
            labelFormatter={(label) => `Категория: ${label}`}
          />
          <Bar dataKey="average" fill="#3B82F6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

interface RadarChartProps {
  data: CategoryAverage[];
  title: string;
}

export const CategoryRadarChart: React.FC<RadarChartProps> = ({ data, title }) => {
  const { isDark } = useTheme();
  
  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{title}</h3>
        <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
          Нет данных для отображения
        </div>
      </div>
    );
  }
  
  const radarData = data.map(item => ({
    category: item.name,
    score: item.average,
    fullMark: 5
  }));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={radarData}>
          <PolarGrid stroke={isDark ? '#374151' : '#e5e7eb'} />
          <PolarAngleAxis dataKey="category" tick={{ fontSize: 12, fill: isDark ? '#d1d5db' : '#374151' }} />
          <PolarRadiusAxis domain={[0, 5]} tick={{ fontSize: 10, fill: isDark ? '#d1d5db' : '#374151' }} />
          <Radar
            name="Оценка"
            dataKey="score"
            stroke="#3B82F6"
            fill="#3B82F6"
            fillOpacity={0.3}
          />
          <Tooltip formatter={(value: number) => [value.toFixed(2), 'Средняя оценка']} contentStyle={{ backgroundColor: isDark ? '#1f2937' : '#ffffff', borderColor: isDark ? '#374151' : '#e5e7eb', color: isDark ? '#e5e7eb' : '#111827' }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

interface ScoreDistributionProps {
  distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  title: string;
}

export const ScoreDistributionChart: React.FC<ScoreDistributionProps> = ({ distribution, title }) => {
  const { isDark } = useTheme();
  const data = [
    { name: 'Очень плохо (1)', value: distribution[1], color: '#EF4444' },
    { name: 'Плохо (2)', value: distribution[2], color: '#F59E0B' },
    { name: 'Удовлетворительно (3)', value: distribution[3], color: '#EAB308' },
    { name: 'Хорошо (4)', value: distribution[4], color: '#3B82F6' },
    { name: 'Отлично (5)', value: distribution[5], color: '#10B981' }
  ];

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomizedLabel}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ backgroundColor: isDark ? '#1f2937' : '#ffffff', borderColor: isDark ? '#374151' : '#e5e7eb', color: isDark ? '#e5e7eb' : '#111827' }} />
          <Legend wrapperStyle={{ color: isDark ? '#d1d5db' : '#374151' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

interface ComparisonChartProps {
  data: Array<{
    participantId: string;
    participantName: string;
    categoryAverages: CategoryAverage[];
    overallAverage: number;
  }>;
  title: string;
}

export const ComparisonChart: React.FC<ComparisonChartProps> = ({ data, title }) => {
  const { isDark } = useTheme();
  // Получаем все уникальные категории
  const categories = data[0]?.categoryAverages || [];
  
  // Формируем данные для сравнения
  const comparisonData = categories.map(category => {
    const dataPoint: any = { category: category.name };
    data.forEach(participant => {
      const participantCategory = participant.categoryAverages.find(c => c.id === category.id);
      dataPoint[participant.participantName] = participantCategory?.average || 0;
    });
    return dataPoint;
  });

  const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6'];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={comparisonData}>
          <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} />
          <XAxis 
            dataKey="category" 
            tick={{ fontSize: 12, fill: isDark ? '#d1d5db' : '#374151' }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis domain={[0, 5]} tick={{ fill: isDark ? '#d1d5db' : '#374151' }} />
          <Tooltip 
            formatter={(value: number) => [value.toFixed(2), 'Средняя оценка']}
            contentStyle={{ backgroundColor: isDark ? '#1f2937' : '#ffffff', borderColor: isDark ? '#374151' : '#e5e7eb', color: isDark ? '#e5e7eb' : '#111827' }}
          />
          <Legend wrapperStyle={{ color: isDark ? '#d1d5db' : '#374151' }} />
          {data.map((participant, index) => (
            <Bar 
              key={participant.participantId}
              dataKey={participant.participantName}
              fill={colors[index % colors.length]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

interface OverlayRadarProps {
  data: Array<{
    participantId: string;
    participantName: string;
    categoryAverages: CategoryAverage[];
  }>;
  title: string;
}

export const OverlayRadarChart: React.FC<OverlayRadarProps> = ({ data, title }) => {
  const { isDark } = useTheme();
  // Собираем все категории как в ComparisonChart
  const categories = data[0]?.categoryAverages || [];
  const radarData = categories.map(category => {
    const point: any = { category: category.name };
    data.forEach(p => {
      const pc = p.categoryAverages.find(c => c.id === category.id);
      point[p.participantName] = pc?.average || 0;
    });
    return point;
  });

  const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6'];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={400}>
        <RadarChart data={radarData}>
          <PolarGrid stroke={isDark ? '#374151' : '#e5e7eb'} />
          <PolarAngleAxis dataKey="category" tick={{ fontSize: 12, fill: isDark ? '#d1d5db' : '#374151' }} />
          <PolarRadiusAxis domain={[0, 5]} tick={{ fontSize: 10, fill: isDark ? '#d1d5db' : '#374151' }} />
          {data.map((p, idx) => (
            <Radar key={p.participantId} name={p.participantName} dataKey={p.participantName} stroke={colors[idx % colors.length]} fill={colors[idx % colors.length]} fillOpacity={0.15} />
          ))}
          <Tooltip contentStyle={{ backgroundColor: isDark ? '#1f2937' : '#ffffff', borderColor: isDark ? '#374151' : '#e5e7eb', color: isDark ? '#e5e7eb' : '#111827' }} />
          <Legend wrapperStyle={{ color: isDark ? '#d1d5db' : '#374151' }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

interface OverallScoreProps {
  score: number;
  title: string;
  compact?: boolean;
}

export const OverallScoreDisplay: React.FC<OverallScoreProps> = ({ score, title, compact = false }) => {
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

  const containerBase = "bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700";
  const containerClass = compact ? containerBase : `${containerBase} flex flex-col h-full`;
  const innerClass = compact ? "flex flex-col items-center justify-center text-center" : "flex-1 flex flex-col items-center justify-center text-center";
  const scoreTextClass = compact ? "text-4xl" : "text-6xl";

  return (
    <div className={containerClass}>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{title}</h3>
      <div className={innerClass}>
        <div className={`${scoreTextClass} font-bold mb-2 ${getScoreColor(score)}`}>
          {score.toFixed(1)}
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">из 5.0</div>
        <div className={`text-lg font-medium ${getScoreColor(score)}`}>
          {getScoreText(score)}
        </div>
      </div>
    </div>
  );
};

interface TrendChartProps {
  data: Array<{
    date: string;
    score: number;
  }>;
  title: string;
}

export const TrendChart: React.FC<TrendChartProps> = ({ data, title }) => {
  const { isDark } = useTheme();
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} />
          <XAxis dataKey="date" tick={{ fontSize: 12, fill: isDark ? '#d1d5db' : '#374151' }} />
          <YAxis domain={[0, 5]} tick={{ fill: isDark ? '#d1d5db' : '#374151' }} />
          <Tooltip formatter={(value: number) => [value.toFixed(2), 'Средняя оценка']} contentStyle={{ backgroundColor: isDark ? '#1f2937' : '#ffffff', borderColor: isDark ? '#374151' : '#e5e7eb', color: isDark ? '#e5e7eb' : '#111827' }} />
          <Area type="monotone" dataKey="score" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.2} strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}; 

interface DistributionRankTrendChartProps {
  data: Array<{
    label: string;
    s1: number; // rank for score 1
    s2: number;
    s3: number;
    s4: number;
    s5: number;
  }>;
  title: string;
}

// Линейная диаграмма рангов распределения оценок (1..5) по периодам (циклами)
export const DistributionRankTrendChart: React.FC<DistributionRankTrendChartProps> = ({ data, title }) => {
  const { isDark } = useTheme();
  const colors = {
    s1: '#EF4444',
    s2: '#F59E0B',
    s3: '#EAB308',
    s4: '#3B82F6',
    s5: '#10B981',
  } as const;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: isDark ? '#d1d5db' : '#374151' }} />
          <YAxis domain={[1, 5]} reversed tickCount={5} allowDecimals={false} tick={{ fill: isDark ? '#d1d5db' : '#374151' }} />
          <Tooltip formatter={(value: number, name: string) => [`${value} место`, `Оценка ${name}`]} contentStyle={{ backgroundColor: isDark ? '#1f2937' : '#ffffff', borderColor: isDark ? '#374151' : '#e5e7eb', color: isDark ? '#e5e7eb' : '#111827' }} />
          <Legend wrapperStyle={{ color: isDark ? '#d1d5db' : '#374151' }} />
          <Line type="monotone" name="1" dataKey="s1" stroke={colors.s1} strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" name="2" dataKey="s2" stroke={colors.s2} strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" name="3" dataKey="s3" stroke={colors.s3} strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" name="4" dataKey="s4" stroke={colors.s4} strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" name="5" dataKey="s5" stroke={colors.s5} strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">Чем меньше значение по оси Y, тем выше место (1 — первое место по частоте оценок).</div>
    </div>
  );
};

interface HeatmapGridProps {
  rows: string[];
  columns: string[];
  values: Record<string, Record<string, number>>; // values[row][col] = score 0..5
  title: string;
}

// Простейшая тепловая карта на основе таблицы, шкала 1..5 от красного к зеленому
export const HeatmapGrid: React.FC<HeatmapGridProps> = ({ rows, columns, values, title }) => {
  const getBgColor = (score?: number) => {
    const s = typeof score === 'number' ? Math.max(0, Math.min(5, score)) : 0;
    const t = s / 5; // 0..1
    const r = t < 0.5 ? 255 : Math.round(255 * (1 - (t - 0.5) * 2));
    const g = t < 0.5 ? Math.round(255 * (t * 2)) : 255;
    const b = 80;
    return `rgb(${r}, ${g}, ${b})`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{title}</h3>
      <div className="overflow-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 bg-white dark:bg-gray-800 z-10 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 px-2 py-1 border-b border-gray-200 dark:border-gray-700">Компетенция</th>
              {columns.map((col) => (
                <th key={col} className="text-xs font-semibold text-gray-500 dark:text-gray-300 px-2 py-1 border-b border-gray-200 dark:border-gray-700 text-center whitespace-nowrap">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row}>
                <td className="sticky left-0 bg-white dark:bg-gray-800 z-10 text-sm text-gray-900 dark:text-white px-2 py-1 border-b border-gray-100 dark:border-gray-700 whitespace-nowrap">{row}</td>
                {columns.map((col) => {
                  const v = values[row]?.[col];
                  return (
                    <td key={col} className="px-1 py-1 border-b border-gray-100 dark:border-gray-700">
                      <div
                        className="h-8 rounded flex items-center justify-center text-white text-xs font-semibold"
                        style={{ backgroundColor: getBgColor(v) }}
                        title={typeof v === 'number' ? v.toFixed(2) : '—'}
                      >
                        {typeof v === 'number' ? v.toFixed(1) : '—'}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">Шкала: 1 (красный) → 5 (зелено-желтый).</div>
    </div>
  );
};

interface CategoryTrendSplineChartProps {
  data: Array<Record<string, number | string>>; // [{ label, CatA, CatB, ... }]
  categories: Array<{ key: string; color?: string }>;
  title: string;
  xKey?: string;
}

// Мультисерийный сплайновый график динамики категорий по циклам
export const CategoryTrendSplineChart: React.FC<CategoryTrendSplineChartProps> = ({ data, categories, title, xKey = 'label' }) => {
  const palette = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#06B6D4', '#F472B6', '#84CC16', '#F97316', '#A78BFA'];
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  const { isDark } = useTheme();

  const toggleKey = (key: string) => setHidden(prev => ({ ...prev, [key]: !prev[key] }));

  const legendItems = categories.map((c, idx) => ({ key: c.key, color: c.color || palette[idx % palette.length] }));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={360}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} />
          <XAxis dataKey={xKey} tick={{ fontSize: 12, fill: isDark ? '#d1d5db' : '#374151' }} />
          <YAxis domain={[0, 5]} tick={{ fill: isDark ? '#d1d5db' : '#374151' }} />
          <Tooltip formatter={(value: number) => [Number(value).toFixed(2), 'Средняя оценка']} contentStyle={{ backgroundColor: isDark ? '#1f2937' : '#ffffff', borderColor: isDark ? '#374151' : '#e5e7eb', color: isDark ? '#e5e7eb' : '#111827' }} />
          <Legend
            verticalAlign="top"
            align="left"
            content={() => (
              <div className="flex flex-wrap gap-3 mb-2">
                {legendItems.map(item => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => toggleKey(item.key)}
                    className={`flex items-center gap-2 px-2 py-1 rounded border text-xs ${hidden[item.key] ? 'opacity-50 border-gray-300 dark:border-gray-600' : 'border-transparent'}`}
                    title={hidden[item.key] ? 'Показать' : 'Скрыть'}
                  >
                    <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: item.color }} />
                    <span className="whitespace-nowrap">{item.key}</span>
                  </button>
                ))}
              </div>
            )}
          />
          {categories.filter(c => !hidden[c.key]).map((c, idx) => (
            <Line key={c.key} type="monotone" dataKey={c.key} name={c.key} stroke={c.color || palette[idx % palette.length]} strokeWidth={2} dot={{ r: 2 }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};