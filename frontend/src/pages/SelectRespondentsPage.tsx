
// Автор: Стас Чашин @chastnik
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

interface ParticipantInfo {
  id: number;
  cycle_id: number;
  participant_status: string;
  cycle_name: string;
  cycle_description: string;
  cycle_status: string;
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  existingRespondents: Respondent[];
}

interface Respondent {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
}

interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  position?: string;
}

export const SelectRespondentsPage: React.FC = () => {
  const { participantId } = useParams<{ participantId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [participantInfo, setParticipantInfo] = useState<ParticipantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedRespondents, setSelectedRespondents] = useState<number[]>([]);
  const [selectedUsersData, setSelectedUsersData] = useState<Map<number, User>>(new Map());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (participantId) {
      loadParticipantInfo();
    }
  }, [participantId]);

  const loadParticipantInfo = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/cycles/participants/${participantId}`);
      if (response.data?.success && response.data?.data) {
        const data = response.data.data;
        
        // Проверяем, что текущий пользователь является участником
        // Сравниваем как строки, так как на фронтенде id может быть строкой
        if (String(user?.id) !== String(data.user_id)) {
          setError('Доступ запрещен. Вы можете выбрать респондентов только для своего участия в цикле.');
          setLoading(false);
          return;
        }
        
        setParticipantInfo(data);
        // Загружаем уже выбранных респондентов
        const existingIds = data.existingRespondents?.map((r: Respondent) => r.user_id) || [];
        setSelectedRespondents(existingIds);
      } else {
        setError('Не удалось загрузить информацию об участнике');
      }
    } catch (err: any) {
      console.error('Ошибка загрузки информации об участнике:', err);
      const errorMessage = err.response?.data?.error || 'Не удалось загрузить информацию об участнике';
      setError(errorMessage);
      
      // Если ошибка доступа, перенаправляем на мой дашборд
      if (err.response?.status === 403) {
        setTimeout(() => {
          navigate('/my-dashboard');
        }, 3000);
      }
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async (query: string) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const response = await api.post('/mattermost/search-respondents', { query: query.trim() });
      if (response.data?.success && response.data?.data) {
        // Исключаем уже выбранных респондентов и самого участника
        const filtered = response.data.data.filter((u: User) => 
          u.id !== participantInfo?.user_id && 
          !selectedRespondents.includes(u.id) &&
          !participantInfo?.existingRespondents?.some((r: Respondent) => r.user_id === u.id)
        );
        setSearchResults(filtered);
      }
    } catch (err: any) {
      console.error('Ошибка поиска пользователей:', err);
      setError(err.response?.data?.error || 'Ошибка поиска пользователей');
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm) {
        searchUsers(searchTerm);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Синхронизируем данные выбранных пользователей из результатов поиска
  useEffect(() => {
    if (searchResults.length > 0) {
      setSelectedUsersData(prevData => {
        const newData = new Map(prevData);
        searchResults.forEach(user => {
          if (selectedRespondents.includes(user.id)) {
            newData.set(user.id, user);
          }
        });
        return newData;
      });
    }
  }, [searchResults, selectedRespondents]);

  const toggleRespondent = (userId: number) => {
    setSelectedRespondents(prev => {
      if (prev.includes(userId)) {
        // Удаляем пользователя из выбранных
        setSelectedUsersData(prevData => {
          const newData = new Map(prevData);
          newData.delete(userId);
          return newData;
        });
        return prev.filter(id => id !== userId);
      } else {
        // Добавляем пользователя в выбранные
        const user = searchResults.find(u => u.id === userId);
        if (user) {
          setSelectedUsersData(prevData => {
            const newData = new Map(prevData);
            newData.set(userId, user);
            return newData;
          });
        }
        return [...prev, userId];
      }
    });
  };

  const handleSave = async () => {
    if (!participantInfo || selectedRespondents.length < 4) {
      setError('Необходимо выбрать минимум 4 респондента');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await api.post(`/cycles/${participantInfo.cycle_id}/participants/${participantId}/respondents`, {
        respondentIds: selectedRespondents
      });
      // Обновляем информацию об участнике
      await loadParticipantInfo();
      setError(null);
      alert('Респонденты успешно добавлены!');
    } catch (err: any) {
      console.error('Ошибка сохранения респондентов:', err);
      setError(err.response?.data?.error || 'Не удалось сохранить респондентов');
    } finally {
      setSaving(false);
    }
  };

  const removeRespondent = (userId: number) => {
    setSelectedRespondents(prev => prev.filter(id => id !== userId));
    setSelectedUsersData(prevData => {
      const newData = new Map(prevData);
      newData.delete(userId);
      return newData;
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error && !participantInfo) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
        <button
          onClick={() => navigate('/my-dashboard')}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium"
        >
          Вернуться в мой дашборд
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Выбор респондентов
        </h1>
        {participantInfo && (
          <div className="text-gray-600 dark:text-gray-400">
            <p>Цикл оценки: <span className="font-medium">{participantInfo.cycle_name}</span></p>
            <p className="text-sm mt-1">{participantInfo.cycle_description}</p>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Уже выбранные респонденты */}
      {participantInfo && participantInfo.existingRespondents && participantInfo.existingRespondents.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
            Уже выбранные респонденты ({participantInfo.existingRespondents.length})
          </h2>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="space-y-2">
              {participantInfo.existingRespondents.map((respondent) => (
                <div key={respondent.id} className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700 last:border-0">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {respondent.first_name} {respondent.last_name}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {respondent.email}
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    respondent.status === 'invited' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                    respondent.status === 'in_progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  }`}>
                    {respondent.status === 'invited' ? 'Приглашен' :
                     respondent.status === 'in_progress' ? 'В процессе' : 'Завершен'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Поиск и выбор респондентов */}
      <div className="mb-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
          Добавить респондентов
        </h2>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <input
            type="text"
            placeholder="Поиск по имени, email или @username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white mb-4"
          />

          {searching && (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  className={`flex justify-between items-center p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedRespondents.includes(user.id)
                      ? 'bg-primary-100 dark:bg-primary-900/30 border-2 border-primary-500'
                      : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                  onClick={() => toggleRespondent(user.id)}
                >
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {user.first_name} {user.last_name}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {user.email} {user.position && ` • ${user.position}`}
                    </div>
                  </div>
                  {selectedRespondents.includes(user.id) && (
                    <span className="text-primary-600 dark:text-primary-400">✓</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {searchTerm && !searching && searchResults.length === 0 && (
            <div className="text-center py-4 text-gray-500 dark:text-gray-400">
              Пользователи не найдены
            </div>
          )}
        </div>
      </div>

      {/* Выбранные респонденты */}
      {selectedRespondents.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
            Выбрано респондентов: {selectedRespondents.length}
            {selectedRespondents.length < 4 && (
              <span className="text-red-600 dark:text-red-400 ml-2">
                (минимум 4)
              </span>
            )}
          </h2>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex flex-wrap gap-2">
              {selectedRespondents.map((userId) => {
                // Ищем пользователя сначала в кэше, затем в результатах поиска
                const user = selectedUsersData.get(userId) || searchResults.find(u => u.id === userId);
                if (!user) {
                  return null;
                }
                return (
                  <div
                    key={userId}
                    className="flex items-center gap-2 bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 px-3 py-1 rounded-full"
                  >
                    <span>{user.first_name} {user.last_name}</span>
                    {user.email && (
                      <span className="text-xs text-primary-600 dark:text-primary-400">
                        ({user.email})
                      </span>
                    )}
                    <button
                      onClick={() => removeRespondent(userId)}
                      className="text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Кнопки действий */}
      <div className="flex justify-end gap-3">
        <button
          onClick={() => navigate('/my-dashboard')}
          className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
        >
          Отмена
        </button>
        <button
          onClick={handleSave}
          disabled={saving || selectedRespondents.length < 4}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Сохранение...' : 'Сохранить респондентов'}
        </button>
      </div>
    </div>
  );
};

