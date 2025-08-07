// Общие типы для всего приложения

export interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  question_count?: number; // Для отображения количества вопросов
}

export interface Question {
  id: string;
  category_id: string;
  text: string; // Маппится из question_text
  description?: string;
  type: 'rating' | 'text' | 'boolean'; // Маппится из question_type
  min_value: number;
  max_value: number;
  order_index: number; // Маппится из sort_order
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: Category; // Для отображения связанной категории
}

export interface Department {
  id: string;
  name: string;
  description?: string;
  code?: string;
  head_id?: string;
  head_name?: string;
  is_active: boolean;
  sort_order: number;
  employee_count?: number;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  role: 'admin' | 'hr' | 'manager' | 'user';
  position?: string;
  department?: string; // Старое поле - для совместимости
  department_id?: string; // Новое поле - FK к departments
  manager_id?: string;
  mattermost_username?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AssessmentCycle {
  id: string;
  name: string;
  description?: string;
  created_by: string;
  start_date: string;
  end_date: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  respondent_count: number;
  allow_self_assessment: boolean;
  include_manager_assessment: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: User;
  error?: string;
}
