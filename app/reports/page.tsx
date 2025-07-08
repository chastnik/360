'use client'

import { useState, useEffect } from 'react'
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
} from '@mui/material'
import {
  TrendingUp,
  People,
  Assessment,
  Business,
  BarChart,
  PieChart,
  Download,
  Refresh,
  ExpandMore,
  Star,
  StarBorder,
  QuestionAnswer,
  Timeline,
} from '@mui/icons-material'

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
      id={`report-tabpanel-${index}`}
      aria-labelledby={`report-tab-${index}`}
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

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reportData, setReportData] = useState<any>(null)

  useEffect(() => {
    loadReport('overview')
  }, [])

  const loadReport = async (type: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/reports?type=${type}`)
      if (!response.ok) {
        throw new Error('Failed to load report')
      }
      const data = await response.json()
      setReportData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки отчёта')
    } finally {
      setLoading(false)
    }
  }

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue)
    const reportTypes = ['overview', 'departments', 'cycles', 'responses', 'categories']
    loadReport(reportTypes[newValue])
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

  const renderRatingStars = (rating: number) => {
    const stars = []
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 >= 0.5

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Star key={i} color="primary" fontSize="small" />)
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<Star key={i} color="primary" fontSize="small" style={{ opacity: 0.5 }} />)
      } else {
        stars.push(<StarBorder key={i} color="disabled" fontSize="small" />)
      }
    }
    return <Box display="flex" alignItems="center">{stars}</Box>
  }

  if (loading && !reportData) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      </Container>
    )
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Заголовок */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" component="h1">
          Отчёты и аналитика
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => {
              const reportTypes = ['overview', 'departments', 'cycles', 'responses', 'categories']
              loadReport(reportTypes[activeTab])
            }}
            disabled={loading}
          >
            Обновить
          </Button>
          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={() => {
              // TODO: Implement export functionality
              alert('Экспорт будет реализован в следующей версии')
            }}
          >
            Экспорт
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Табы */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="Обзор" icon={<TrendingUp />} />
          <Tab label="Отделы" icon={<Business />} />
          <Tab label="Циклы" icon={<Assessment />} />
          <Tab label="Ответы" icon={<QuestionAnswer />} />
          <Tab label="Категории" icon={<BarChart />} />
        </Tabs>
      </Box>

      {/* Обзор */}
      <TabPanel value={activeTab} index={0}>
        {reportData?.overview && (
          <>
            {/* Основная статистика */}
            <Grid container spacing={3} mb={4}>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center">
                      <People color="primary" sx={{ mr: 2 }} />
                      <Box>
                        <Typography variant="h4">{reportData.overview.users.total}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Пользователей ({reportData.overview.users.active} активных)
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
                      <Assessment color="primary" sx={{ mr: 2 }} />
                      <Box>
                        <Typography variant="h4">{reportData.overview.cycles.total}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Циклов оценки
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
                      <QuestionAnswer color="primary" sx={{ mr: 2 }} />
                      <Box>
                        <Typography variant="h4">{reportData.overview.responses.total}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Ответов получено
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
                      <BarChart color="primary" sx={{ mr: 2 }} />
                      <Box>
                        <Typography variant="h4">{reportData.overview.system.categories}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Категорий ({reportData.overview.system.questions} вопросов)
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Распределение по отделам */}
            <Grid container spacing={3} mb={4}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Распределение по отделам
                    </Typography>
                    {reportData.departments && reportData.departments.length > 0 ? reportData.departments.map((dept: any, index: number) => (
                      <Box key={index} mb={2}>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2">{dept.name}</Typography>
                          <Typography variant="body2" fontWeight="bold">{dept.count}</Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={(dept.count / reportData.overview.users.total) * 100}
                          sx={{ mt: 1 }}
                        />
                      </Box>
                    )) : (
                      <Typography variant="body2" color="text.secondary">
                        Данные по отделам отсутствуют
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Статистика циклов
                    </Typography>
                    <Box mb={2}>
                      <Box display="flex" alignItems="center" mb={1}>
                        <Box width={16} height={16} bgcolor="primary.main" mr={2} borderRadius="50%" />
                        <Typography variant="body2">Активные: {reportData.overview.cycles.active}</Typography>
                      </Box>
                      <Box display="flex" alignItems="center" mb={1}>
                        <Box width={16} height={16} bgcolor="success.main" mr={2} borderRadius="50%" />
                        <Typography variant="body2">Завершенные: {reportData.overview.cycles.completed}</Typography>
                      </Box>
                      <Box display="flex" alignItems="center">
                        <Box width={16} height={16} bgcolor="grey.400" mr={2} borderRadius="50%" />
                        <Typography variant="body2">Запланированные: {reportData.overview.cycles.planned}</Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Последние циклы */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Последние циклы оценки
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Название</TableCell>
                        <TableCell>Оцениваемый</TableCell>
                        <TableCell>Отдел</TableCell>
                        <TableCell>Статус</TableCell>
                        <TableCell>Участники</TableCell>
                        <TableCell>Дата создания</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {reportData.recentCycles?.map((cycle: any) => (
                        <TableRow key={cycle.id}>
                          <TableCell>{cycle.name}</TableCell>
                          <TableCell>{cycle.subject}</TableCell>
                          <TableCell>{cycle.department || 'Не указан'}</TableCell>
                          <TableCell>
                            <Chip 
                              label={getStatusLabel(cycle.status)} 
                              size="small" 
                              color={getStatusColor(cycle.status)}
                            />
                          </TableCell>
                          <TableCell>{cycle.participants}</TableCell>
                          <TableCell>{new Date(cycle.createdAt).toLocaleDateString('ru-RU')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </>
        )}
      </TabPanel>

      {/* Отделы */}
      <TabPanel value={activeTab} index={1}>
        {reportData?.departments && reportData.departments.length > 0 ? (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Статистика по отделам
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Отдел</TableCell>
                      <TableCell>Сотрудники</TableCell>
                      <TableCell>Всего циклов</TableCell>
                      <TableCell>Активные</TableCell>
                      <TableCell>Завершенные</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportData.departments.map((dept: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell>{dept.name}</TableCell>
                        <TableCell>{dept.users || 0}</TableCell>
                        <TableCell>{dept.cycles?.total || 0}</TableCell>
                        <TableCell>{dept.cycles?.active || 0}</TableCell>
                        <TableCell>{dept.cycles?.completed || 0}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        ) : (
          <Alert severity="info">
            Данные по отделам отсутствуют или загружаются...
          </Alert>
        )}
      </TabPanel>

      {/* Циклы */}
      <TabPanel value={activeTab} index={2}>
        {reportData?.cycles && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Детальный отчет по циклам
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Название</TableCell>
                      <TableCell>Оцениваемый</TableCell>
                      <TableCell>Статус</TableCell>
                      <TableCell>Участники</TableCell>
                      <TableCell>Прогресс</TableCell>
                      <TableCell>Ответы</TableCell>
                      <TableCell>Период</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportData.cycles.map((cycle: any) => (
                      <TableRow key={cycle.id}>
                        <TableCell>{cycle.name}</TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2">{cycle.subject.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {cycle.subject.position} • {cycle.subject.department}
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
                        <TableCell>{cycle.participants.total}</TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center">
                            <LinearProgress
                              variant="determinate"
                              value={cycle.participants.completionRate}
                              sx={{ width: 60, mr: 1 }}
                            />
                            <Typography variant="caption">
                              {cycle.participants.completionRate}%
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{cycle.responses}</TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {new Date(cycle.startDate).toLocaleDateString('ru-RU')} - 
                            {new Date(cycle.endDate).toLocaleDateString('ru-RU')}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        )}
      </TabPanel>

      {/* Ответы */}
      <TabPanel value={activeTab} index={3}>
        {reportData && (
          <>
            <Grid container spacing={3} mb={4}>
              <Grid item xs={12} sm={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Общая статистика
                    </Typography>
                    <Typography variant="h4">{reportData.total}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Всего ответов
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Рейтинговые ответы
                    </Typography>
                    <Typography variant="h4">{reportData.byType?.rating || 0}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Численные оценки
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Текстовые ответы
                    </Typography>
                    <Typography variant="h4">{reportData.byType?.text || 0}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Развернутые ответы
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {reportData.categories && (
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Средние оценки по категориям
                  </Typography>
                  {reportData.categories.map((category: any, index: number) => (
                    <Box key={index} mb={3}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="subtitle1">{category.name}</Typography>
                        <Box display="flex" alignItems="center" gap={1}>
                          {renderRatingStars(category.avgRating)}
                          <Typography variant="body2" fontWeight="bold">
                            {category.avgRating.toFixed(1)}
                          </Typography>
                        </Box>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {category.responses} ответов
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={(category.avgRating / 5) * 100}
                        sx={{ mt: 1 }}
                      />
                    </Box>
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </TabPanel>

      {/* Категории */}
      <TabPanel value={activeTab} index={4}>
        {reportData?.categories && (
          <Box>
            {reportData.categories.map((category: any) => (
              <Accordion key={category.id} sx={{ mb: 2 }}>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" width="100%">
                    <Typography variant="h6">{category.name}</Typography>
                    <Box display="flex" alignItems="center" gap={2} mr={2}>
                      {renderRatingStars(category.avgRating)}
                      <Typography variant="body2" fontWeight="bold">
                        {category.avgRating.toFixed(1)}
                      </Typography>
                      <Chip 
                        label={`${category.questionsCount} вопросов`} 
                        size="small" 
                        variant="outlined"
                      />
                    </Box>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" color="text.secondary" mb={2}>
                    {category.description}
                  </Typography>
                  <Typography variant="subtitle2" mb={2}>
                    Статистика по вопросам:
                  </Typography>
                  <List>
                    {category.questions.map((question: any) => (
                      <ListItem key={question.id}>
                        <ListItemIcon>
                          <QuestionAnswer color="primary" />
                        </ListItemIcon>
                        <ListItemText
                          primary={question.text}
                          secondary={
                            <span style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px' }}>
                              {question.type === 'RATING' && renderRatingStars(question.avgRating)}
                              <Typography variant="caption" component="span">
                                {question.type === 'RATING' 
                                  ? `Средняя оценка: ${question.avgRating.toFixed(1)}`
                                  : 'Текстовый вопрос'
                                }
                              </Typography>
                              <Typography variant="caption" component="span">
                                Ответов: {question.responsesCount}
                              </Typography>
                            </span>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        )}
      </TabPanel>

      {loading && (
        <Box position="fixed" top={0} left={0} right={0} zIndex={1300}>
          <LinearProgress />
        </Box>
      )}
    </Container>
  )
} 