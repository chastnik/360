import { DefaultSession, DefaultUser } from 'next-auth';
import { JWT, DefaultJWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      isAdmin: boolean;
      department?: string;
      position?: string;
    } & DefaultSession['user'];
  }

  interface User extends DefaultUser {
    isAdmin: boolean;
    department?: string;
    position?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id: string;
    isAdmin: boolean;
    department?: string;
    position?: string;
  }
} 