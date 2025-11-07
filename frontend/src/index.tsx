
// Автор: Стас Чашин @chastnik
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Подавляем известную ошибку ResizeObserver, которая не критична
// Это происходит когда ResizeObserver callback изменяет размеры наблюдаемых элементов
const originalError = window.console.error;
window.console.error = (...args: any[]) => {
  if (
    typeof args[0] === 'string' &&
    args[0].includes('ResizeObserver loop completed with undelivered notifications')
  ) {
    // Подавляем эту конкретную ошибку, так как она не критична
    return;
  }
  originalError.apply(console, args);
};

// Также обрабатываем через window.onerror
window.addEventListener('error', (event) => {
  if (
    event.message &&
    event.message.includes('ResizeObserver loop completed with undelivered notifications')
  ) {
    event.preventDefault();
    event.stopPropagation();
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