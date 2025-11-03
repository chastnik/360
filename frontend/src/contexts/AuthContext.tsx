
// Автор: Стас Чашин @chastnik
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { User } from '../types/common';

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  token: string | null;
  permissions: string[];
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (userData: RegisterData) => Promise<void>;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface RegisterData {
  email: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  mattermost_username?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const isAuthenticated = !!user && !!token;

  const loadUser = useCallback(async (authToken: string) => {
    try {
      const response = await authAPI.getCurrentUser(authToken);
      if (response.success && response.data && response.data.id) {
        setUser(response.data);
        // Извлекаем permissions из корневого уровня ответа
        if ((response as any).permissions) {
          setPermissions((response as any).permissions);
        } else {
          setPermissions([]);
        }
      } else {
        throw new Error(response.error || 'Не удалось загрузить пользователя');
      }
    } catch (error) {
      console.error('Ошибка загрузки пользователя:', error);
      localStorage.removeItem('auth_token');
      setToken(null);
      setUser(null);
      setPermissions([]);
      // При ошибке загрузки пользователя перенаправляем на логин
      navigate('/login', { replace: true });
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token');
    if (savedToken) {
      setToken(savedToken);
      loadUser(savedToken);
    } else {
      setIsLoading(false);
    }
  }, [loadUser]);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await authAPI.login(email, password);
      
      if (response.success && response.token) {
        const authToken = response.token;
        
        // Сначала сохраняем токен
        setToken(authToken);
        localStorage.setItem('auth_token', authToken);
        
        // Используем данные пользователя из ответа логина, если они есть
        if (response.user) {
          setUser(response.user);
          // Извлекаем permissions из ответа логина
          if ((response as any).permissions) {
            setPermissions((response as any).permissions);
          } else if ((response.user as any).permissions) {
            setPermissions((response.user as any).permissions);
          } else {
            setPermissions([]);
          }
          
          // Пытаемся загрузить полные данные пользователя в фоне (не критично)
          authAPI.getCurrentUser(authToken).then((userResponse) => {
            if (userResponse.success && userResponse.data) {
              setUser(userResponse.data);
              if ((userResponse as any).permissions) {
                setPermissions((userResponse as any).permissions);
              }
            }
          }).catch((err) => {
            // Не критично, если не удалось - используем данные из логина
            console.warn('Не удалось загрузить полные данные пользователя:', err);
          });
        } else {
          // Если данных пользователя нет в ответе, пытаемся загрузить их
          try {
            const userResponse = await authAPI.getCurrentUser(authToken);
            if (userResponse.success && userResponse.data) {
              setUser(userResponse.data);
              if ((userResponse as any).permissions) {
                setPermissions((userResponse as any).permissions);
              } else {
                setPermissions([]);
              }
            } else {
              throw new Error(userResponse.error || 'Не удалось загрузить данные пользователя');
            }
          } catch (userError) {
            console.error('Ошибка загрузки пользователя после логина:', userError);
            // Очищаем токен, если не удалось загрузить пользователя
            setToken(null);
            localStorage.removeItem('auth_token');
            throw new Error('Не удалось загрузить данные пользователя');
          }
        }
        
        console.log('Добро пожаловать!');
        navigate('/dashboard');
      } else {
        throw new Error(response.error || 'Ошибка авторизации');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage = error?.response?.data?.error || error?.message || 'Ошибка авторизации';
      console.error(errorMessage);
      // Очищаем токен при ошибке
      setToken(null);
      localStorage.removeItem('auth_token');
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      setIsLoading(true);
      const response = await authAPI.register(userData);
      
      if (response.success) {
        console.log('Регистрация успешна! Пароль отправлен в Mattermost.');
        navigate('/login');
      } else {
        throw new Error(response.error || 'Ошибка регистрации');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      console.error(error.message || 'Ошибка регистрации');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setPermissions([]);
    localStorage.removeItem('auth_token');
    console.log('Вы вышли из системы');
    navigate('/login');
  };

  const value = {
    user,
    setUser,
    token,
    permissions,
    login,
    logout,
    register,
    isLoading,
    isAuthenticated,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 