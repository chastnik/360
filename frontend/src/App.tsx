
// Автор: Стас Чашин @chastnik
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { PrivateRoute } from './components/PrivateRoute';
import { Layout } from './components/Layout';
import AdminLayout from './components/AdminLayout';

// Pages
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { DashboardPage } from './pages/DashboardPage';
import { MyDashboardPage } from './pages/MyDashboardPage';
import MyGrowthPlansPage from './pages/MyGrowthPlansPage';
import { ProfilePage } from './pages/ProfilePage';
import { CyclesPage } from './pages/CyclesPage';
import { AssessmentsPage } from './pages/AssessmentsPage';
import { ReportsPage } from './pages/ReportsPage';
import { SurveyPage } from './pages/SurveyPage';
import { ReportViewPage } from './pages/ReportViewPage';
import { SelectRespondentsPage } from './pages/SelectRespondentsPage';
import EmployeeAnalyticsPage from './pages/EmployeeAnalyticsPage';
import StructurePage from './pages/StructurePage';
import EmployeesPage from './pages/EmployeesPage';
import LearningPage from './pages/LearningPage';
import CoursesPage from './pages/learning/CoursesPage';
import SchedulePage from './pages/learning/SchedulePage';
import GrowthPlansPage from './pages/learning/GrowthPlansPage';
import TestingPage from './pages/learning/TestingPage';
import CompetenceMatrixPage from './pages/learning/CompetenceMatrixPage';
import ManualCompetencePage from './pages/learning/ManualCompetencePage';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminDepartments from './pages/admin/AdminDepartments';
import AdminCategories from './pages/admin/AdminCategories';
import AdminQuestions from './pages/admin/AdminQuestions';
import AdminMattermost from './pages/admin/AdminMattermost';
import AdminSettings from './pages/admin/AdminSettings';
import AdminRoles from './pages/admin/AdminRoles';
import AdminCompetencies from './pages/admin/AdminCompetencies';
import AdminCalendar from './pages/admin/AdminCalendar';
import AdminLogs from './pages/admin/AdminLogs';

