import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

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
          onClick={() => setShowCreateModal(true)}
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
                onClick={() => setEditingCourse(course)}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded text-sm"
              >
                ✏️ Редактировать
              </button>
              <button
                onClick={() => {/* TODO: View details */}}
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
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg"
          >
            Создать курс
          </button>
        </div>
      )}

      {/* TODO: Create/Edit Course Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl mx-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Создать новый курс
            </h2>
            {/* TODO: Add form */}
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Отмена
              </button>
              <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
                Создать
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoursesPage;
