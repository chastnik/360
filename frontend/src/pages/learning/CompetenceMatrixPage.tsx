import React, { useState, useEffect } from 'react';
import api from '../../services/api';

interface CompetenceMatrix {
  id: number;
  competency_id: string; // UUID в базе данных
  competency_name: string;
  competency_description: string;
  level: 'junior' | 'middle' | 'senior';
  score: number;
  assessment_date: string;
  notes?: string;
}

interface Competency {
  id: string; // UUID в базе данных
  name: string;
  description: string;
  is_active?: boolean;
}

const CompetenceMatrixPage: React.FC = () => {
  const [matrix, setMatrix] = useState<CompetenceMatrix[]>([]);
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [selectedCompetency, setSelectedCompetency] = useState<Competency | null>(null);
  
  // Form states for assessment modal
  const [assessmentFormData, setAssessmentFormData] = useState({
    competency_id: '',
    user_id: '',
    level: 'middle' as 'junior' | 'middle' | 'senior',
    score: 50,
    assessment_date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [users, setUsers] = useState<any[]>([]);
  const [assessmentFormErrors, setAssessmentFormErrors] = useState<{[key: string]: string}>({});
  const [isSubmittingAssessment, setIsSubmittingAssessment] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [matrixResponse, competenciesResponse, usersResponse] = await Promise.all([
        api.get('/learning/competence-matrix').catch(err => {
          console.error('Matrix API error:', err);
          return { data: [] };
        }),
        api.get('/learning/competencies').catch(err => {
          console.error('Competencies API error:', err);
          return { data: [] };
        }),
        api.get('/learning/users').catch(err => {
          console.error('Users API error:', err);
          return { data: [] };
        })
      ]);
      
      setMatrix(Array.isArray(matrixResponse.data) ? matrixResponse.data : []);
      
      // Обрабатываем ответ от learning API (возвращает данные напрямую)
      const competenciesData = competenciesResponse.data;
      setCompetencies(Array.isArray(competenciesData) ? competenciesData : []);
      
      // Устанавливаем пользователей
      setUsers(Array.isArray(usersResponse.data) ? usersResponse.data : []);
      
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'junior': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'middle': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'senior': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'junior': return '🌱';
      case 'middle': return '🌿';
      case 'senior': return '🌳';
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

  const getSuggestedLevelByScore = (score: number): 'junior' | 'middle' | 'senior' => {
    if (score >= 75) return 'senior';
    if (score >= 50) return 'middle';
    return 'junior';
  };

  const getStatistics = () => {
    const total = matrix.length;
    const junior = matrix.filter(m => m.level === 'junior').length;
    const middle = matrix.filter(m => m.level === 'middle').length;
    const senior = matrix.filter(m => m.level === 'senior').length;
    const avgScore = total > 0 ? Math.round(matrix.reduce((sum, m) => sum + m.score, 0) / total) : 0;

    return { total, junior, middle, senior, avgScore };
  };

  const handleAssessmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingAssessment(true);
    setAssessmentFormErrors({});

    try {
      await api.post('/learning/competence-matrix', {
        competency_id: assessmentFormData.competency_id || selectedCompetency?.id,
        user_id: assessmentFormData.user_id,
        level: assessmentFormData.level,
        score: assessmentFormData.score,
        assessment_date: assessmentFormData.assessment_date,
        notes: assessmentFormData.notes || null
      });
      
      setShowAssessmentModal(false);
      setSelectedCompetency(null);
      setAssessmentFormData({
        competency_id: '',
        user_id: '',
        level: 'middle',
        score: 50,
        assessment_date: new Date().toISOString().split('T')[0],
        notes: ''
      });
      fetchData();
    } catch (error) {
      console.error('Error adding assessment:', error);
      setAssessmentFormErrors({
        general: 'Произошла ошибка при сохранении оценки'
      });
    } finally {
      setIsSubmittingAssessment(false);
    }
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
            Оценка профессиональных компетенций
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
            <div className="text-3xl mr-4">🌳</div>
            <div>
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.senior}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Senior</div>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="text-3xl mr-4">🌿</div>
            <div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.middle}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Middle</div>
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
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg mx-4">
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

            {assessmentFormErrors.general && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {assessmentFormErrors.general}
              </div>
            )}

            <form onSubmit={handleAssessmentSubmit}>
              {/* Выбор компетенции */}
              {!selectedCompetency && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Компетенция
                  </label>
                  <select
                    value={assessmentFormData.competency_id}
                    onChange={(e) => setAssessmentFormData({...assessmentFormData, competency_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    required
                    disabled={competencies.length === 0}
                  >
                    <option value="">
                      {competencies.length === 0 ? 'Загрузка компетенций...' : 'Выберите компетенцию'}
                    </option>
                    {competencies.map((competency) => (
                      <option key={competency.id} value={competency.id}>
                        {competency.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Выбор пользователя */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Оцениваемый пользователь
                </label>
                <select
                  value={assessmentFormData.user_id}
                  onChange={(e) => setAssessmentFormData({...assessmentFormData, user_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                  disabled={users.length === 0}
                >
                  <option value="">
                    {users.length === 0 ? 'Загрузка пользователей...' : 'Выберите пользователя'}
                  </option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.last_name} {user.first_name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Уровень компетенции */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Уровень компетенции
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const suggestedLevel = getSuggestedLevelByScore(assessmentFormData.score);
                      setAssessmentFormData({...assessmentFormData, level: suggestedLevel});
                    }}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                  >
                    🤖 Определить по баллу
                  </button>
                </div>
                <div className="space-y-2">
                  {[
                    { value: 'junior', label: 'Junior', icon: '🌱', description: 'Начальный уровень' },
                    { value: 'middle', label: 'Middle', icon: '🌿', description: 'Средний уровень' },
                    { value: 'senior', label: 'Senior', icon: '🌳', description: 'Старший уровень' }
                  ].map((level) => (
                    <label key={level.value} className="flex items-center p-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                      <input
                        type="radio"
                        name="level"
                        value={level.value}
                        checked={assessmentFormData.level === level.value}
                        onChange={(e) => setAssessmentFormData({...assessmentFormData, level: e.target.value as any})}
                        className="mr-3 text-blue-500"
                      />
                      <span className="text-lg mr-2">{level.icon}</span>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{level.label}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{level.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Балл */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Балл (0-100)
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={assessmentFormData.score}
                    onChange={(e) => setAssessmentFormData({...assessmentFormData, score: parseInt(e.target.value)})}
                    className="flex-1"
                  />
                  <div className="w-16 text-center">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={assessmentFormData.score}
                      onChange={(e) => setAssessmentFormData({...assessmentFormData, score: parseInt(e.target.value) || 0})}
                      className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-center dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
                <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Текущий балл: <span className={`font-medium ${getScoreColor(assessmentFormData.score)}`}>{assessmentFormData.score}</span>
                </div>
              </div>

              {/* Дата оценки */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Дата оценки
                </label>
                <input
                  type="date"
                  value={assessmentFormData.assessment_date}
                  onChange={(e) => setAssessmentFormData({...assessmentFormData, assessment_date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>

              {/* Заметки */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Заметки (опционально)
                </label>
                <textarea
                  value={assessmentFormData.notes}
                  onChange={(e) => setAssessmentFormData({...assessmentFormData, notes: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Дополнительные комментарии к оценке..."
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAssessmentModal(false);
                    setSelectedCompetency(null);
                    setAssessmentFormData({
                      competency_id: '',
                      user_id: '',
                      level: 'middle',
                      score: 50,
                      assessment_date: new Date().toISOString().split('T')[0],
                      notes: ''
                    });
                    setAssessmentFormErrors({});
                  }}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                  disabled={isSubmittingAssessment}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
                  disabled={isSubmittingAssessment}
                >
                  {isSubmittingAssessment ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                      Сохранение...
                    </>
                  ) : (
                    'Сохранить'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompetenceMatrixPage;
