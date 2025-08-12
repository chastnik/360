// Автор: Стас Чашин @chastnik
import React from 'react';
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
  Line
} from 'recharts';

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
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="name" 
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis domain={[0, 5]} />
          <Tooltip 
            formatter={(value: number) => [value.toFixed(2), 'Средняя оценка']}
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
          <PolarGrid />
          <PolarAngleAxis dataKey="category" tick={{ fontSize: 12 }} />
          <PolarRadiusAxis domain={[0, 5]} tick={{ fontSize: 10 }} />
          <Radar
            name="Оценка"
            dataKey="score"
            stroke="#3B82F6"
            fill="#3B82F6"
            fillOpacity={0.3}
          />
          <Tooltip formatter={(value: number) => [value.toFixed(2), 'Средняя оценка']} />
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
          <Tooltip />
          <Legend />
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
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="category" 
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis domain={[0, 5]} />
          <Tooltip 
            formatter={(value: number) => [value.toFixed(2), 'Средняя оценка']}
          />
          <Legend />
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
          <PolarGrid />
          <PolarAngleAxis dataKey="category" tick={{ fontSize: 12 }} />
          <PolarRadiusAxis domain={[0, 5]} tick={{ fontSize: 10 }} />
          {data.map((p, idx) => (
            <Radar key={p.participantId} name={p.participantName} dataKey={p.participantName} stroke={colors[idx % colors.length]} fill={colors[idx % colors.length]} fillOpacity={0.15} />
          ))}
          <Tooltip />
          <Legend />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

interface OverallScoreProps {
  score: number;
  title: string;
}

export const OverallScoreDisplay: React.FC<OverallScoreProps> = ({ score, title }) => {
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

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col h-full">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{title}</h3>
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <div className={`text-6xl font-bold mb-2 ${getScoreColor(score)}`}>
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
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis domain={[0, 5]} />
          <Tooltip 
            formatter={(value: number) => [value.toFixed(2), 'Средняя оценка']}
          />
          <Line 
            type="monotone" 
            dataKey="score" 
            stroke="#3B82F6" 
            strokeWidth={2}
            dot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}; 