'use client'

import {
  AppBar as MuiAppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Divider,
} from '@mui/material'
import {
  Home,
  People,
  Assessment,
  TrendingUp,
  Settings,
  BugReport,
  AccountCircle,
  ExitToApp,
} from '@mui/icons-material'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { useState } from 'react'

export function AppBar() {
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  const isActive = (path: string) => pathname === path

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleSignOut = async () => {
    handleMenuClose()
    await signOut({ callbackUrl: '/auth/signin' })
  }

  // Не показываем навигацию на страницах аутентификации
  if (pathname?.startsWith('/auth')) {
    return null
  }

  return (
    <MuiAppBar position="static" sx={{ mb: 0 }}>
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          360° Оценка
        </Typography>
        
        {session && (
          <Box display="flex" gap={1} alignItems="center">
            <Button
              color="inherit"
              component={Link}
              href="/"
              startIcon={<Home />}
              variant={isActive('/') ? 'outlined' : 'text'}
            >
              Главная
            </Button>
            <Button
              color="inherit"
              component={Link}
              href="/users"
              startIcon={<People />}
              variant={isActive('/users') ? 'outlined' : 'text'}
            >
              Пользователи
            </Button>
            
            <Button
              color="inherit"
              component={Link}
              href="/cycles"
              startIcon={<Assessment />}
              variant={isActive('/cycles') ? 'outlined' : 'text'}
            >
              Циклы
            </Button>
            
            <Button
              color="inherit"
              component={Link}
              href="/reports"
              startIcon={<TrendingUp />}
              variant={isActive('/reports') ? 'outlined' : 'text'}
            >
              Отчеты
            </Button>
            
            {session.user.isAdmin && (
              <Button
                color="inherit"
                component={Link}
                href="/admin"
                startIcon={<Settings />}
                variant={isActive('/admin') || pathname?.startsWith('/admin') ? 'outlined' : 'text'}
              >
                Администрирование
              </Button>
            )}
            
            <Button
              color="inherit"
              component={Link}
              href="/test"
              startIcon={<BugReport />}
              variant={isActive('/test') ? 'outlined' : 'text'}
            >
              Тест
            </Button>

            <IconButton
              color="inherit"
              onClick={handleMenuOpen}
              sx={{ ml: 2 }}
            >
              <Avatar sx={{ width: 32, height: 32 }}>
                {session.user.image ? (
                  <img src={session.user.image} alt={session.user.name || ''} />
                ) : (
                  <AccountCircle />
                )}
              </Avatar>
            </IconButton>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
            >
              <MenuItem disabled>
                <Typography variant="body2">
                  {session.user.name}
                </Typography>
              </MenuItem>
              <MenuItem disabled>
                <Typography variant="caption" color="text.secondary">
                  {session.user.email}
                </Typography>
              </MenuItem>
              <Divider />
              <MenuItem component={Link} href="/profile" onClick={handleMenuClose}>
                <AccountCircle sx={{ mr: 1 }} />
                Профиль
              </MenuItem>
              <MenuItem onClick={handleSignOut}>
                <ExitToApp sx={{ mr: 1 }} />
                Выйти
              </MenuItem>
            </Menu>
          </Box>
        )}

        {!session && status !== 'loading' && (
          <Box display="flex" gap={1}>
            <Button
              color="inherit"
              component={Link}
              href="/auth/signin"
              variant="outlined"
            >
              Войти
            </Button>
            <Button
              color="inherit"
              component={Link}
              href="/auth/signup"
              variant="outlined"
            >
              Регистрация
            </Button>
          </Box>
        )}
      </Toolbar>
    </MuiAppBar>
  )
} 