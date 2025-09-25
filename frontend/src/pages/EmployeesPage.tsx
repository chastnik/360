// Автор: Стас Чашин @chastnik
import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import StructurePage from './StructurePage';
import VacationsPage from './VacationsPage';

const EmployeesPage: React.FC = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(() => {
    // Определяем активную вкладку из URL
    if (location.pathname.includes('/employees/vacations')) {
      return 'vacations';
    }
    return 'structure';
  });

  const tabs = [
    { id: 'structure', name: 'Структура', icon: '🏢' },
    { id: 'vacations', name: 'Отпуска', icon: '🏖️' }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'structure':
        return <StructurePage />;
      case 'vacations':
        return <VacationsPage />;
      default:
        return <StructurePage />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Сотрудники</h1>
      </div>

      {/* Вкладки */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
            >
              <span>{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Контент вкладки */}
      <div>
        {renderContent()}
      </div>
    </div>
  );
};

export default EmployeesPage;
