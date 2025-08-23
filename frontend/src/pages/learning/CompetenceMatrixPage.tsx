import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

interface CompetenceMatrix {
  id: number;
  competency_id: number;
  competency_name: string;
  competency_description: string;
  level: 'novice' | 'beginner' | 'competent' | 'proficient' | 'expert';
  score: number;
  assessment_date: string;
  notes?: string;
}

interface Competency {
  id: number;
  name: string;
  description: string;
}

const CompetenceMatrixPage: React.FC = () => {
  const [matrix, setMatrix] = useState<CompetenceMatrix[]>([]);
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [selectedCompetency, setSelectedCompetency] = useState<Competency | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [matrixResponse, competenciesResponse] = await Promise.all([
        api.get('/learning/competence-matrix'),
        api.get('/competencies')
      ]);
      setMatrix(matrixResponse.data);
      setCompetencies(competenciesResponse.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'novice': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'beginner': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'competent': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'proficient': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'expert': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'novice': return '🌱';
      case 'beginner': return '🌿';
      case 'competent': return '🌳';
      case 'proficient': return '🏆';
      case 'expert': return '👑';
      default: return '❓';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-blue-600 dark:text-blue-400';
    if (score >= 40) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-blue-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStatistics = () => {
    const total = matrix.length;
    const expert = matrix.filter(m => m.level === 'expert').length;
    const proficient = matrix.filter(m => m.level === 'proficient').length;
    const competent = matrix.filter(m => m.level === 'competent').length;
    const beginner = matrix.filter(m => m.level === 'beginner').length;
    const novice = matrix.filter(m => m.level === 'novice').length;
    const avgScore = total > 0 ? Math.round(matrix.reduce((sum, m) => sum + m.score, 0) / total) : 0;

    return { total, expert, proficient, competent, beginner, novice, avgScore };
  };

  const handleAddAssessment = async (formData: any) => {
    try {
      await api.post('/learning/competence-matrix', {
        ...formData,
        competency_id: selectedCompetency?.id
      });
      setShowAssessmentModal(false);
      setSelectedCompetency(null);
      fetchData();
    } catch (error) {
      console.error('Error adding assessment:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const stats = getStatistics();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            🧠 Матрица компетенций
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Оценка ваших профессиональных компетенций
          </p>
        </div>
        <button
          onClick={() => setShowAssessmentModal(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center"
        >
          <span className="mr-2">➕</span>
          Добавить оценку
        </button>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="text-3xl mr-4">📊</div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Оцененных компетенций</div>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="text-3xl mr-4">📈</div>
            <div>
              <div className={`text-2xl font-bold ${getScoreColor(stats.avgScore)}`}>{stats.avgScore}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Средний балл</div>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="text-3xl mr-4">👑</div>
            <div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.expert + stats.proficient}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Высокий уровень</div>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="text-3xl mr-4">🎯</div>
            <div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.competent}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Компетентный</div>
            </div>
          </div>
        </div>
      </div>

      {/* Матрица компетенций */}
      <div className="grid gap-6">
        {matrix.map((item) => (
          <div
            key={item.id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {item.competency_name}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  {item.competency_description}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getLevelColor(item.level)}`}>
                {getLevelIcon(item.level)} {item.level}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                <div className="text-sm text-gray-600 dark:text-gray-400">Уровень</div>
                <div className="font-medium text-gray-900 dark:text-white flex items-center">
                  {getLevelIcon(item.level)} {item.level}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                <div className="text-sm text-gray-600 dark:text-gray-400">Балл</div>
                <div className={`font-medium ${getScoreColor(item.score)}`}>
                  {item.score}/100
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                <div className="text-sm text-gray-600 dark:text-gray-400">Дата оценки</div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {new Date(item.assessment_date).toLocaleDateString('ru-RU')}
                </div>
              </div>
            </div>

            {/* Прогресс-бар */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Уровень компетенции
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {item.score}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className={`h-3 rounded-full ${getScoreBarColor(item.score)}`}
                  style={{ width: `${item.score}%` }}
                ></div>
              </div>
            </div>

            {item.notes && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <div className="text-sm font-medium text-blue-800 dark:text-blue-400 mb-2">
                  📝 Заметки
                </div>
                <div className="text-blue-700 dark:text-blue-300">
                  {item.notes}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Компетенции без оценки */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          📋 Компетенции без оценки
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {competencies.map((competency) => {
            const hasAssessment = matrix.some(m => m.competency_id === competency.id);
            if (hasAssessment) return null;

            return (
              <div
                key={competency.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border-2 border-dashed border-gray-300 dark:border-gray-600"
              >
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                  {competency.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                  {competency.description}
                </p>
                <button
                  onClick={() => {
                    setSelectedCompetency(competency);
                    setShowAssessmentModal(true);
                  }}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded text-sm"
                >
                  📝 Добавить оценку
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {matrix.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🧠</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Оценки компетенций не найдены
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Начните оценивать свои профессиональные компетенции
          </p>
          <button
            onClick={() => setShowAssessmentModal(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg"
          >
            Добавить оценку
          </button>
        </div>
      )}

      {/* Add Assessment Modal */}
      {showAssessmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Оценка компетенции
            </h2>
            {selectedCompetency && (
              <div className="mb-4">
                <p className="text-gray-600 dark:text-gray-400">
                  Компетенция: <strong>{selectedCompetency.name}</strong>
                </p>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                  {selectedCompetency.description}
                </p>
              </div>
            )}
            {/* TODO: Add form */}
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAssessmentModal(false);
                  setSelectedCompetency(null);
                }}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Отмена
              </button>
              <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompetenceMatrixPage;
