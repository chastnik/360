import type { NextAuthConfig } from 'next-auth';

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: '/auth/signin',
    signUp: '/auth/signup',
    error: '/auth/error',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith('/');
      const isOnAuthPages = nextUrl.pathname.startsWith('/auth');
      
      if (isOnDashboard && !isOnAuthPages) {
        if (isLoggedIn) return true;
        return false; // Перенаправить неавторизованных пользователей на страницу входа
      } else if (isLoggedIn && isOnAuthPages) {
        return Response.redirect(new URL('/', nextUrl));
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.isAdmin = user.isAdmin;
        token.department = user.department;
        token.position = user.position;
      }
      return token;
    },
    session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.isAdmin = token.isAdmin as boolean;
        session.user.department = token.department as string;
        session.user.position = token.position as string;
      }
      return session;
    },
  },
  providers: [], // Добавим провайдеры в следующем файле
}; 