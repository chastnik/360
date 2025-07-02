'use client'

import {
  AppBar as MuiAppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
} from '@mui/material'
import {
  Home,
  People,
  Assessment,
  TrendingUp,
  Settings,
  BugReport,
} from '@mui/icons-material'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function AppBar() {
  const pathname = usePathname()

  const isActive = (path: string) => pathname === path

  return (
    <MuiAppBar position="static" sx={{ mb: 0 }}>
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          360° Оценка
        </Typography>
        
        <Box display="flex" gap={1}>
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
          
          <Button
            color="inherit"
            component={Link}
            href="/test"
            startIcon={<BugReport />}
            variant={isActive('/test') ? 'outlined' : 'text'}
          >
            Тест
          </Button>
        </Box>
      </Toolbar>
    </MuiAppBar>
  )
} 