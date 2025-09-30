// © 2025 Бит.Цифра - Стас Чашин

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

interface LearningStats {
  activeCourses: number;
  growthPlans: number;
  passedTests: number;
  competenceAssessments: number;
}

const LearningPage: React.FC = () => {
  const [stats, setStats] = useState<LearningStats>({
    activeCourses: 0,
    growthPlans: 0,
    passedTests: 0,
    competenceAssessments: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      
      // Параллельно загружаем все данные с обработкой ошибок для каждого endpoint
      const [coursesResponse, plansResponse, competenceResponse] = await Promise.all([
        api.get('/learning/courses').catch(() => ({ data: [] })),
        api.get('/learning/growth-plans').catch(() => ({ data: [] })),
        api.get('/learning/competence-matrix').catch(() => ({ data: [] })) // Может быть недоступно для некоторых пользователей
      ]);

      const courses = Array.isArray(coursesResponse.data) ? coursesResponse.data : [];
      const plans = Array.isArray(plansResponse.data) ? plansResponse.data : [];
      const competenceMatrix = Array.isArray(competenceResponse.data) ? competenceResponse.data : [];

      // Подсчитываем пройденные тесты из всех планов
      let passedTests = 0;
      plans.forEach((plan: any) => {
        if (plan.test_results && Array.isArray(plan.test_results)) {
          passedTests += plan.test_results.filter((test: any) => test.status === 'passed').length;
        }
      });

      setStats({
        activeCourses: courses.length,
        growthPlans: plans.length,
        passedTests: passedTests,
        competenceAssessments: competenceMatrix.length
      });
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error);
      // В случае критической ошибки оставляем нулевые значения
    } finally {
      setLoading(false);
    }
  };

  const learningModules = [
    {
      title: 'Курсы',
      description: 'Управление учебными курсами и их зависимостями',
      icon: '📚',
      href: '/learning/courses',
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      title: 'График обучения',
      description: 'Просмотр всех планов обучения сотрудников',
      icon: '📅',
      href: '/learning/schedule',
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      title: 'Планы индивидуального роста',
      description: 'Создание и управление персональными планами развития',
      icon: '📈',
      href: '/learning/growth-plans',
      color: 'bg-purple-500 hover:bg-purple-600'
    },
    {
      title: 'Тестирование',
      description: 'Результаты тестирования по курсам',
      icon: '✅',
      href: '/learning/testing',
      color: 'bg-yellow-500 hover:bg-yellow-600'
    },
    {
      title: 'Матрица компетенций',
      description: 'Оценка компетенций сотрудников',
      icon: '🧠',
      href: '/learning/competence-matrix',
      color: 'bg-red-500 hover:bg-red-600'
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          🎓 Модуль обучения
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Управление учебными курсами, планами развития и оценкой компетенций
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {learningModules.map((module, index) => (
          <Link
            key={index}
            to={module.href}
            className={`${module.color} text-white rounded-lg p-6 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105`}
          >
            <div className="flex items-center mb-4">
              <span className="text-3xl mr-3">{module.icon}</span>
              <h3 className="text-xl font-semibold">{module.title}</h3>
            </div>
            <p className="text-blue-100">{module.description}</p>
          </Link>
        ))}
      </div>

      <div className="mt-12 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            📊 Статистика обучения
          </h2>
          <button
            onClick={loadStatistics}
            disabled={loading}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 disabled:opacity-50"
            title="Обновить статистику"
          >
            <span className={`text-lg ${loading ? 'animate-spin' : ''}`}>🔄</span>
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {loading ? (
                <div className="animate-pulse bg-blue-300 dark:bg-blue-600 h-6 w-12 rounded"></div>
              ) : (
                stats.activeCourses
              )}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Активных курсов</div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {loading ? (
                <div className="animate-pulse bg-green-300 dark:bg-green-600 h-6 w-12 rounded"></div>
              ) : (
                stats.growthPlans
              )}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Планов роста</div>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {loading ? (
                <div className="animate-pulse bg-yellow-300 dark:bg-yellow-600 h-6 w-12 rounded"></div>
              ) : (
                stats.passedTests
              )}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Пройденных тестов</div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {loading ? (
                <div className="animate-pulse bg-purple-300 dark:bg-purple-600 h-6 w-12 rounded"></div>
              ) : (
                stats.competenceAssessments
              )}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Оцененных компетенций</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LearningPage;
