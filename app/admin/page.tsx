'use client';

import { useSession } from 'next-auth/react';
import { Container, Typography, Box, Paper, Grid, Card, CardContent } from '@mui/material';
import { Settings, People, Assessment, Schedule } from '@mui/icons-material';
import Link from 'next/link';

export default function AdminPage() {
  const { data: session } = useSession();

  // Проверка прав администратора (дублируем проверку на всякий случай)
  if (!session?.user.isAdmin) {
    return (
      <Container>
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="h4" color="error">
            Доступ запрещен
          </Typography>
          <Typography variant="body1" sx={{ mt: 2 }}>
            У вас нет прав администратора для доступа к этой странице.
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Панель администратора
      </Typography>
      
      <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 4 }}>
        Управление системой 360° оценки
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card component={Link} href="/admin/users" sx={{ textDecoration: 'none', '&:hover': { elevation: 4 } }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <People color="primary" fontSize="large" />
                <Box>
                  <Typography variant="h6">
                    Управление пользователями
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Добавление, редактирование и управление пользователями
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card component={Link} href="/admin/questions" sx={{ textDecoration: 'none', '&:hover': { elevation: 4 } }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Assessment color="primary" fontSize="large" />
                <Box>
                  <Typography variant="h6">
                    Вопросы и категории
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Настройка вопросов для оценки
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card component={Link} href="/admin/cycles" sx={{ textDecoration: 'none', '&:hover': { elevation: 4 } }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Schedule color="primary" fontSize="large" />
                <Box>
                  <Typography variant="h6">
                    Циклы оценки
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Создание и управление циклами оценки
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card component={Link} href="/admin/settings" sx={{ textDecoration: 'none', '&:hover': { elevation: 4 } }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Settings color="primary" fontSize="large" />
                <Box>
                  <Typography variant="h6">
                    Системные настройки
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Общие настройки системы и интеграции
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
} 