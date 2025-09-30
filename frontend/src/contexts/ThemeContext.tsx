
// Автор: Стас Чашин @chastnik
import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';
type ThemeMode = 'auto' | 'light' | 'dark';

interface ThemeContextType {
  theme: Theme; // применённая тема
  themeMode: ThemeMode; // режим: auto/light/dark
  isDark: boolean;
  toggleTheme: () => void; // быстрый переключатель (light<->dark)
  setTheme: (theme: Theme) => void; // напрямую применить тему
  setThemeMode: (mode: ThemeMode) => void; // установить режим
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('themeMode') as ThemeMode | null;
    return saved === 'light' || saved === 'dark' || saved === 'auto' ? saved : 'auto';
  });
  const [theme, setThemeState] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  });

  // Применяем тему к документу и сохраняем
  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Реагируем на изменения системной темы в режиме auto
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (themeMode === 'auto') setThemeState(e.matches ? 'dark' : 'light');
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [themeMode]);

  // Сохраняем режим и рассчитываем применяемую тему
  useEffect(() => {
    localStorage.setItem('themeMode', themeMode);
    if (themeMode === 'auto') {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      setThemeState(prefersDark ? 'dark' : 'light');
    } else {
      setThemeState(themeMode);
    }
  }, [themeMode]);

  const toggleTheme = () => {
    // Быстрое переключение светлая/тёмная, фиксируя явный режим
    setThemeModeState(prev => {
      const next = theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('themeMode', next);
      return next;
    });
  };

  const setTheme = (newTheme: Theme) => {
    setThemeModeState(newTheme);
  };
  const setThemeMode = (mode: ThemeMode) => setThemeModeState(mode);

  const value = {
    theme,
    themeMode,
    isDark: theme === 'dark',
    toggleTheme,
    setTheme,
    setThemeMode,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}; 