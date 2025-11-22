
// Автор: Стас Чашин @chastnik
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Подавляем известную ошибку ResizeObserver, которая не критична
// Это происходит когда ResizeObserver callback изменяет размеры наблюдаемых элементов
// Это известная проблема в браузерах и не влияет на функциональность приложения

const isResizeObserverError = (message: any): boolean => {
  if (!message) return false;
  const messageStr = typeof message === 'string' ? message : String(message);
  return messageStr.includes('ResizeObserver loop completed with undelivered notifications') ||
         messageStr.includes('ResizeObserver loop');
};

// Перехватываем console.error
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  const errorMessage = args.length > 0 ? args[0] : '';
  if (isResizeObserverError(errorMessage)) {
    // Подавляем эту конкретную ошибку, так как она не критична
    return;
  }
  originalConsoleError.apply(console, args);
};

// Обрабатываем через window.onerror
window.addEventListener('error', (event) => {
  if (isResizeObserverError(event.message)) {
    event.preventDefault();
    event.stopPropagation();
    return false;
  }
});

// Обрабатываем через unhandledrejection (для Promise rejections)
window.addEventListener('unhandledrejection', (event) => {
  if (isResizeObserverError(event.reason)) {
    event.preventDefault();
    return false;
  }
});

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
); 