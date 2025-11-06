// Автор: Стас Чашин @chastnik
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Home, ArrowLeft } from 'lucide-react';

export const ForbiddenPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-white dark:bg-gray-900">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 via-orange-500/10 to-pink-500/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(239,68,68,0.3),rgba(255,255,255,0))]" />
      </div>

      {/* Animated floating orbs */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-red-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl animate-pulse animate-delay-1000" />
      <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl animate-pulse animate-delay-500" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 text-center">
        {/* 403 Text with gradient */}
        <div className="mb-8 animate-fade-in">
          <h1 className="text-[12rem] md:text-[16rem] font-black leading-none bg-gradient-to-br from-red-600 via-orange-600 to-pink-600 bg-clip-text text-transparent animate-gradient-shift">
            403
          </h1>
        </div>

        {/* Error message */}
        <div className="mb-4 space-y-4 animate-fade-in-up">
          <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white">
            Доступ запрещен
          </h2>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-md mx-auto">
            У вас нет прав для просмотра этой страницы. Обратитесь к администратору для получения доступа.
          </p>
        </div>

        {/* Decorative line */}
        <div className="w-24 h-1 bg-gradient-to-r from-red-600 via-orange-600 to-pink-600 rounded-full mb-8 animate-fade-in-up animate-delay-200" />

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up animate-delay-300">
          <Button
            size="lg"
            className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 group"
            onClick={() => navigate('/')}
          >
            <Home className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
            На главную
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-2 hover:bg-accent transition-all duration-300 group"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="mr-2 h-5 w-5 group-hover:-translate-x-1 transition-transform" />
            Назад
          </Button>
        </div>

        {/* Additional help text */}
        <p className="mt-12 text-sm text-gray-500 dark:text-gray-400 animate-fade-in-up animate-delay-500">
          Если вы считаете, что это ошибка, пожалуйста, свяжитесь с администратором
        </p>
      </div>
    </div>
  );
};

