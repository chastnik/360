'use client'

import { useState, useEffect } from 'react'
import {
  Container,
  Typography,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
} from '@mui/material'
import {
  Add,
  Person,
  Business,
  AdminPanelSettings,
  Edit,
  Visibility,
} from '@mui/icons-material'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  displayName?: string
  department?: string
  position?: string
  isAdmin: boolean
  isActive: boolean
  createdAt: string
  manager?: {
    id: string
    firstName: string
    lastName: string
  }
  _count: {
    managedEmployees: number
  }
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [openDialog, setOpenDialog] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    displayName: '',
    department: '',
    position: '',
    managerId: '',
  })
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

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
      setAlert({ type: 'error', message: 'Ошибка загрузки пользователей' })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setAlert({ type: 'success', message: 'Пользователь успешно создан' })
        setOpenDialog(false)
        setFormData({
          email: '',
          firstName: '',
          lastName: '',
          displayName: '',
          department: '',
          position: '',
          managerId: '',
        })
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

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography>Загрузка...</Typography>
      </Container>
    )
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Заголовок */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" component="h1">
          Управление пользователями
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpenDialog(true)}
        >
          Добавить пользователя
        </Button>
      </Box>

      {/* Статистика */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Person color="primary" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h4">{users.length}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Всего пользователей
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <AdminPanelSettings color="primary" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h4">
                    {users.filter(u => u.isAdmin).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Администраторов
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Business color="primary" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h4">
                    {new Set(users.map(u => u.department).filter(Boolean)).size}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Отделов
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Person color="primary" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h4">
                    {users.filter(u => u._count.managedEmployees > 0).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Менеджеров
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Таблица пользователей */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Список пользователей
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Имя</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Отдел</TableCell>
                  <TableCell>Должность</TableCell>
                  <TableCell>Менеджер</TableCell>
                  <TableCell>Подчиненные</TableCell>
                  <TableCell>Статус</TableCell>
                  <TableCell>Действия</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {user.firstName} {user.lastName}
                        </Typography>
                        {user.displayName && user.displayName !== `${user.firstName} ${user.lastName}` && (
                          <Typography variant="caption" color="text.secondary">
                            {user.displayName}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.department || '-'}</TableCell>
                    <TableCell>{user.position || '-'}</TableCell>
                    <TableCell>
                      {user.manager ? (
                        `${user.manager.firstName} ${user.manager.lastName}`
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>{user._count.managedEmployees}</TableCell>
                    <TableCell>
                      <Box display="flex" gap={1}>
                        {user.isAdmin && (
                          <Chip label="Админ" size="small" color="primary" />
                        )}
                        <Chip 
                          label={user.isActive ? 'Активен' : 'Неактивен'} 
                          size="small" 
                          color={user.isActive ? 'success' : 'default'}
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Просмотр">
                        <IconButton size="small">
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Редактировать">
                        <IconButton size="small">
                          <Edit />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Диалог создания пользователя */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Добавить нового пользователя</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Имя"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Фамилия"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Отображаемое имя (необязательно)"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Отдел"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Должность"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  select
                  label="Менеджер"
                  value={formData.managerId}
                  onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
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
          <Button onClick={() => setOpenDialog(false)}>Отмена</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            disabled={!formData.email || !formData.firstName || !formData.lastName}
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