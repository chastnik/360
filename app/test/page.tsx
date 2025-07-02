'use client'

import { useState, useEffect } from 'react'
import { Container, Typography, Box, Button, Alert } from '@mui/material'

export default function TestPage() {
  const [status, setStatus] = useState('Загрузка...')
  const [users, setUsers] = useState<any[]>([])
  const [error, setError] = useState('')

  const testAPI = async () => {
    try {
      setStatus('Тестирование API...')
      
      const response = await fetch('/api/users')
      const data = await response.json()
      
      if (response.ok) {
        setUsers(data.users || [])
        setStatus(`API работает! Найдено пользователей: ${data.users?.length || 0}`)
        setError('')
      } else {
        setError(`Ошибка API: ${data.error}`)
        setStatus('Ошибка при тестировании API')
      }
    } catch (err) {
      setError(`Ошибка сети: ${err}`)
      setStatus('Ошибка сети')
    }
  }

  const addTestUser = async () => {
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          firstName: 'Тест',
          lastName: 'Пользователь',
          department: 'Разработка',
          position: 'Разработчик',
        }),
      })

      const data = await response.json()
      
      if (response.ok) {
        setStatus('Тестовый пользователь создан!')
        testAPI() // Обновляем список
      } else {
        setError(`Ошибка создания: ${data.error}`)
      }
    } catch (err) {
      setError(`Ошибка создания: ${err}`)
    }
  }

  useEffect(() => {
    testAPI()
  }, [])

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Тестирование системы
      </Typography>
      
      <Box mb={2}>
        <Typography variant="h6">Статус: {status}</Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box display="flex" gap={2} mb={3}>
        <Button variant="contained" onClick={testAPI}>
          Проверить API
        </Button>
        <Button variant="outlined" onClick={addTestUser}>
          Добавить тестового пользователя
        </Button>
      </Box>

      {users.length > 0 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Пользователи в системе:
          </Typography>
          {users.map((user, index) => (
            <Box key={index} p={2} border={1} borderColor="grey.300" borderRadius={1} mb={1}>
              <Typography><strong>ID:</strong> {user.id}</Typography>
              <Typography><strong>Имя:</strong> {user.firstName} {user.lastName}</Typography>
              <Typography><strong>Email:</strong> {user.email}</Typography>
              <Typography><strong>Отдел:</strong> {user.department || 'Не указан'}</Typography>
              <Typography><strong>Должность:</strong> {user.position || 'Не указана'}</Typography>
              <Typography><strong>Админ:</strong> {user.isAdmin ? 'Да' : 'Нет'}</Typography>
            </Box>
          ))}
        </Box>
      )}
    </Container>
  )
} 