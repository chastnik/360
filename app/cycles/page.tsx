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
  FormControlLabel,
  Checkbox,
  Autocomplete,
} from '@mui/material'
import {
  Add,
  Assessment,
  Person,
  Schedule,
  CheckCircle,
  Cancel,
  Edit,
  Visibility,
  Delete,
  PlayArrow,
  Stop,
  Assignment,
} from '@mui/icons-material'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  department?: string
  position?: string
}

interface CycleParticipant {
  id: string
  role: string
  isCompleted: boolean
  user: User
}

interface FeedbackCycle {
  id: string
  name: string
  description?: string
  startDate: string
  endDate: string
  reminderDate?: string
  isActive: boolean
  status: string
  createdAt: string
  subject: User
  participants: CycleParticipant[]
  _count: {
    responses: number
    notifications: number
  }
}

export default function CyclesPage() {
  const [cycles, setCycles] = useState<FeedbackCycle[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [openDialog, setOpenDialog] = useState(false)
  const [openEditDialog, setOpenEditDialog] = useState(false)
  const [openViewDialog, setOpenViewDialog] = useState(false)
  const [editingCycle, setEditingCycle] = useState<FeedbackCycle | null>(null)
  const [viewingCycle, setViewingCycle] = useState<FeedbackCycle | null>(null)
  const [selectedParticipants, setSelectedParticipants] = useState<User[]>([])
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    subjectId: '',
    startDate: '',
    endDate: '',
    reminderDate: '',
  })
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    fetchCycles()
    fetchUsers()
  }, [])

  const fetchCycles = async () => {
    try {
      const response = await fetch('/api/cycles')
      const data = await response.json()
      setCycles(data.cycles || [])
    } catch (error) {
      console.error('Error fetching cycles:', error)
      setAlert({ type: 'error', message: 'Ошибка загрузки циклов' })
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users')
      const data = await response.json()
      setUsers(data.users || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const handleSubmit = async () => {
    try {
      const participantIds = selectedParticipants.map(p => p.id)
      
      const response = await fetch('/api/cycles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          participantIds,
        }),
      })

      if (response.ok) {
        setAlert({ type: 'success', message: 'Цикл оценки успешно создан' })
        setOpenDialog(false)
        resetForm()
        fetchCycles()
      } else {
        const error = await response.json()
        setAlert({ type: 'error', message: error.error || 'Ошибка создания цикла' })
      }
    } catch (error) {
      console.error('Error creating cycle:', error)
      setAlert({ type: 'error', message: 'Ошибка создания цикла' })
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      subjectId: '',
      startDate: '',
      endDate: '',
      reminderDate: '',
    })
    setSelectedParticipants([])
  }

  const handleView = (cycle: FeedbackCycle) => {
    setViewingCycle(cycle)
    setOpenViewDialog(true)
  }

  const handleEdit = (cycle: FeedbackCycle) => {
    setEditingCycle(cycle)
    setFormData({
      name: cycle.name,
      description: cycle.description || '',
      subjectId: cycle.subject.id,
      startDate: new Date(cycle.startDate).toISOString().slice(0, 16),
      endDate: new Date(cycle.endDate).toISOString().slice(0, 16),
      reminderDate: cycle.reminderDate ? new Date(cycle.reminderDate).toISOString().slice(0, 16) : '',
    })
    const participants = cycle.participants.map(p => p.user)
    setSelectedParticipants(participants)
    setOpenEditDialog(true)
  }

  const handleEditSubmit = async () => {
    if (!editingCycle) return

    try {
      const participantIds = selectedParticipants.map(p => p.id)
      
      const response = await fetch(`/api/cycles/${editingCycle.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          participantIds,
        }),
      })

      if (response.ok) {
        setAlert({ type: 'success', message: 'Цикл оценки успешно обновлен' })
        setOpenEditDialog(false)
        setEditingCycle(null)
        resetForm()
        fetchCycles()
      } else {
        const error = await response.json()
        setAlert({ type: 'error', message: error.error || 'Ошибка обновления цикла' })
      }
    } catch (error) {
      console.error('Error updating cycle:', error)
      setAlert({ type: 'error', message: 'Ошибка обновления цикла' })
    }
  }

  const handleDelete = async (cycle: FeedbackCycle) => {
    if (!confirm(`Вы уверены, что хотите удалить цикл "${cycle.name}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/cycles/${cycle.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setAlert({ type: 'success', message: 'Цикл оценки успешно удален' })
        fetchCycles()
      } else {
        const error = await response.json()
        setAlert({ type: 'error', message: error.error || 'Ошибка удаления цикла' })
      }
    } catch (error) {
      console.error('Error deleting cycle:', error)
      setAlert({ type: 'error', message: 'Ошибка удаления цикла' })
    }
  }

  const handleComplete = async (cycle: FeedbackCycle) => {
    if (!confirm(`Вы уверены, что хотите завершить цикл "${cycle.name}"? После завершения участники получат уведомления с результатами.`)) {
      return
    }

    try {
      const response = await fetch(`/api/cycles/${cycle.id}/complete`, {
        method: 'POST',
      })

      if (response.ok) {
        const data = await response.json()
        setAlert({ 
          type: 'success', 
          message: `Цикл "${cycle.name}" успешно завершен. Уведомления отправлены участникам.` 
        })
        fetchCycles()
      } else {
        const error = await response.json()
        setAlert({ type: 'error', message: error.error || 'Ошибка завершения цикла' })
      }
    } catch (error) {
      console.error('Error completing cycle:', error)
      setAlert({ type: 'error', message: 'Ошибка завершения цикла' })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PLANNED': return 'default'
      case 'ACTIVE': return 'primary'
      case 'COMPLETED': return 'success'
      case 'CANCELLED': return 'error'
      default: return 'default'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PLANNED': return 'Запланирован'
      case 'ACTIVE': return 'Активен'
      case 'COMPLETED': return 'Завершен'
      case 'CANCELLED': return 'Отменен'
      default: return status
    }
  }

  const getCompletionPercentage = (cycle: FeedbackCycle) => {
    if (cycle.participants.length === 0) return 0
    const completed = cycle.participants.filter(p => p.isCompleted).length
    return Math.round((completed / cycle.participants.length) * 100)
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
          Управление циклами оценки
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpenDialog(true)}
        >
          Создать цикл
        </Button>
      </Box>

      {/* Статистика */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Assessment color="primary" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h4">{cycles.length}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Всего циклов
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
                <PlayArrow color="primary" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h4">
                    {cycles.filter(c => c.status === 'ACTIVE').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Активных
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
                <CheckCircle color="primary" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h4">
                    {cycles.filter(c => c.status === 'COMPLETED').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Завершенных
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
                <Schedule color="primary" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h4">
                    {cycles.filter(c => c.status === 'PLANNED').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Запланированных
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Таблица циклов */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Список циклов оценки
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Название</TableCell>
                  <TableCell>Оцениваемый</TableCell>
                  <TableCell>Период</TableCell>
                  <TableCell>Участники</TableCell>
                  <TableCell>Прогресс</TableCell>
                  <TableCell>Статус</TableCell>
                  <TableCell>Действия</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cycles.map((cycle) => (
                  <TableRow key={cycle.id}>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {cycle.name}
                        </Typography>
                        {cycle.description && (
                          <Typography variant="caption" color="text.secondary">
                            {cycle.description}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">
                          {cycle.subject.firstName} {cycle.subject.lastName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {cycle.subject.position} • {cycle.subject.department}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">
                          {new Date(cycle.startDate).toLocaleDateString('ru-RU')} - 
                          {new Date(cycle.endDate).toLocaleDateString('ru-RU')}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{cycle.participants.length}</TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">
                          {getCompletionPercentage(cycle)}%
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {cycle.participants.filter(p => p.isCompleted).length} из {cycle.participants.length}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={getStatusLabel(cycle.status)} 
                        size="small" 
                        color={getStatusColor(cycle.status)}
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Просмотр">
                        <IconButton size="small" onClick={() => handleView(cycle)}>
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                      {cycle.status === 'COMPLETED' && (
                        <Tooltip title="Результаты оценки">
                          <IconButton 
                            size="small" 
                            onClick={() => window.open(`/results/${cycle.id}?viewer=${cycle.subject.id}`, '_blank')}
                            color="primary"
                          >
                            <Assessment />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Редактировать">
                        <IconButton size="small" onClick={() => handleEdit(cycle)}>
                          <Edit />
                        </IconButton>
                      </Tooltip>
                      {cycle.status === 'ACTIVE' && (
                        <Tooltip title="Завершить цикл">
                          <IconButton 
                            size="small" 
                            onClick={() => handleComplete(cycle)}
                            color="success"
                          >
                            <Assignment />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Удалить">
                        <IconButton 
                          size="small" 
                          onClick={() => handleDelete(cycle)}
                          color="error"
                        >
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {cycles.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography variant="body2" color="text.secondary">
                        Нет созданных циклов оценки
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Диалог создания цикла */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Создать новый цикл оценки</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Название цикла"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Описание (необязательно)"
                  multiline
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  select
                  label="Оцениваемый сотрудник"
                  value={formData.subjectId}
                  onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
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
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Дата окончания"
                  type="datetime-local"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Дата напоминания (необязательно)"
                  type="datetime-local"
                  value={formData.reminderDate}
                  onChange={(e) => setFormData({ ...formData, reminderDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <Autocomplete
                  multiple
                  options={users.filter(u => u.id !== formData.subjectId)}
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
          <Button onClick={() => setOpenDialog(false)}>Отмена</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            disabled={!formData.name || !formData.subjectId || !formData.startDate || !formData.endDate}
          >
            Создать
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог редактирования цикла */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Редактировать цикл оценки</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Название цикла"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Описание (необязательно)"
                  multiline
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  select
                  label="Оцениваемый сотрудник"
                  value={formData.subjectId}
                  onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
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
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Дата окончания"
                  type="datetime-local"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Дата напоминания (необязательно)"
                  type="datetime-local"
                  value={formData.reminderDate}
                  onChange={(e) => setFormData({ ...formData, reminderDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <Autocomplete
                  multiple
                  options={users.filter(u => u.id !== formData.subjectId)}
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
          <Button onClick={() => setOpenEditDialog(false)}>Отмена</Button>
          <Button 
            onClick={handleEditSubmit} 
            variant="contained"
            disabled={!formData.name || !formData.subjectId || !formData.startDate || !formData.endDate}
          >
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог просмотра цикла */}
      <Dialog open={openViewDialog} onClose={() => setOpenViewDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Информация о цикле оценки</DialogTitle>
        <DialogContent>
          {viewingCycle && (
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="h6">{viewingCycle.name}</Typography>
                  {viewingCycle.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {viewingCycle.description}
                    </Typography>
                  )}
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2"><strong>Оцениваемый:</strong> {viewingCycle.subject.firstName} {viewingCycle.subject.lastName}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2"><strong>Должность:</strong> {viewingCycle.subject.position || 'Не указана'}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2"><strong>Отдел:</strong> {viewingCycle.subject.department || 'Не указан'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2"><strong>Дата начала:</strong> {new Date(viewingCycle.startDate).toLocaleString('ru-RU')}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2"><strong>Дата окончания:</strong> {new Date(viewingCycle.endDate).toLocaleString('ru-RU')}</Typography>
                </Grid>
                {viewingCycle.reminderDate && (
                  <Grid item xs={12}>
                    <Typography variant="body2"><strong>Дата напоминания:</strong> {new Date(viewingCycle.reminderDate).toLocaleString('ru-RU')}</Typography>
                  </Grid>
                )}
                <Grid item xs={12}>
                  <Typography variant="body2"><strong>Статус:</strong></Typography>
                  <Chip 
                    label={getStatusLabel(viewingCycle.status)} 
                    size="small" 
                    color={getStatusColor(viewingCycle.status)}
                    sx={{ ml: 1 }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2"><strong>Прогресс:</strong> {getCompletionPercentage(viewingCycle)}% ({viewingCycle.participants.filter(p => p.isCompleted).length} из {viewingCycle.participants.length})</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2"><strong>Участники оценки:</strong></Typography>
                  <Box sx={{ mt: 1 }}>
                    {viewingCycle.participants.map((participant) => (
                      <Box key={participant.id} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Chip 
                          size="small" 
                          label={participant.role}
                          color={participant.isCompleted ? 'success' : 'default'}
                          sx={{ mr: 2, minWidth: 80 }}
                        />
                        <Typography variant="body2">
                          {participant.user.firstName} {participant.user.lastName}
                        </Typography>
                        {participant.isCompleted && (
                          <CheckCircle color="success" sx={{ ml: 1, fontSize: 16 }} />
                        )}
                      </Box>
                    ))}
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2">
                    <strong>Дата создания:</strong> {new Date(viewingCycle.createdAt).toLocaleString('ru-RU')}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenViewDialog(false)}>Закрыть</Button>
          <Button 
            onClick={() => {
              setOpenViewDialog(false)
              if (viewingCycle) handleEdit(viewingCycle)
            }}
            variant="contained"
          >
            Редактировать
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