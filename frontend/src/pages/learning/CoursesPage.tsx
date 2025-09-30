
import React, { useState, useEffect } from 'react';
import api from '../../services/api';

interface Course {
  id: number;
  name: string;
  description: string;
  hours: number;
  target_level: 'junior' | 'middle' | 'senior';
  is_active: boolean;
  prerequisites?: Course[];
  corequisites?: Course[];
}

const CoursesPage: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [viewingCourse, setViewingCourse] = useState<Course | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    hours: 0,
    target_level: 'junior' as 'junior' | 'middle' | 'senior',
    prerequisites: [] as number[],
    corequisites: [] as number[]
  });

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const response = await api.get('/learning/courses');
      setCourses(response.data);
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.post('/learning/courses', formData);
      setCourses([...courses, response.data]);
      setShowCreateModal(false);
      setFormData({ name: '', description: '', hours: 0, target_level: 'junior', prerequisites: [], corequisites: [] });
    } catch (error) {
      console.error('Error creating course:', error);
    }
  };

  const handleEditCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourse) return;
    try {
      const response = await api.put(`/learning/courses/${editingCourse.id}`, formData);
      setCourses(courses.map(c => c.id === editingCourse.id ? response.data : c));
      setEditingCourse(null);
      setFormData({ name: '', description: '', hours: 0, target_level: 'junior', prerequisites: [], corequisites: [] });
    } catch (error) {
      console.error('Error updating course:', error);
    }
  };

  const openCreateModal = () => {
    setFormData({ name: '', description: '', hours: 0, target_level: 'junior', prerequisites: [], corequisites: [] });
    setShowCreateModal(true);
  };

  const openEditModal = async (course: Course) => {
    try {
      // Загружаем полные данные курса с зависимостями
      const response = await api.get(`/learning/courses/${course.id}`);
      const fullCourse = response.data;
      
      setFormData({
        name: fullCourse.name,
        description: fullCourse.description,
        hours: fullCourse.hours,
        target_level: fullCourse.target_level,
        prerequisites: fullCourse.prerequisites ? fullCourse.prerequisites.map((p: Course) => p.id) : [],
        corequisites: fullCourse.corequisites ? fullCourse.corequisites.map((c: Course) => c.id) : []
      });
      setEditingCourse(fullCourse);
    } catch (error) {
      console.error('Error loading course details:', error);
      // Fallback к базовым данным
      setFormData({
        name: course.name,
        description: course.description,
        hours: course.hours,
        target_level: course.target_level,
        prerequisites: [],
        corequisites: []
      });
      setEditingCourse(course);
    }
  };

  const openDetailsModal = async (course: Course) => {
    try {
      const response = await api.get(`/learning/courses/${course.id}`);
      setViewingCourse(response.data);
    } catch (error) {
      console.error('Error fetching course details:', error);
      setViewingCourse(course);
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'junior': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'middle': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'senior': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            📚 Курсы обучения
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Управление учебными курсами и их зависимостями
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center"
        >
          <span className="mr-2">➕</span>
          Добавить курс
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course) => (
          <div
            key={course.id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {course.name}
              </h3>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(course.target_level)}`}>
                {getLevelIcon(course.target_level)} {course.target_level}
              </span>
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
              {course.description}
            </p>
            
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                ⏱️ {course.hours} часов
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                course.is_active 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                  : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
              }`}>
                {course.is_active ? '✅ Активен' : '❌ Неактивен'}
              </span>
            </div>

            {course.prerequisites && course.prerequisites.length > 0 && (
              <div className="mb-3">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  📋 Требования:
                </span>
                <div className="mt-1">
                  {course.prerequisites.map((prereq) => (
                    <span
                      key={prereq.id}
                      className="inline-block bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 text-xs px-2 py-1 rounded mr-1 mb-1"
                    >
                      {prereq.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {course.corequisites && course.corequisites.length > 0 && (
              <div className="mb-4">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  🔗 Параллельно:
                </span>
                <div className="mt-1">
                  {course.corequisites.map((coreq) => (
                    <span
                      key={coreq.id}
                      className="inline-block bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-400 text-xs px-2 py-1 rounded mr-1 mb-1"
                    >
                      {coreq.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex space-x-2">
              <button
                onClick={() => openEditModal(course)}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded text-sm"
              >
                ✏️ Редактировать
              </button>
              <button
                onClick={() => openDetailsModal(course)}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded text-sm"
              >
                👁️ Подробнее
              </button>
            </div>
          </div>
        ))}
      </div>

      {courses.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Курсы не найдены
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Создайте первый курс для начала работы с модулем обучения
          </p>
          <button
            onClick={openCreateModal}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg"
          >
            Создать курс
          </button>
        </div>
      )}

      {/* Create/Edit Course Modal */}
      {(showCreateModal || editingCourse) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl mx-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              {editingCourse ? 'Редактировать курс' : 'Создать новый курс'}
            </h2>
            <form onSubmit={editingCourse ? handleEditCourse : handleCreateCourse}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Название курса
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Описание
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Продолжительность (часы)
                  </label>
                  <input
                    type="number"
                    value={formData.hours}
                    onChange={(e) => setFormData({ ...formData, hours: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    required
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Уровень
                  </label>
                  <select
                    value={formData.target_level}
                    onChange={(e) => setFormData({ ...formData, target_level: e.target.value as 'junior' | 'middle' | 'senior' })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="junior">🌱 Junior</option>
                    <option value="middle">🌿 Middle</option>
                    <option value="senior">🌳 Senior</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    📋 Требования (Prerequisites)
                  </label>
                  <div className="border border-gray-300 dark:border-gray-600 rounded-md p-2 max-h-32 overflow-y-auto">
                    {courses.filter(c => c.id !== editingCourse?.id).map(course => (
                      <label key={course.id} className="flex items-center space-x-2 py-1">
                        <input
                          type="checkbox"
                          checked={formData.prerequisites.includes(course.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                prerequisites: [...formData.prerequisites, course.id]
                              });
                            } else {
                              setFormData({
                                ...formData,
                                prerequisites: formData.prerequisites.filter(id => id !== course.id)
                              });
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{course.name}</span>
                      </label>
                    ))}
                    {courses.filter(c => c.id !== editingCourse?.id).length === 0 && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 py-2">Нет доступных курсов</p>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Курсы, которые нужно пройти перед этим курсом
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    🔗 Параллельные курсы (Corequisites)
                  </label>
                  <div className="border border-gray-300 dark:border-gray-600 rounded-md p-2 max-h-32 overflow-y-auto">
                    {courses.filter(c => c.id !== editingCourse?.id).map(course => (
                      <label key={course.id} className="flex items-center space-x-2 py-1">
                        <input
                          type="checkbox"
                          checked={formData.corequisites.includes(course.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                corequisites: [...formData.corequisites, course.id]
                              });
                            } else {
                              setFormData({
                                ...formData,
                                corequisites: formData.corequisites.filter(id => id !== course.id)
                              });
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{course.name}</span>
                      </label>
                    ))}
                    {courses.filter(c => c.id !== editingCourse?.id).length === 0 && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 py-2">Нет доступных курсов</p>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Курсы, которые изучаются одновременно с этим курсом
                  </p>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingCourse(null);
                    setFormData({ name: '', description: '', hours: 0, target_level: 'junior', prerequisites: [], corequisites: [] });
                  }}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                >
                  {editingCourse ? 'Сохранить' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Course Details Modal */}
      {viewingCourse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {viewingCourse.name}
              </h2>
              <button
                onClick={() => setViewingCourse(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getLevelColor(viewingCourse.target_level)}`}>
                  {getLevelIcon(viewingCourse.target_level)} {viewingCourse.target_level}
                </span>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Описание</h3>
                <p className="text-gray-600 dark:text-gray-400">{viewingCourse.description}</p>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Продолжительность</h3>
                <p className="text-gray-600 dark:text-gray-400">⏱️ {viewingCourse.hours} часов</p>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Статус</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  viewingCourse.is_active 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                }`}>
                  {viewingCourse.is_active ? '✅ Активен' : '❌ Неактивен'}
                </span>
              </div>
              {viewingCourse.prerequisites && viewingCourse.prerequisites.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">📋 Требования</h3>
                  <div className="space-y-2">
                    {viewingCourse.prerequisites.map((prereq) => (
                      <div key={prereq.id} className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                        <span className="font-medium text-blue-800 dark:text-blue-400">{prereq.name}</span>
                        <p className="text-sm text-blue-600 dark:text-blue-300">{prereq.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {viewingCourse.corequisites && viewingCourse.corequisites.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">🔗 Параллельные курсы</h3>
                  <div className="space-y-2">
                    {viewingCourse.corequisites.map((coreq) => (
                      <div key={coreq.id} className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                        <span className="font-medium text-purple-800 dark:text-purple-400">{coreq.name}</span>
                        <p className="text-sm text-purple-600 dark:text-purple-300">{coreq.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoursesPage;
