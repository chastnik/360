'use client'

import { useState, useEffect } from 'react'
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Alert,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tabs,
  Tab,
  CircularProgress,
  Tooltip,
} from '@mui/material'
import {
  ExpandMore,
  Edit,
  Delete,
  Add,
  Save,
  Cancel,
  Visibility,
  Settings,
  QuestionAnswer,
} from '@mui/icons-material'

interface Question {
  id: string
  text: string
  type: string
  order: number
  isActive: boolean
  isRequired: boolean
  ratingScale: number
  category?: {
    id: string
    name: string
  }
}

interface Category {
  id: string
  name: string
  description: string
  order: number
  isActive: boolean
  questions: Question[]
}

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  )
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState(0)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Диалоги
  const [openQuestionDialog, setOpenQuestionDialog] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')

  // Форма вопроса
  const [questionForm, setQuestionForm] = useState({
    text: '',
    type: 'RATING',
    isRequired: true,
    ratingScale: 5,
  })

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data.categories)
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue)
  }

  const handleAddQuestion = (categoryId: string) => {
    setSelectedCategoryId(categoryId)
    setEditingQuestion(null)
    setQuestionForm({
      text: '',
      type: 'RATING',
      isRequired: true,
      ratingScale: 5,
    })
    setOpenQuestionDialog(true)
  }

  const handleEditQuestion = (question: Question) => {
    setSelectedCategoryId(question.category?.id || '')
    setEditingQuestion(question)
    setQuestionForm({
      text: question.text,
      type: question.type,
      isRequired: question.isRequired,
      ratingScale: question.ratingScale,
    })
    setOpenQuestionDialog(true)
  }

  const handleSaveQuestion = async () => {
    try {
      setSaving(true)
      
      if (editingQuestion) {
        // Обновляем существующий вопрос
        const response = await fetch(`/api/questions/${editingQuestion.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(questionForm),
        })
        
        if (response.ok) {
          await fetchCategories()
          setOpenQuestionDialog(false)
        }
      } else {
        // Создаем новый вопрос
        const response = await fetch('/api/questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...questionForm,
            categoryId: selectedCategoryId,
          }),
        })
        
        if (response.ok) {
          await fetchCategories()
          setOpenQuestionDialog(false)
        }
      }
    } catch (error) {
      console.error('Error saving question:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот вопрос?')) {
      return
    }

    try {
      const response = await fetch(`/api/questions/${questionId}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        await fetchCategories()
      }
    } catch (error) {
      console.error('Error deleting question:', error)
    }
  }

  const getQuestionTypeLabel = (type: string) => {
    switch (type) {
      case 'RATING': return 'Рейтинг'
      case 'TEXT': return 'Текст'
      case 'MULTIPLE_CHOICE': return 'Выбор'
      default: return type
    }
  }

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Загрузка настроек...
        </Typography>
      </Container>
    )
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Настройки системы
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Управление вопросами, категориями и системными параметрами
        </Typography>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="Управление вопросами" icon={<QuestionAnswer />} />
          <Tab label="Системные настройки" icon={<Settings />} />
        </Tabs>
      </Box>

      {/* Управление вопросами */}
      <TabPanel value={activeTab} index={0}>
        <Typography variant="h6" gutterBottom>
          Категории и вопросы оценки
        </Typography>
        
        {categories.map((category) => (
          <Accordion key={category.id} sx={{ mb: 2 }}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Typography variant="h6" sx={{ flexGrow: 1 }}>
                  {category.name}
                </Typography>
                <Chip 
                  label={`${category.questions.filter(q => q.isActive).length} вопросов`} 
                  size="small" 
                  color="primary" 
                />
                <Chip 
                  label={category.isActive ? "Активна" : "Неактивна"} 
                  size="small" 
                  color={category.isActive ? "success" : "default"}
                />
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" color="text.secondary" paragraph>
                {category.description}
              </Typography>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  Вопросы категории
                </Typography>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<Add />}
                  onClick={() => handleAddQuestion(category.id)}
                >
                  Добавить вопрос
                </Button>
              </Box>

              {category.questions.length === 0 ? (
                <Alert severity="info">
                  В этой категории пока нет вопросов. Добавьте первый вопрос.
                </Alert>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>№</TableCell>
                        <TableCell>Вопрос</TableCell>
                        <TableCell>Тип</TableCell>
                        <TableCell>Обязательный</TableCell>
                        <TableCell>Статус</TableCell>
                        <TableCell>Действия</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {category.questions.map((question) => (
                        <TableRow key={question.id}>
                          <TableCell>{question.order}</TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ maxWidth: 300 }}>
                              {question.text}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={getQuestionTypeLabel(question.type)} 
                              size="small" 
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={question.isRequired ? "Да" : "Нет"} 
                              size="small" 
                              color={question.isRequired ? "primary" : "default"}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={question.isActive ? "Активен" : "Неактивен"} 
                              size="small" 
                              color={question.isActive ? "success" : "default"}
                            />
                          </TableCell>
                          <TableCell>
                            <Tooltip title="Редактировать">
                              <IconButton
                                size="small"
                                onClick={() => handleEditQuestion(question)}
                              >
                                <Edit />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Удалить">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeleteQuestion(question.id)}
                              >
                                <Delete />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </AccordionDetails>
          </Accordion>
        ))}
      </TabPanel>

      {/* Системные настройки */}
      <TabPanel value={activeTab} index={1}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Интеграции
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Подключенные сервисы:
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Chip label="Mattermost - Подключено" color="success" size="small" sx={{ mr: 1 }} />
                  <Chip label="Календарь - Настроен" color="primary" size="small" />
                </Box>
                <Typography variant="body2">
                  • Канал уведомлений: #360-feedback<br />
                  • Автоматические напоминания включены<br />
                  • Напоминания за 3 дня до завершения
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Параметры оценки
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Текущие настройки системы:
                </Typography>
                <Typography variant="body2">
                  • Шкала оценки: 5-балльная<br />
                  • Длительность цикла: 14 дней<br />
                  • Email уведомления: Включены<br />
                  • Обязательные комментарии: Да
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  База данных
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Статистика:
                </Typography>
                <Typography variant="body2">
                  • Категорий: {categories.length}<br />
                  • Вопросов: {categories.reduce((sum, cat) => sum + cat.questions.length, 0)}<br />
                  • Активных вопросов: {categories.reduce((sum, cat) => sum + cat.questions.filter(q => q.isActive).length, 0)}<br />
                  • Размер БД: ~2.5 MB
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Системная информация
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Информация о версии:
                </Typography>
                <Typography variant="body2">
                  • Версия: 360° Feedback v1.0.0-demo<br />
                  • Технологии: Next.js 14, React, TypeScript<br />
                  • ORM: Prisma с SQLite<br />
                  • Автор: Стас Чашин для БИТ.Цифра
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Диалог редактирования вопроса */}
      <Dialog 
        open={openQuestionDialog} 
        onClose={() => setOpenQuestionDialog(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          {editingQuestion ? 'Редактировать вопрос' : 'Добавить новый вопрос'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              label="Текст вопроса"
              fullWidth
              multiline
              rows={3}
              value={questionForm.text}
              onChange={(e) => setQuestionForm({ ...questionForm, text: e.target.value })}
              margin="normal"
              required
            />

            <FormControl fullWidth margin="normal">
              <InputLabel>Тип вопроса</InputLabel>
              <Select
                value={questionForm.type}
                onChange={(e) => setQuestionForm({ ...questionForm, type: e.target.value })}
              >
                <MenuItem value="RATING">Рейтинговый (1-5 баллов)</MenuItem>
                <MenuItem value="TEXT">Текстовый ответ</MenuItem>
                <MenuItem value="MULTIPLE_CHOICE">Множественный выбор</MenuItem>
              </Select>
            </FormControl>

            {questionForm.type === 'RATING' && (
              <TextField
                label="Максимальный балл"
                type="number"
                value={questionForm.ratingScale}
                onChange={(e) => setQuestionForm({ 
                  ...questionForm, 
                  ratingScale: parseInt(e.target.value) || 5 
                })}
                margin="normal"
                inputProps={{ min: 1, max: 10 }}
              />
            )}

            <FormControlLabel
              control={
                <Switch
                  checked={questionForm.isRequired}
                  onChange={(e) => setQuestionForm({ 
                    ...questionForm, 
                    isRequired: e.target.checked 
                  })}
                />
              }
              label="Обязательный вопрос"
              sx={{ mt: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenQuestionDialog(false)}>
            Отмена
          </Button>
          <Button 
            onClick={handleSaveQuestion} 
            variant="contained"
            disabled={saving || !questionForm.text.trim()}
            startIcon={saving ? <CircularProgress size={16} /> : <Save />}
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </DialogActions>
      </Dialog>

      <Alert severity="success" sx={{ mt: 3 }}>
        Система настроена и готова к работе. Всего в системе {categories.reduce((sum, cat) => sum + cat.questions.filter(q => q.isActive).length, 0)} активных вопросов в {categories.length} категориях.
      </Alert>
    </Container>
  )
} 