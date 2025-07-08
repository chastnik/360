'use client'

import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter'
import { SessionProvider } from 'next-auth/react'
import theme from '@/lib/theme'
import { AppProvider } from './AppProvider'
import { AppBar } from '@/components/navigation/AppBar'
import { AuthGuard } from '@/components/auth/AuthGuard'

interface ClientLayoutProps {
  children: React.ReactNode
}

export function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <AppRouterCacheProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <SessionProvider>
          <AppProvider>
            <AppBar />
            <AuthGuard>
              {children}
            </AuthGuard>
          </AppProvider>
        </SessionProvider>
      </ThemeProvider>
    </AppRouterCacheProvider>
  )
} 