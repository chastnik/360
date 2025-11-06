// Автор: Стас Чашин @chastnik
import React, { useState } from 'react';

interface TooltipTitleProps {
  title: string;
  description: string;
  className?: string;
}

export const TooltipTitle: React.FC<TooltipTitleProps> = ({ title, description, className = '' }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative inline-block w-full">
      <div
        className={`flex items-center gap-2 cursor-help ${className}`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          {title}
        </h3>
        <span className="text-gray-400 dark:text-gray-500 text-sm hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </span>
      </div>
      {showTooltip && (
        <div className="absolute z-50 left-0 top-full mt-2 w-80 p-3 bg-gray-900 dark:bg-gray-800 text-white dark:text-gray-100 text-sm rounded-lg shadow-lg border border-gray-700 dark:border-gray-600 pointer-events-none">
          <div className="font-semibold mb-1">{title}</div>
          <div className="text-gray-300 dark:text-gray-400 whitespace-normal">{description}</div>
          <div className="absolute -top-2 left-4 w-4 h-4 bg-gray-900 dark:bg-gray-800 border-l border-t border-gray-700 dark:border-gray-600 transform rotate-45"></div>
        </div>
      )}
    </div>
  );
};

