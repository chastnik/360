import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Получить конкретного пользователя по ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const user = await prisma.user.findUnique({
      where: { id },
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
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    )
  }
}

// Обновить пользователя
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    
    const { 
      email, 
      firstName, 
      lastName, 
      displayName,
      department, 
      position, 
      managerId,
      isAdmin,
      isActive,
      mattermostUserId 
    } = body

    // Валидация обязательных полей
    if (!email || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Email, firstName and lastName are required' },
        { status: 400 }
      )
    }

    // Проверяем, что пользователь существует
    const existingUser = await prisma.user.findUnique({
      where: { id }
    })

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Проверяем, что email уникален (если он изменился)
    if (email !== existingUser.email) {
      const emailTaken = await prisma.user.findUnique({
        where: { email }
      })

      if (emailTaken) {
        return NextResponse.json(
          { error: 'User with this email already exists' },
          { status: 409 }
        )
      }
    }

    // Проверяем, что пользователь не назначает себя менеджером
    if (managerId === id) {
      return NextResponse.json(
        { error: 'User cannot be their own manager' },
        { status: 400 }
      )
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        email,
        firstName,
        lastName,
        displayName: displayName || `${firstName} ${lastName}`,
        department,
        position,
        managerId: managerId || null,
        isAdmin: isAdmin !== undefined ? isAdmin : existingUser.isAdmin,
        isActive: isActive !== undefined ? isActive : existingUser.isActive,
        mattermostUserId,
      },
      include: {
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
      }
    })

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}

// Удалить пользователя
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // Проверяем, что пользователь существует
    const existingUser = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            managedEmployees: true,
          }
        }
      }
    })

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Проверяем, что у пользователя нет подчиненных
    if (existingUser._count.managedEmployees > 0) {
      return NextResponse.json(
        { error: 'Cannot delete user who has managed employees. Please reassign them first.' },
        { status: 400 }
      )
    }

    // Вместо полного удаления, помечаем как неактивного
    const user = await prisma.user.update({
      where: { id },
      data: {
        isActive: false,
        email: `deleted_${Date.now()}_${existingUser.email}`, // Освобождаем email
      }
    })

    return NextResponse.json({ 
      message: 'User deactivated successfully',
      user 
    })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
} 