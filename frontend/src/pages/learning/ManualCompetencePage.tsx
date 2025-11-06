// © 2025 Бит.Цифра - Стас Чашин

import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

interface Competency {
  id: string;
  name: string;
  description: string;
  is_active?: boolean;
}

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  position?: string;
  department?: string;
}

interface CompetenceEntry {
  id?: number;
  competency_id: string;
  competency_name?: string;
  user_id: string;
  level: 'junior' | 'middle' | 'senior';
  score: number;
  assessment_date: string;
  notes?: string;
  source?: string;
}

const ManualCompetencePage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [competencySearchQuery, setCompetencySearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedCompetencyId, setSelectedCompetencyId] = useState<string>('');
  const [existingCompetences, setExistingCompetences] = useState<CompetenceEntry[]>([]);
  const [editingEntry, setEditingEntry] = useState<CompetenceEntry | null>(null);
  const [deletingEntryId, setDeletingEntryId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    level: 'junior' as 'junior' | 'middle' | 'senior',
    score: 50,
    assessment_date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  const [successMessage, setSuccessMessage] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, []);

  const loadExistingCompetences = useCallback(async () => {
    if (!selectedUserId) {
      setExistingCompetences([]);
      return;
    }

    try {
      const response = await api.get('/learning/competence-matrix/all').catch(() => ({ data: [] }));
      const allCompetences = Array.isArray(response.data) ? response.data : [];
      
      // Фильтруем только компетенции выбранного сотрудника с source='manual'
      const userCompetences = allCompetences
        .filter((entry: any) => 
          entry.user_id === selectedUserId && 
          entry.source === 'manual'
        )
        .map((entry: any) => ({
          id: entry.id,
          competency_id: entry.competency_id,
          competency_name: entry.competency_name,
          user_id: entry.user_id,
          level: entry.level,
          score: entry.score || 0,
          assessment_date: entry.assessment_date,
          notes: entry.notes,
          source: entry.source
        }));
      
      setExistingCompetences(userCompetences);
    } catch (error) {
      console.error('Ошибка загрузки существующих компетенций:', error);
    }
  }, [selectedUserId]);

  useEffect(() => {
    loadExistingCompetences();
  }, [loadExistingCompetences]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersResponse, competenciesResponse] = await Promise.all([
        api.get('/learning/users').catch(() => ({ data: [] })),
        api.get('/learning/competencies').catch(() => ({ data: [] }))
      ]);

      const usersData = Array.isArray(usersResponse.data) ? usersResponse.data : [];
      const competenciesData = Array.isArray(competenciesResponse.data) ? competenciesResponse.data : [];

      setUsers(usersData);
      setCompetencies(competenciesData);
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    if (!userSearchQuery) return true;
    const query = userSearchQuery.toLowerCase();
    const fullName = `${user.last_name} ${user.first_name} ${user.middle_name || ''}`.toLowerCase();
    return (
      fullName.includes(query) ||
      user.email.toLowerCase().includes(query) ||
      (user.position && user.position.toLowerCase().includes(query))
    );
  });

  const filteredCompetencies = competencies.filter(comp => {
    if (!competencySearchQuery) return true;
    const query = competencySearchQuery.toLowerCase();
    return (
      comp.name.toLowerCase().includes(query) ||
      (comp.description && comp.description.toLowerCase().includes(query))
    );
  });

  const validateForm = (): boolean => {
    const errors: {[key: string]: string} = {};

    if (!selectedUserId) {
      errors.user_id = 'Необходимо выбрать сотрудника';
    }

    if (!selectedCompetencyId) {
      errors.competency_id = 'Необходимо выбрать компетенцию';
    }

    if (formData.score < 0 || formData.score > 100) {
      errors.score = 'Балл должен быть от 0 до 100';
    }

    if (!formData.assessment_date) {
      errors.assessment_date = 'Необходимо указать дату оценки';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);
      setSuccessMessage('');

      const competenceData: CompetenceEntry = {
        ...(editingEntry?.id && { id: editingEntry.id }),
        competency_id: selectedCompetencyId,
        user_id: selectedUserId,
        level: formData.level,
        score: formData.score,
        assessment_date: formData.assessment_date,
        notes: formData.notes || undefined,
        source: 'manual'
      };

      await api.post('/learning/competence-matrix', competenceData);

      setSuccessMessage(editingEntry ? 'Компетенция успешно обновлена!' : 'Компетенция успешно указана!');
      
      // Перезагружаем существующие компетенции
      if (selectedUserId) {
        await loadExistingCompetences();
      }
      
      // Сброс формы
      setSelectedCompetencyId('');
      setEditingEntry(null);
      setFormData({
        level: 'junior',
        score: 50,
        assessment_date: new Date().toISOString().split('T')[0],
        notes: ''
      });
      setFormErrors({});

      // Очищаем сообщение об успехе через 3 секунды
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      console.error('Ошибка сохранения компетенции:', error);
      const errorMessage = error.response?.data?.error || 'Ошибка при сохранении компетенции';
      setFormErrors({ submit: errorMessage });
    } finally {
      setSaving(false);
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

  const getLevelLabel = (level: string) => {
    switch (level) {
      case 'junior': return 'Junior';
      case 'middle': return 'Middle';
      case 'senior': return 'Senior';
      default: return level;
    }
  };

  const handleEdit = (entry: CompetenceEntry) => {
    setEditingEntry(entry);
    setSelectedCompetencyId(entry.competency_id);
    setFormData({
      level: entry.level,
      score: entry.score,
      assessment_date: entry.assessment_date,
      notes: entry.notes || ''
    });
    // Прокручиваем к форме
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (entryId: number) => {
    if (!window.confirm('Вы уверены, что хотите удалить эту компетенцию?')) {
      return;
    }

    try {
      setDeletingEntryId(entryId);
      await api.delete(`/learning/competence-matrix/${entryId}`);
      setSuccessMessage('Компетенция успешно удалена!');
      
      // Перезагружаем существующие компетенции
      if (selectedUserId) {
        await loadExistingCompetences();
      }
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      console.error('Ошибка удаления компетенции:', error);
      const errorMessage = error.response?.data?.error || 'Ошибка при удалении компетенции';
      alert(errorMessage);
    } finally {
      setDeletingEntryId(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingEntry(null);
    setSelectedCompetencyId('');
    setFormData({
      level: 'junior',
      score: 50,
      assessment_date: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setFormErrors({});
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const selectedUser = users.find(u => u.id === selectedUserId);
  const selectedCompetency = competencies.find(c => c.id === selectedCompetencyId);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          ✏️ Указание компетенций
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Укажите уровень компетенции для сотрудника вручную (без прохождения тестирования). Вы можете редактировать и удалять ранее указанные компетенции.
        </p>
      </div>

      {successMessage && (
        <div className="mb-6 bg-green-100 dark:bg-green-900/20 border border-green-400 dark:border-green-700 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg">
          {successMessage}
        </div>
      )}

      {/* Список существующих компетенций */}
      {selectedUserId && existingCompetences.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Существующие компетенции сотрудника
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Компетенция
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Уровень
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Балл
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Дата оценки
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Примечания
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {existingCompetences.map((entry) => {
                  const competency = competencies.find(c => c.id === entry.competency_id);
                  return (
                    <tr key={entry.id} className={editingEntry?.id === entry.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {entry.competency_name || competency?.name || entry.competency_id}
                        </div>
                        {competency?.description && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {competency.description}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          entry.level === 'junior' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                          entry.level === 'middle' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                          'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
                        }`}>
                          {getLevelIcon(entry.level)} {getLevelLabel(entry.level)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`text-sm font-medium ${
                          entry.score >= 80 ? 'text-green-600 dark:text-green-400' :
                          entry.score >= 60 ? 'text-blue-600 dark:text-blue-400' :
                          entry.score >= 40 ? 'text-yellow-600 dark:text-yellow-400' :
                          'text-red-600 dark:text-red-400'
                        }`}>
                          {entry.score}/100
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(entry.assessment_date).toLocaleDateString('ru-RU')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                        {entry.notes || '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(entry)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                            title="Редактировать"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => entry.id && handleDelete(entry.id)}
                            disabled={deletingEntryId === entry.id}
                            className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 disabled:opacity-50"
                            title="Удалить"
                          >
                            {deletingEntryId === entry.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                            ) : (
                              '🗑️'
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Выбор сотрудника */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Сотрудник <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                placeholder="Поиск сотрудника..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white mb-2"
              />
              <div className="max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md">
                {filteredUsers.length === 0 ? (
                  <div className="p-3 text-gray-500 dark:text-gray-400 text-sm">
                    Сотрудники не найдены
                  </div>
                ) : (
                  filteredUsers.map(user => (
                    <label
                      key={user.id}
                      className={`flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${
                        selectedUserId === user.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name="user_id"
                        value={user.id}
                        checked={selectedUserId === user.id}
                        onChange={(e) => {
                          setSelectedUserId(e.target.value);
                          setSelectedCompetencyId('');
                          setEditingEntry(null);
                        }}
                        className="mr-3 text-blue-500"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {user.last_name} {user.first_name} {user.middle_name || ''}
                        </div>
                        {user.position && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {user.position}
                          </div>
                        )}
                        <div className="text-xs text-gray-400 dark:text-gray-500">
                          {user.email}
                        </div>
                      </div>
                    </label>
                  ))
                )}
              </div>
              {formErrors.user_id && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.user_id}</p>
              )}
            </div>

            {/* Выбор компетенции */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Компетенция <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={competencySearchQuery}
                onChange={(e) => setCompetencySearchQuery(e.target.value)}
                placeholder="Поиск компетенции..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white mb-2"
              />
              <div className="max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md">
                {filteredCompetencies.length === 0 ? (
                  <div className="p-3 text-gray-500 dark:text-gray-400 text-sm">
                    Компетенции не найдены
                  </div>
                ) : (
                  filteredCompetencies.map(comp => (
                    <label
                      key={comp.id}
                      className={`flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${
                        selectedCompetencyId === comp.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name="competency_id"
                        value={comp.id}
                        checked={selectedCompetencyId === comp.id}
                        onChange={(e) => setSelectedCompetencyId(e.target.value)}
                        className="mr-3 text-blue-500"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {comp.name}
                        </div>
                        {comp.description && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {comp.description}
                          </div>
                        )}
                      </div>
                    </label>
                  ))
                )}
              </div>
              {formErrors.competency_id && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.competency_id}</p>
              )}
            </div>
          </div>

          {/* Информация о выбранных значениях */}
          {(selectedUser || selectedCompetency) && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedUser && (
                  <div>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Выбранный сотрудник:
                    </div>
                    <div className="text-sm text-gray-900 dark:text-white">
                      {selectedUser.last_name} {selectedUser.first_name} {selectedUser.middle_name || ''}
                    </div>
                    {selectedUser.position && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {selectedUser.position}
                      </div>
                    )}
                  </div>
                )}
                {selectedCompetency && (
                  <div>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Выбранная компетенция:
                    </div>
                    <div className="text-sm text-gray-900 dark:text-white">
                      {selectedCompetency.name}
                    </div>
                    {selectedCompetency.description && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {selectedCompetency.description}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Поля формы */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Уровень */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Уровень <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['junior', 'middle', 'senior'] as const).map(level => (
                  <label
                    key={level}
                    className={`flex items-center justify-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.level === level
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                    }`}
                  >
                    <input
                      type="radio"
                      name="level"
                      value={level}
                      checked={formData.level === level}
                      onChange={(e) => setFormData({ ...formData, level: e.target.value as 'junior' | 'middle' | 'senior' })}
                      className="sr-only"
                    />
                    <div className="text-center">
                      <div className="text-2xl mb-1">{getLevelIcon(level)}</div>
                      <div className="text-sm font-medium">{getLevelLabel(level)}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Балл */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Балл (0-100) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.score}
                onChange={(e) => setFormData({ ...formData, score: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
              <div className="mt-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formData.score}
                  onChange={(e) => setFormData({ ...formData, score: parseInt(e.target.value) })}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
                  {formData.score} / 100
                </div>
              </div>
              {formErrors.score && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.score}</p>
              )}
            </div>
          </div>

          {/* Дата оценки */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Дата оценки <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.assessment_date}
              onChange={(e) => setFormData({ ...formData, assessment_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
            {formErrors.assessment_date && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.assessment_date}</p>
            )}
          </div>

          {/* Примечания */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Примечания (необязательно)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="Дополнительная информация о компетенции..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Ошибка отправки */}
          {formErrors.submit && (
            <div className="mb-6 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
              {formErrors.submit}
            </div>
          )}

          {/* Кнопки отправки */}
          <div className="flex justify-end space-x-3">
            {editingEntry && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium"
              >
                Отмена
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Сохранение...
                </>
              ) : (
                <>
                  <span className="mr-2">💾</span>
                  {editingEntry ? 'Обновить компетенцию' : 'Сохранить компетенцию'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ManualCompetencePage;