function App() {
  return (
    <ThemeProvider>
      <Router future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <AuthProvider>
          <div className="min-h-screen bg-background text-foreground">
            <Routes>
              {/* Публичные маршруты */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              
              {/* Приватные маршруты */}
              <Route path="/survey/:respondentId" element={
                <PrivateRoute>
                  <Layout>
                    <SurveyPage />
                  </Layout>
                </PrivateRoute>
              } />
              
              {/* Публичные маршруты (для внешних ссылок) */}
              <Route path="/survey/:token" element={<SurveyPage />} />
              <Route path="/report/:token" element={<ReportViewPage />} />
              <Route path="/assessments/select-respondents/:participantId" element={
                <PrivateRoute>
                  <Layout>
                    <SelectRespondentsPage />
                  </Layout>
                </PrivateRoute>
              } />
              <Route path="/" element={
                <PrivateRoute>
                  <Layout>
                    <Navigate to="/my-dashboard" replace />
                  </Layout>
                </PrivateRoute>
              } />
              
              <Route path="/dashboard" element={
                <PrivateRoute requiredPermission="ui:view:dashboard">
                  <Layout>
                    <DashboardPage />
                  </Layout>
                </PrivateRoute>
              } />
              
              <Route path="/my-dashboard" element={
                <PrivateRoute>
                  <Layout>
                    <MyDashboardPage />
                  </Layout>
                </PrivateRoute>
              } />
              
              <Route path="/my-growth-plans" element={
                <PrivateRoute>
                  <Layout>
                    <MyGrowthPlansPage />
                  </Layout>
                </PrivateRoute>
              } />
              
              <Route path="/profile" element={
                <PrivateRoute>
                  <Layout>
                    <ProfilePage />
                  </Layout>
                </PrivateRoute>
              } />
              
              <Route path="/cycles" element={
                <PrivateRoute requiredPermission="ui:view:cycles">
                  <Layout>
                    <CyclesPage />
                  </Layout>
                </PrivateRoute>
              } />
              
              <Route path="/assessments" element={
                <PrivateRoute>
                  <Layout>
                    <AssessmentsPage />
                  </Layout>
                </PrivateRoute>
              } />
              
              <Route path="/reports" element={
                <PrivateRoute requiredPermission="ui:view:reports">
                  <Layout>
                    <ReportsPage />
                  </Layout>
                </PrivateRoute>
              } />

              <Route path="/structure" element={
                <PrivateRoute requiredPermission="ui:view:dashboard">
                  <Layout>
                    <StructurePage />
                  </Layout>
                </PrivateRoute>
              } />

              <Route path="/employees/*" element={
                <PrivateRoute>
                  <Layout>
                    <EmployeesPage />
                  </Layout>
                </PrivateRoute>
              } />

              <Route path="/employee/:userId" element={
                <PrivateRoute requiredPermission="ui:view:reports">
                  <Layout>
                    <EmployeeAnalyticsPage />
                  </Layout>
                </PrivateRoute>
              } />

              <Route path="/learning" element={
                <PrivateRoute requiredPermission="ui:view:learning">
                  <Layout>
                    <LearningPage />
                  </Layout>
                </PrivateRoute>
              } />

              <Route path="/learning/courses" element={
                <PrivateRoute requiredPermission="ui:view:learning">
                  <Layout>
                    <CoursesPage />
                  </Layout>
                </PrivateRoute>
              } />

              <Route path="/learning/schedule" element={
                <PrivateRoute requiredPermission="ui:view:learning">
                  <Layout>
                    <SchedulePage />
                  </Layout>
                </PrivateRoute>
              } />

              <Route path="/learning/growth-plans" element={
                <PrivateRoute requiredPermission="ui:view:learning">
                  <Layout>
                    <GrowthPlansPage />
                  </Layout>
                </PrivateRoute>
              } />

              <Route path="/learning/testing" element={
                <PrivateRoute requiredPermission="ui:view:learning">
                  <Layout>
                    <TestingPage />
                  </Layout>
                </PrivateRoute>
              } />

              <Route path="/learning/competence-matrix" element={
                <PrivateRoute requiredPermission="ui:view:learning">
                  <Layout>
                    <CompetenceMatrixPage />
                  </Layout>
                </PrivateRoute>
              } />

              <Route path="/learning/manual-competence" element={
                <PrivateRoute requiredPermission="ui:view:learning">
                  <Layout>
                    <ManualCompetencePage />
                  </Layout>
                </PrivateRoute>
              } />
              
              {/* Административные маршруты */}
              <Route path="/admin" element={
                <PrivateRoute requiredRole="admin">
                  <Layout>
                    <AdminLayout>
                      <AdminDashboard />
                    </AdminLayout>
                  </Layout>
                </PrivateRoute>
              } />
              
              <Route path="/admin/users" element={
                <PrivateRoute requiredRole="admin" requiredPermission="ui:view:admin.users">
                  <Layout>
                    <AdminLayout>
                      <AdminUsers />
                    </AdminLayout>
                  </Layout>
                </PrivateRoute>
              } />
              
              <Route path="/admin/departments" element={
                <PrivateRoute requiredRole="admin" requiredPermission="ui:view:admin.departments">
                  <Layout>
                    <AdminLayout>
                      <AdminDepartments />
                    </AdminLayout>
                  </Layout>
                </PrivateRoute>
              } />
              
              <Route path="/admin/categories" element={
                <PrivateRoute requiredRole="admin" requiredPermission="ui:view:admin.categories">
                  <Layout>
                    <AdminLayout>
                      <AdminCategories />
                    </AdminLayout>
                  </Layout>
                </PrivateRoute>
              } />
              
              <Route path="/admin/questions" element={
                <PrivateRoute requiredRole="admin" requiredPermission="ui:view:admin.questions">
                  <Layout>
                    <AdminLayout>
                      <AdminQuestions />
                    </AdminLayout>
                  </Layout>
                </PrivateRoute>
              } />
              
              <Route path="/admin/cycles" element={
                <PrivateRoute requiredRole="admin" requiredPermission="ui:view:admin">
                  <Layout>
                    <AdminLayout>
                      <CyclesPage />
                    </AdminLayout>
                  </Layout>
                </PrivateRoute>
              } />
              
              <Route path="/admin/reports" element={
                <PrivateRoute requiredRole="admin" requiredPermission="ui:view:admin">
                  <Layout>
                    <AdminLayout>
                      <ReportsPage />
                    </AdminLayout>
                  </Layout>
                </PrivateRoute>
              } />
              
              <Route path="/admin/mattermost" element={
                <PrivateRoute requiredRole="admin" requiredPermission="ui:view:admin.mattermost">
                  <Layout>
                    <AdminLayout>
                      <AdminMattermost />
                    </AdminLayout>
                  </Layout>
                </PrivateRoute>
              } />
              
              <Route path="/admin/settings" element={
                <PrivateRoute requiredRole="admin" requiredPermission="ui:view:admin.settings">
                  <Layout>
                    <AdminLayout>
                      <AdminSettings />
                    </AdminLayout>
                  </Layout>
                </PrivateRoute>
              } />

              <Route path="/admin/roles" element={
                <PrivateRoute requiredRole="admin" requiredPermission="ui:view:admin.roles">
                  <Layout>
                    <AdminLayout>
                      <AdminRoles />
                    </AdminLayout>
                  </Layout>
                </PrivateRoute>
              } />

              <Route path="/admin/competencies" element={
                <PrivateRoute requiredRole="admin" requiredPermission="ui:view:admin.competencies">
                  <Layout>
                    <AdminLayout>
                      <AdminCompetencies />
                    </AdminLayout>
                  </Layout>
                </PrivateRoute>
              } />

              <Route path="/admin/calendar" element={
                <PrivateRoute requiredRole="admin">
                  <Layout>
                    <AdminLayout>
                      <AdminCalendar />
                    </AdminLayout>
                  </Layout>
                </PrivateRoute>
              } />

              <Route path="/admin/logs" element={
                <PrivateRoute requiredRole="admin" requiredPermission="ui:view:admin.logs">
                  <Layout>
                    <AdminLayout>
                      <AdminLogs />
                    </AdminLayout>
                  </Layout>
                </PrivateRoute>
              } />
              
              {/* 404 страница */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </div>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App; 