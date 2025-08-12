// Автор: Стас Чашин @chastnik
export interface User {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  position?: string;
  department?: string;
  manager_id?: string;
  mattermost_username?: string;
  mattermost_user_id?: string;
  role: 'admin' | 'hr' | 'manager' | 'user';
  is_manager: boolean;
  is_active: boolean;
  last_login?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  sort_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Question {
  id: string;
  category_id: string;
  question_text: string;
  description?: string;
  question_type: 'rating' | 'text' | 'boolean';
  min_value: number;
  max_value: number;
  sort_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface AssessmentCycle {
  id: string;
  name: string;
  description?: string;
  created_by: string;
  start_date: Date;
  end_date: Date;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  respondent_count: number;
  allow_self_assessment: boolean;
  include_manager_assessment: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface AssessmentParticipant {
  id: string;
  cycle_id: string;
  user_id: string;
  status: 'invited' | 'respondents_selected' | 'in_progress' | 'completed';
  invitation_sent_at?: Date;
  respondents_selected_at?: Date;
  completed_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface AssessmentRespondent {
  id: string;
  participant_id: string;
  respondent_user_id: string;
  respondent_type: 'peer' | 'subordinate' | 'manager' | 'self';
  status: 'invited' | 'in_progress' | 'completed' | 'declined';
  invitation_sent_at?: Date;
  started_at?: Date;
  completed_at?: Date;
  completion_token?: string;
  created_at: Date;
  updated_at: Date;
}

export interface AssessmentResponse {
  id: string;
  respondent_id: string;
  question_id: string;
  rating_value?: number;
  text_response?: string;
  boolean_response?: boolean;
  comment?: string;
  created_at: Date;
  updated_at: Date;
}

export interface AssessmentReport {
  id: string;
  participant_id: string;
  report_data?: any;
  charts_data?: any;
  summary?: string;
  recommendations?: string;
  status: 'generating' | 'completed' | 'error';
  generated_at?: Date;
  access_token?: string;
  created_at: Date;
  updated_at: Date;
}

export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateUserRequest {
  email: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  position?: string;
  department?: string;
  manager_id?: string;
  mattermost_username?: string;
  role?: 'admin' | 'manager' | 'user';
}

export interface UpdateUserRequest {
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  position?: string;
  department?: string;
  manager_id?: string;
  mattermost_username?: string;
  role?: 'admin' | 'manager' | 'user';
  is_active?: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  mattermost_username?: string;
  role: 'user' | 'admin' | 'hr';
}

export interface CreateCycleRequest {
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  respondent_count?: number;
  allow_self_assessment?: boolean;
  include_manager_assessment?: boolean;
  participant_ids: string[];
}

export interface MattermostUser {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
}

export interface ReportAnalytics {
  categoryScores: {
    [categoryId: string]: {
      name: string;
      averageScore: number;
      totalResponses: number;
      scores: {
        [respondentType: string]: number;
      };
    };
  };
  overallScore: number;
  strengths: string[];
  areasForImprovement: string[];
  recommendations: string[];
} 