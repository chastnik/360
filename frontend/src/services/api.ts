import axios from 'axios';
import { 
  ApiResponse, 
  LoginResponse, 
  User, 
  Category, 
  Question, 
  AssessmentCycle 
} from '../types/common';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Создаем экземпляр axios с базовой конфигурацией
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Интерсептор для добавления токена авторизации
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Интерсептор для обработки ошибок
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Токен истек или недействителен
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API для авторизации
export const authAPI = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    try {
      const response = await api.post('/auth/login', { email, password });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Ошибка авторизации'
      };
    }
  },

  register: async (userData: {
    email: string;
    first_name: string;
    last_name: string;
    middle_name?: string;
    mattermost_username?: string;
  }): Promise<ApiResponse<{ user: User; message: string }>> => {
    try {
      const response = await api.post('/auth/register', userData);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Ошибка регистрации'
      };
    }
  },

  getCurrentUser: async (token: string): Promise<ApiResponse<User>> => {
    try {
      const response = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Ошибка получения пользователя'
      };
    }
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<ApiResponse<{ message: string }>> => {
    try {
      const response = await api.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword
      });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Ошибка изменения пароля'
      };
    }
  },
};

// API для пользователей
export const usersAPI = {
  getUsers: async (page = 1, limit = 20): Promise<ApiResponse<{ users: User[]; total: number }>> => {
    try {
      const response = await api.get(`/users?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Ошибка получения пользователей'
      };
    }
  },

  getUserById: async (id: string): Promise<ApiResponse<User>> => {
    try {
      const response = await api.get(`/users/${id}`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Ошибка получения пользователя'
      };
    }
  },

  updateUser: async (id: string, userData: Partial<User>): Promise<ApiResponse<User>> => {
    try {
      const response = await api.put(`/users/${id}`, userData);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Ошибка обновления пользователя'
      };
    }
  },

  deleteUser: async (id: string): Promise<ApiResponse<{ message: string }>> => {
    try {
      const response = await api.delete(`/users/${id}`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Ошибка удаления пользователя'
      };
    }
  },
};

// API для категорий
export const categoriesAPI = {
  getCategories: async (): Promise<ApiResponse<Category[]>> => {
    try {
      const response = await api.get('/categories');
      // API теперь возвращает {success: true, data: [...]} формат
      if (response.data?.success) {
        return response.data;
      } else {
        // Поддержка старого формата (массив напрямую)
        return {
          success: true,
          data: response.data
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Ошибка получения категорий'
      };
    }
  },

  createCategory: async (categoryData: Partial<Category>): Promise<ApiResponse<Category>> => {
    try {
      const response = await api.post('/categories', categoryData);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Ошибка создания категории'
      };
    }
  },

  updateCategory: async (id: string, categoryData: Partial<Category>): Promise<ApiResponse<Category>> => {
    try {
      const response = await api.put(`/categories/${id}`, categoryData);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Ошибка обновления категории'
      };
    }
  },

  deleteCategory: async (id: string): Promise<ApiResponse<{ message: string }>> => {
    try {
      const response = await api.delete(`/categories/${id}`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Ошибка удаления категории'
      };
    }
  },

  toggleActive: async (id: string): Promise<ApiResponse<{ message: string }>> => {
    try {
      const response = await api.patch(`/categories/${id}/toggle-active`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Ошибка изменения статуса категории'
      };
    }
  },

  reorder: async (categories: Array<{ id: string; sort_order: number }>): Promise<ApiResponse<{ message: string }>> => {
    try {
      const response = await api.patch('/categories/reorder', { categories });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Ошибка изменения порядка категорий'
      };
    }
  }
};



// API для циклов оценки
export const cyclesAPI = {
  getCycles: async (): Promise<ApiResponse<AssessmentCycle[]>> => {
    try {
      const response = await api.get('/cycles');
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Ошибка получения циклов'
      };
    }
  },

  createCycle: async (cycleData: {
    name: string;
    description?: string;
    start_date: string;
    end_date: string;
    respondent_count?: number;
    allow_self_assessment?: boolean;
    include_manager_assessment?: boolean;
    participant_ids: string[];
  }): Promise<ApiResponse<AssessmentCycle>> => {
    try {
      const response = await api.post('/cycles', cycleData);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Ошибка создания цикла'
      };
    }
  },

  updateCycle: async (id: string, cycleData: Partial<AssessmentCycle>): Promise<ApiResponse<AssessmentCycle>> => {
    try {
      const response = await api.put(`/cycles/${id}`, cycleData);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Ошибка обновления цикла'
      };
    }
  },

  deleteCycle: async (id: string): Promise<ApiResponse<{ message: string }>> => {
    try {
      const response = await api.delete(`/cycles/${id}`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Ошибка удаления цикла'
      };
    }
  },

  activateCycle: async (id: string): Promise<ApiResponse<{ message: string }>> => {
    try {
      const response = await api.post(`/cycles/${id}/activate`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Ошибка активации цикла'
      };
    }
  },
};

// API для отчетов
export const reportsAPI = {
  getReport: async (token: string): Promise<ApiResponse<any>> => {
    try {
      const response = await api.get(`/reports/${token}`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Ошибка получения отчета'
      };
    }
  },

  getUserReports: async (userId?: string): Promise<ApiResponse<any[]>> => {
    try {
      const url = userId ? `/reports?user_id=${userId}` : '/reports';
      const response = await api.get(url);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Ошибка получения отчетов'
      };
    }
  },

  getOrganizationReports: async (): Promise<ApiResponse<any>> => {
    try {
      const response = await api.get('/reports/organization');
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Ошибка получения отчетов организации'
      };
    }
  },
};

// API для вопросов
export const questionsAPI = {
  getQuestions: async (categoryId?: string): Promise<ApiResponse<Question[]>> => {
    try {
      const url = categoryId ? `/questions?category_id=${categoryId}` : '/questions';
      const response = await api.get(url);
      // API теперь возвращает {success: true, data: [...]} формат
      if (response.data?.success) {
        return response.data;
      } else {
        // Поддержка старого формата (массив напрямую)
        return {
          success: true,
          data: response.data
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Ошибка получения вопросов'
      };
    }
  },

  createQuestion: async (questionData: Partial<Question>): Promise<ApiResponse<Question>> => {
    try {
      const response = await api.post('/questions', questionData);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Ошибка создания вопроса'
      };
    }
  },

  updateQuestion: async (id: string, questionData: Partial<Question>): Promise<ApiResponse<Question>> => {
    try {
      const response = await api.put(`/questions/${id}`, questionData);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Ошибка обновления вопроса'
      };
    }
  },

  deleteQuestion: async (id: string): Promise<ApiResponse<{ message: string }>> => {
    try {
      const response = await api.delete(`/questions/${id}`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Ошибка удаления вопроса'
      };
    }
  },

  toggleActive: async (id: string): Promise<ApiResponse<{ message: string }>> => {
    try {
      const response = await api.patch(`/questions/${id}/toggle-active`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Ошибка изменения статуса вопроса'
      };
    }
  },

  reorder: async (questions: Array<{ id: string; order_index: number }>): Promise<ApiResponse<{ message: string }>> => {
    try {
      const response = await api.patch('/questions/reorder', { questions });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Ошибка изменения порядка вопросов'
      };
    }
  }
};

export default api; 