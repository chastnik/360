'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Chip,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Rating,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material'
import {
  ExpandMore,
  Person,
  Group,
  Assessment,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material'

interface FeedbackResponse {
  id: string
  ratingValue?: number
  textValue?: string
  reviewerName?: string
  reviewerRole: string
  isAnonymous: boolean
}

interface FeedbackResult {
  questionId: string
  questionText: string
  questionType: string
  categoryName: string
  responses: FeedbackResponse[]
  averageRating?: number
}

interface CycleResults {
  cycle: {
    id: string
    name: string
    description?: string
    startDate: string
    endDate: string
    status: string
    subject: {
      name: string
      department?: string
      position?: string
      email: string
    }
  }
  statistics: {
    totalParticipants: number
    totalResponses: number
    uniqueRespondents: number
    completionRate: number
    overallAverage: number
    categoryAverages: { [categoryName: string]: number }
  }
  results: { [categoryName: string]: FeedbackResult[] }
  permissions: {
    canViewNonAnonymous: boolean
    isSubject: boolean
    isManager: boolean
    isAdmin: boolean
  }
}

export default function ResultsPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const cycleId = params.cycleId as string
  const viewerId = searchParams.get('viewer')

  const [results, setResults] = useState<CycleResults | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (cycleId && viewerId) {
      fetchResults()
    } else {
      setError('Недостаточно параметров для отображения результатов')
      setLoading(false)
    }
  }, [cycleId, viewerId])

  const fetchResults = async () => {
    try {
      const response = await fetch(`/api/cycles/${cycleId}/results?viewer=${viewerId}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Ошибка загрузки результатов')
      }

      const data = await response.json()
      setResults(data)
    } catch (error) {
      console.error('Error fetching results:', error)
      setError(error instanceof Error ? error.message : 'Ошибка загрузки результатов')
    } finally {
      setLoading(false)
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'SELF': return 'Самооценка'
      case 'MANAGER': return 'Руководитель'
      case 'PEER': return 'Коллега'
      case 'SUBORDINATE': return 'Подчиненный'
      case 'CUSTOMER': return 'Клиент'
      default: return role
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'SELF': return 'primary'
      case 'MANAGER': return 'error'
      case 'PEER': return 'success'
      case 'SUBORDINATE': return 'warning'
      case 'CUSTOMER': return 'info'
      default: return 'default'
    }
  }

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Загрузка результатов оценки...
        </Typography>
      </Container>
    )
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          {error}
        </Alert>
      </Container>
    )
  }

  if (!results) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="warning">
          Результаты не найдены
        </Alert>
      </Container>
    )
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Заголовок */}
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Результаты 360° оценки
        </Typography>
        <Typography variant="h5" color="text.secondary" gutterBottom>
          {results.cycle.name}
        </Typography>
        <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
          <Chip 
            icon={<Person />}
            label={`Оцениваемый: ${results.cycle.subject.name}`}
            color="primary"
          />
          <Chip 
            label={`${results.cycle.subject.position} • ${results.cycle.subject.department}`}
            variant="outlined"
          />
          <Chip 
            icon={results.permissions.canViewNonAnonymous ? <Visibility /> : <VisibilityOff />}
            label={results.permissions.canViewNonAnonymous ? 'Полный доступ' : 'Анонимные результаты'}
            color={results.permissions.canViewNonAnonymous ? 'success' : 'default'}
          />
        </Box>
      </Box>

      {/* Общая статистика */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Group color="primary" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h4">{results.statistics.uniqueRespondents}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    из {results.statistics.totalParticipants} участников
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
                  <Typography variant="h4">{results.statistics.totalResponses}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Всего ответов
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Завершенность
              </Typography>
              <Typography variant="h4" color="primary">
                {results.statistics.completionRate}%
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={results.statistics.completionRate}
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Общий балл
              </Typography>
              <Box display="flex" alignItems="center">
                <Typography variant="h4" color="primary" sx={{ mr: 1 }}>
                  {results.statistics.overallAverage}
                </Typography>
                <Rating 
                  value={results.statistics.overallAverage} 
                  readOnly 
                  precision={0.1}
                  size="small"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Результаты по категориям */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Оценки по категориям компетенций
          </Typography>
          <Grid container spacing={2}>
            {Object.entries(results.statistics.categoryAverages).map(([categoryName, average]) => (
              <Grid item xs={12} sm={6} md={4} key={categoryName}>
                <Box 
                  sx={{ 
                    p: 2, 
                    border: 1, 
                    borderColor: 'divider', 
                    borderRadius: 1,
                    textAlign: 'center'
                  }}
                >
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {categoryName}
                  </Typography>
                  <Typography variant="h5" color="primary">
                    {average}
                  </Typography>
                  <Rating 
                    value={average} 
                    readOnly 
                    precision={0.1}
                    size="small"
                  />
                </Box>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Детальные результаты по категориям */}
      {Object.entries(results.results).map(([categoryName, questions]) => (
        <Accordion key={categoryName} sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box display="flex" alignItems="center" width="100%">
              <Typography variant="h6" sx={{ flexGrow: 1 }}>
                {categoryName}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
                Средний балл: {results.statistics.categoryAverages[categoryName] || 'Н/Д'}
              </Typography>
              <Rating 
                value={results.statistics.categoryAverages[categoryName] || 0} 
                readOnly 
                precision={0.1}
                size="small"
              />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            {questions.map((question) => (
              <Card key={question.questionId} sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    {question.questionText}
                  </Typography>
                  
                  {question.questionType === 'RATING' && question.averageRating && (
                    <Box display="flex" alignItems="center" mb={2}>
                      <Typography variant="body2" sx={{ mr: 2 }}>
                        Средняя оценка: {question.averageRating}
                      </Typography>
                      <Rating 
                        value={question.averageRating} 
                        readOnly 
                        precision={0.1}
                        size="small"
                      />
                    </Box>
                  )}

                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Роль</TableCell>
                          {results.permissions.canViewNonAnonymous && (
                            <TableCell>Оценивающий</TableCell>
                          )}
                          {question.questionType === 'RATING' && (
                            <TableCell>Оценка</TableCell>
                          )}
                          {question.questionType === 'TEXT' && (
                            <TableCell>Комментарий</TableCell>
                          )}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {question.responses.map((response, index) => (
                          <TableRow key={response.id}>
                            <TableCell>
                              <Chip 
                                label={getRoleLabel(response.reviewerRole)}
                                size="small"
                                color={getRoleColor(response.reviewerRole) as any}
                              />
                            </TableCell>
                            {results.permissions.canViewNonAnonymous && (
                              <TableCell>
                                {response.reviewerName || 'Анонимно'}
                              </TableCell>
                            )}
                            {response.ratingValue && (
                              <TableCell>
                                <Box display="flex" alignItems="center">
                                  <Typography sx={{ mr: 1 }}>
                                    {response.ratingValue}
                                  </Typography>
                                  <Rating 
                                    value={response.ratingValue} 
                                    readOnly 
                                    size="small"
                                  />
                                </Box>
                              </TableCell>
                            )}
                            {response.textValue && (
                              <TableCell>
                                <Typography variant="body2">
                                  {response.textValue}
                                </Typography>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            ))}
          </AccordionDetails>
        </Accordion>
      ))}

      {/* Информация о правах доступа */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Информация о просмотре
          </Typography>
          <Box>
            {results.permissions.isSubject && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Вы просматриваете результаты своей оценки. Имена оценивающих скрыты для обеспечения анонимности.
              </Alert>
            )}
            {results.permissions.isManager && !results.permissions.isSubject && (
              <Alert severity="success" sx={{ mb: 2 }}>
                Вы просматриваете результаты как руководитель. Вам доступны имена всех оценивающих.
              </Alert>
            )}
            {results.permissions.isAdmin && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Вы просматриваете результаты как администратор. Вам доступна полная информация.
              </Alert>
            )}
            
            <Typography variant="body2" color="text.secondary">
              Цикл оценки проводился с {new Date(results.cycle.startDate).toLocaleDateString('ru-RU')} 
              по {new Date(results.cycle.endDate).toLocaleDateString('ru-RU')}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Container>
  )
} 