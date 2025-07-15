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
import { DashboardPage } from './pages/DashboardPage';
import { ProfilePage } from './pages/ProfilePage';
import { CyclesPage } from './pages/CyclesPage';
import { AssessmentsPage } from './pages/AssessmentsPage';
import { ReportsPage } from './pages/ReportsPage';
import { SurveyPage } from './pages/SurveyPage';
import { ReportViewPage } from './pages/ReportViewPage';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminCategories from './pages/admin/AdminCategories';
import AdminQuestions from './pages/admin/AdminQuestions';
import AdminMattermost from './pages/admin/AdminMattermost';
import AdminSettings from './pages/admin/AdminSettings';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-background text-foreground">
            <Routes>
              {/* Публичные маршруты */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/survey/:token" element={<SurveyPage />} />
              <Route path="/report/:token" element={<ReportViewPage />} />
              
              {/* Приватные маршруты */}
              <Route path="/" element={
                <PrivateRoute>
                  <Layout>
                    <Navigate to="/dashboard" replace />
                  </Layout>
                </PrivateRoute>
              } />
              
              <Route path="/dashboard" element={
                <PrivateRoute>
                  <Layout>
                    <DashboardPage />
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
                <PrivateRoute>
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
                <PrivateRoute>
                  <Layout>
                    <ReportsPage />
                  </Layout>
                </PrivateRoute>
              } />
              
              {/* Административные маршруты */}
              <Route path="/admin" element={
                <PrivateRoute requiredRole="admin">
                  <AdminLayout>
                    <AdminDashboard />
                  </AdminLayout>
                </PrivateRoute>
              } />
              
              <Route path="/admin/users" element={
                <PrivateRoute requiredRole="admin">
                  <AdminLayout>
                    <AdminUsers />
                  </AdminLayout>
                </PrivateRoute>
              } />
              
              <Route path="/admin/categories" element={
                <PrivateRoute requiredRole="admin">
                  <AdminLayout>
                    <AdminCategories />
                  </AdminLayout>
                </PrivateRoute>
              } />
              
              <Route path="/admin/questions" element={
                <PrivateRoute requiredRole="admin">
                  <AdminLayout>
                    <AdminQuestions />
                  </AdminLayout>
                </PrivateRoute>
              } />
              
              <Route path="/admin/cycles" element={
                <PrivateRoute requiredRole="admin">
                  <AdminLayout>
                    <CyclesPage />
                  </AdminLayout>
                </PrivateRoute>
              } />
              
              <Route path="/admin/reports" element={
                <PrivateRoute requiredRole="admin">
                  <AdminLayout>
                    <ReportsPage />
                  </AdminLayout>
                </PrivateRoute>
              } />
              
              <Route path="/admin/mattermost" element={
                <PrivateRoute requiredRole="admin">
                  <AdminLayout>
                    <AdminMattermost />
                  </AdminLayout>
                </PrivateRoute>
              } />
              
              <Route path="/admin/settings" element={
                <PrivateRoute requiredRole="admin">
                  <AdminLayout>
                    <AdminSettings />
                  </AdminLayout>
                </PrivateRoute>
              } />
              
              {/* 404 страница */}
              <Route path="*" element={
                <div className="min-h-screen flex items-center justify-center">
                  <div className="text-center">
                    <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
                    <p className="text-xl text-muted-foreground mb-8">Страница не найдена</p>
                    <button 
                      onClick={() => window.history.back()}
                      className="btn btn-primary"
                    >
                      Вернуться назад
                    </button>
                  </div>
                </div>
              } />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App; 