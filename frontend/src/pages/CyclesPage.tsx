import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

interface Cycle {
  id: number;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  status: 'draft' | 'active' | 'completed';
  created_at: string;
  participants?: Participant[];
}

interface Participant {
  id: number;
  user_id: number;
  name: string;
  email: string;
  status: 'pending' | 'in_progress' | 'completed';
  respondents?: Respondent[];
}

interface Respondent {
  id: number;
  respondent_id: number;
  name: string;
  email: string;
  status: 'pending' | 'in_progress' | 'completed';
}

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  position: string;
  department: string;
}

export const CyclesPage: React.FC = () => {
  const { user } = useAuth();
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState<Cycle | null>(null);
  const [showParticipantForm, setShowParticipantForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Форма создания цикла
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: ''
  });

  useEffect(() => {
    loadCycles();
    loadUsers();
  }, []);

  const loadCycles = async () => {
    try {
      const response = await api.get('/cycles');
      setCycles(response.data);
    } catch (error) {
      console.error('Ошибка при загрузке циклов:', error);
      setError('Не удалось загрузить циклы');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Ошибка при загрузке пользователей:', error);
    }
  };

  const handleCreateCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/cycles', formData);
      setShowCreateForm(false);
      setFormData({ name: '', description: '', start_date: '', end_date: '' });
      loadCycles();
    } catch (error) {
      console.error('Ошибка при создании цикла:', error);
      setError('Не удалось создать цикл');
    }
  };

  const handleStartCycle = async (cycleId: number) => {
    try {
      await api.post(`/cycles/${cycleId}/start`);
      loadCycles();
    } catch (error) {
      console.error('Ошибка при запуске цикла:', error);
      setError('Не удалось запустить цикл');
    }
  };

  const handleAddParticipant = async (userId: number) => {
    if (!selectedCycle) return;
    
    try {
      await api.post(`/cycles/${selectedCycle.id}/participants`, { user_id: userId });
      loadCycleDetails(selectedCycle.id);
    } catch (error) {
      console.error('Ошибка при добавлении участника:', error);
      setError('Не удалось добавить участника');
    }
  };

  const loadCycleDetails = async (cycleId: number) => {
    try {
      const response = await api.get(`/cycles/${cycleId}`);
      setSelectedCycle(response.data);
    } catch (error) {
      console.error('Ошибка при загрузке деталей цикла:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return 'Черновик';
      case 'active': return 'Активный';
      case 'completed': return 'Завершен';
      default: return 'Неизвестно';
    }
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const canManageCycles = user?.role === 'admin' || user?.role === 'manager';

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Циклы оценки
          </h1>
          {canManageCycles && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Создать цикл
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Список циклов */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {cycles.map(cycle => (
            <div key={cycle.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  {cycle.name}
                </h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(cycle.status)}`}>
                  {getStatusText(cycle.status)}
                </span>
              </div>
              
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {cycle.description}
              </p>
              
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                <div>Начало: {new Date(cycle.start_date).toLocaleDateString()}</div>
                <div>Окончание: {new Date(cycle.end_date).toLocaleDateString()}</div>
              </div>
              
              <div className="flex justify-between items-center">
                <button
                  onClick={() => loadCycleDetails(cycle.id)}
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  Подробности
                </button>
                
                {canManageCycles && cycle.status === 'draft' && (
                  <button
                    onClick={() => handleStartCycle(cycle.id)}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                  >
                    Запустить
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Форма создания цикла */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Создать новый цикл
              </h3>
              
              <form onSubmit={handleCreateCycle} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Название
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Описание
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    rows={3}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Дата начала
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Дата окончания
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Создать
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Детали цикла */}
        {selectedCycle && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  {selectedCycle.name}
                </h3>
                <button
                  onClick={() => setSelectedCycle(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                  Участники ({selectedCycle.participants?.length || 0})
                </h4>
                
                {canManageCycles && (
                  <button
                    onClick={() => setShowParticipantForm(true)}
                    className="bg-primary-600 hover:bg-primary-700 text-white px-3 py-1 rounded text-sm mb-4"
                  >
                    Добавить участника
                  </button>
                )}
                
                <div className="space-y-3">
                  {selectedCycle.participants?.map(participant => (
                    <div key={participant.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {participant.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {participant.email}
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(participant.status)}`}>
                          {getStatusText(participant.status)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Форма добавления участника */}
              {showParticipantForm && (
                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-4">
                    Добавить участника
                  </h4>
                  
                  <input
                    type="text"
                    placeholder="Поиск пользователей..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white mb-4"
                  />
                  
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {filteredUsers.map(user => (
                      <div key={user.id} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {user.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {user.email} • {user.position}
                          </div>
                        </div>
                        <button
                          onClick={() => handleAddParticipant(user.id)}
                          className="bg-primary-600 hover:bg-primary-700 text-white px-3 py-1 rounded text-sm"
                        >
                          Добавить
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex justify-end mt-4">
                    <button
                      onClick={() => setShowParticipantForm(false)}
                      className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
                    >
                      Закрыть
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}; 