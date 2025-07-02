'use client'

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

export default function HomePage() {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Заголовок */}
      <Box textAlign="center" mb={4}>
        <Typography variant="h2" component="h1" gutterBottom>
          Система 360-градусной оценки
        </Typography>
        <Typography variant="h5" color="text.secondary" gutterBottom>
          Комплексная оценка персонала с интеграцией Mattermost
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
              <Button size="small" href="/admin">Настроить</Button>
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
                <ListItem>
                  <ListItemIcon>
                    <Assessment fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Создать цикл оценки" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <People fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Добавить сотрудника" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <Schedule fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Настроить расписание" />
                </ListItem>
                <ListItem>
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
    </Container>
  )
} 