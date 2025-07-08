import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    // Временно: возвращаем тестовые данные
    const users = [
      {
        id: '1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        displayName: 'Test User',
        department: 'IT',
        position: 'Developer',
        isAdmin: false,
        isActive: true,
        createdAt: new Date().toISOString(),
        manager: null,
        _count: { managedEmployees: 0 }
      }
    ]

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const { 
      email, 
      firstName, 
      lastName, 
      displayName,
      department, 
      position, 
      managerId,
      mattermostUserId 
    } = body

    // Валидация обязательных полей
    if (!email || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Email, firstName and lastName are required' },
        { status: 400 }
      )
    }

    // Временно: создание пользователей отключено
    return NextResponse.json(
      { error: 'User creation temporarily disabled' },
      { status: 503 }
    )
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
} 