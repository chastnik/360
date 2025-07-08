'use client';

import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { CircularProgress, Box } from '@mui/material';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
}

export function AuthGuard({ children, requireAuth = true, requireAdmin = false }: AuthGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === 'loading') return; // Ждем загрузки сессии

    // Пропускаем страницы аутентификации
    if (pathname?.startsWith('/auth')) {
      return;
    }

    // Если требуется авторизация, но пользователь не авторизован
    if (requireAuth && !session) {
      router.push('/auth/signin');
      return;
    }

    // Если требуются права администратора
    if (requireAdmin && session && !session.user.isAdmin) {
      router.push('/'); // Перенаправляем на главную страницу
      return;
    }

    // Если пользователь авторизован и находится на страницах auth, перенаправляем на главную
    if (session && pathname?.startsWith('/auth')) {
      router.push('/');
      return;
    }
  }, [session, status, pathname, router, requireAuth, requireAdmin]);

  // Показываем загрузку пока проверяем сессию
  if (status === 'loading') {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  // Если требуется авторизация, но пользователь не авторизован
  if (requireAuth && !session && !pathname?.startsWith('/auth')) {
    return null; // Не показываем контент, редирект уже запущен
  }

  // Если требуются права администратора, но пользователь не админ
  if (requireAdmin && session && !session.user.isAdmin) {
    return null; // Не показываем контент, редирект уже запущен
  }

  return <>{children}</>;
} 