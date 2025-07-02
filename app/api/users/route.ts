import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        displayName: true,
        department: true,
        position: true,
        isAdmin: true,
        isActive: true,
        createdAt: true,
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        },
        _count: {
          select: {
            managedEmployees: true,
          }
        }
      },
      orderBy: {
        firstName: 'asc'
      }
    })

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

    // Проверяем, что email уникален
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    const user = await prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        displayName: displayName || `${firstName} ${lastName}`,
        department,
        position,
        managerId,
        mattermostUserId,
      },
      include: {
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        }
      }
    })

    return NextResponse.json({ user }, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
} 