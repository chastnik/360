'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  Snackbar,
  Autocomplete,
} from '@mui/material'
import {
  Assessment,
  People,
  Schedule,
  Notifications,
  CheckCircle,
  AccountCircle,
  TrendingUp,
  Settings,
} from '@mui/icons-material'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  displayName?: string
  department?: string
  position?: string
  isAdmin?: boolean
  isActive?: boolean
}

export default function HomePage() {
  const [users, setUsers] = useState<User[]>([])
  const [openCycleDialog, setOpenCycleDialog] = useState(false)
  const [openUserDialog, setOpenUserDialog] = useState(false)
  const [selectedParticipants, setSelectedParticipants] = useState<User[]>([])
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  
  const [cycleFormData, setCycleFormData] = useState({
    name: '',
    description: '',
    subjectId: '',
    startDate: '',
    endDate: '',
    reminderDate: '',
  })

  const [userFormData, setUserFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    displayName: '',
    department: '',
    position: '',
    managerId: '',
  })

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users')
      const data = await response.json()
      setUsers(data.users || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const handleCreateCycle = async () => {
    try {
      const participantIds = selectedParticipants.map(p => p.id)
      
      const response = await fetch('/api/cycles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...cycleFormData,
          participantIds,
        }),
      })

      if (response.ok) {
        setAlert({ type: 'success', message: 'Цикл оценки успешно создан' })
        setOpenCycleDialog(false)
        resetCycleForm()
      } else {
        const error = await response.json()
        setAlert({ type: 'error', message: error.error || 'Ошибка создания цикла' })
      }
    } catch (error) {
      console.error('Error creating cycle:', error)
      setAlert({ type: 'error', message: 'Ошибка создания цикла' })
    }
  }

  const handleCreateUser = async () => {
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userFormData),
      })

      if (response.ok) {
        setAlert({ type: 'success', message: 'Пользователь успешно создан' })
        setOpenUserDialog(false)
        resetUserForm()
        fetchUsers()
      } else {
        const error = await response.json()
        setAlert({ type: 'error', message: error.error || 'Ошибка создания пользователя' })
      }
    } catch (error) {
      console.error('Error creating user:', error)
      setAlert({ type: 'error', message: 'Ошибка создания пользователя' })
    }
  }

  const resetCycleForm = () => {
    setCycleFormData({
      name: '',
      description: '',
      subjectId: '',
      startDate: '',
      endDate: '',
      reminderDate: '',
    })
    setSelectedParticipants([])
  }

  const resetUserForm = () => {
    setUserFormData({
      email: '',
      firstName: '',
      lastName: '',
      displayName: '',
      department: '',
      position: '',
      managerId: '',
    })
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Заголовок */}
      <Box textAlign="center" mb={4}>
        <Typography variant="h2" component="h1" gutterBottom>
          БИТ.Цифра: 360° оценка
        </Typography>
        <Typography variant="h5" color="text.secondary" gutterBottom>
          Комплексная оценка персонала
        </Typography>
        <Chip 
          label="Демо версия" 
          color="primary" 
          variant="outlined" 
          size="small" 
          sx={{ mt: 1 }}
        />
      </Box>

      {/* Основные функции */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={6} lg={3}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flexGrow: 1 }}>
              <Box display="flex" alignItems="center" mb={2}>
                <Assessment color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Циклы оценки</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Создание и управление циклами 360-градусной оценки персонала
              </Typography>
            </CardContent>
            <CardActions>
              <Button size="small" href="/cycles">Управление</Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flexGrow: 1 }}>
              <Box display="flex" alignItems="center" mb={2}>
                <People color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Сотрудники</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Управление пользователями и их ролями в системе
              </Typography>
            </CardContent>
            <CardActions>
              <Button size="small" href="/users">Просмотр</Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flexGrow: 1 }}>
              <Box display="flex" alignItems="center" mb={2}>
                <TrendingUp color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Аналитика</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Отчеты и визуализация результатов оценки
              </Typography>
            </CardContent>
            <CardActions>
              <Button size="small" href="/reports">Отчеты</Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flexGrow: 1 }}>
              <Box display="flex" alignItems="center" mb={2}>
                <Settings color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Настройки</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Конфигурация вопросов и интеграций
              </Typography>
            </CardContent>
            <CardActions>
              <Button size="small" href="/settings">Настроить</Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>

      {/* Статистика */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Обзор системы
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="primary">7</Typography>
                    <Typography variant="body2">Категорий</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="primary">49</Typography>
                    <Typography variant="body2">Вопросов</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="primary">0</Typography>
                    <Typography variant="body2">Активных циклов</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="primary">1</Typography>
                    <Typography variant="body2">Пользователей</Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Быстрые действия
              </Typography>
              <List dense>
                <ListItem 
                  onClick={() => setOpenCycleDialog(true)}
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': { 
                      backgroundColor: 'action.hover' 
                    },
                    borderRadius: 1
                  }}
                >
                  <ListItemIcon>
                    <Assessment fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Создать цикл оценки" />
                </ListItem>
                <ListItem 
                  onClick={() => setOpenUserDialog(true)}
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': { 
                      backgroundColor: 'action.hover' 
                    },
                    borderRadius: 1
                  }}
                >
                  <ListItemIcon>
                    <People fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Добавить сотрудника" />
                </ListItem>
                <ListItem 
                  component="a" 
                  href="/settings" 
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': { 
                      backgroundColor: 'action.hover' 
                    },
                    borderRadius: 1,
                    textDecoration: 'none',
                    color: 'inherit'
                  }}
                >
                  <ListItemIcon>
                    <Schedule fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Настроить расписание" />
                </ListItem>
                <ListItem 
                  component="a" 
                  href="/reports" 
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': { 
                      backgroundColor: 'action.hover' 
                    },
                    borderRadius: 1,
                    textDecoration: 'none',
                    color: 'inherit'
                  }}
                >
                  <ListItemIcon>
                    <Notifications fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Проверить уведомления" />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Возможности системы */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Возможности системы 360-градусной оценки
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle fontSize="small" color="success" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Интеграция с Mattermost"
                    secondary="Автоматические уведомления и напоминания"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle fontSize="small" color="success" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Выбор оценивающих"
                    secondary="Минимум 5 человек на каждого сотрудника"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle fontSize="small" color="success" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Календарное планирование"
                    secondary="Автоматическое создание периодических оценок"
                  />
                </ListItem>
              </List>
            </Grid>
            <Grid item xs={12} md={6}>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle fontSize="small" color="success" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Визуализация результатов"
                    secondary="Графики и отчеты по результатам оценки"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle fontSize="small" color="success" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="7 категорий компетенций"
                    secondary="Лидерство, коммуникация, командная работа и др."
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle fontSize="small" color="success" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Веб-интерфейс"
                    secondary="Удобное управление через браузер"
                  />
                </ListItem>
              </List>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Диалог создания цикла */}
      <Dialog open={openCycleDialog} onClose={() => setOpenCycleDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Создать новый цикл оценки</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Название цикла"
                  value={cycleFormData.name}
                  onChange={(e) => setCycleFormData({ ...cycleFormData, name: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Описание (необязательно)"
                  multiline
                  rows={3}
                  value={cycleFormData.description}
                  onChange={(e) => setCycleFormData({ ...cycleFormData, description: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  select
                  label="Оцениваемый сотрудник"
                  value={cycleFormData.subjectId}
                  onChange={(e) => setCycleFormData({ ...cycleFormData, subjectId: e.target.value })}
                  required
                >
                  {users.map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.firstName} {user.lastName} - {user.position} ({user.email})
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Дата начала"
                  type="datetime-local"
                  value={cycleFormData.startDate}
                  onChange={(e) => setCycleFormData({ ...cycleFormData, startDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Дата окончания"
                  type="datetime-local"
                  value={cycleFormData.endDate}
                  onChange={(e) => setCycleFormData({ ...cycleFormData, endDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Дата напоминания (необязательно)"
                  type="datetime-local"
                  value={cycleFormData.reminderDate}
                  onChange={(e) => setCycleFormData({ ...cycleFormData, reminderDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <Autocomplete
                  multiple
                  options={users.filter(u => u.id !== cycleFormData.subjectId)}
                  getOptionLabel={(user) => `${user.firstName} ${user.lastName} (${user.position})`}
                  value={selectedParticipants}
                  onChange={(event, newValue) => setSelectedParticipants(newValue)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Участники оценки"
                      placeholder="Выберите участников"
                    />
                  )}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCycleDialog(false)}>Отмена</Button>
          <Button 
            onClick={handleCreateCycle} 
            variant="contained"
            disabled={!cycleFormData.name || !cycleFormData.subjectId || !cycleFormData.startDate || !cycleFormData.endDate}
          >
            Создать
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог создания пользователя */}
      <Dialog open={openUserDialog} onClose={() => setOpenUserDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Добавить нового пользователя</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Имя"
                  value={userFormData.firstName}
                  onChange={(e) => setUserFormData({ ...userFormData, firstName: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Фамилия"
                  value={userFormData.lastName}
                  onChange={(e) => setUserFormData({ ...userFormData, lastName: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={userFormData.email}
                  onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Отображаемое имя (необязательно)"
                  value={userFormData.displayName}
                  onChange={(e) => setUserFormData({ ...userFormData, displayName: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Отдел"
                  value={userFormData.department}
                  onChange={(e) => setUserFormData({ ...userFormData, department: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Должность"
                  value={userFormData.position}
                  onChange={(e) => setUserFormData({ ...userFormData, position: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  select
                  label="Менеджер"
                  value={userFormData.managerId}
                  onChange={(e) => setUserFormData({ ...userFormData, managerId: e.target.value })}
                >
                  <MenuItem value="">Нет менеджера</MenuItem>
                  {users.map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.firstName} {user.lastName} ({user.email})
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenUserDialog(false)}>Отмена</Button>
          <Button 
            onClick={handleCreateUser} 
            variant="contained"
            disabled={!userFormData.email || !userFormData.firstName || !userFormData.lastName}
          >
            Создать
          </Button>
        </DialogActions>
      </Dialog>

      {/* Уведомления */}
      <Snackbar
        open={!!alert}
        autoHideDuration={6000}
        onClose={() => setAlert(null)}
      >
        <Alert 
          onClose={() => setAlert(null)} 
          severity={alert?.type}
          sx={{ width: '100%' }}
        >
          {alert?.message}
        </Alert>
      </Snackbar>
    </Container>
  )
} 