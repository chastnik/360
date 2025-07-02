import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const cycles = await prisma.feedbackCycle.findMany({
      include: {
        subject: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            department: true,
            position: true,
          }
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              }
            }
          }
        },
        _count: {
          select: {
            responses: true,
            notifications: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ cycles })
  } catch (error) {
    console.error('Error fetching cycles:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cycles' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const { 
      name, 
      description, 
      subjectId, 
      startDate, 
      endDate,
      reminderDate,
      participantIds = []
    } = body

    // Валидация обязательных полей
    if (!name || !subjectId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Name, subjectId, startDate and endDate are required' },
        { status: 400 }
      )
    }

    // Валидация дат
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    if (start >= end) {
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      )
    }

    // Проверяем, что субъект существует
    const subject = await prisma.user.findUnique({
      where: { id: subjectId }
    })

    if (!subject) {
      return NextResponse.json(
        { error: 'Subject user not found' },
        { status: 404 }
      )
    }

    // Создаем цикл оценки
    const cycle = await prisma.feedbackCycle.create({
      data: {
        name,
        description,
        subjectId,
        startDate: start,
        endDate: end,
        reminderDate: reminderDate ? new Date(reminderDate) : null,
        status: "PLANNED",
      }
    })

    // Добавляем участников если они указаны
    if (participantIds.length > 0) {
      const participantsData = participantIds.map((userId: string, index: number) => ({
        cycleId: cycle.id,
        userId,
        role: index === 0 ? "SELF" : "PEER", // Первый участник - сам сотрудник
      }))

      await prisma.cycleParticipant.createMany({
        data: participantsData
      })
    }

    // Получаем созданный цикл с включенными данными
    const createdCycle = await prisma.feedbackCycle.findUnique({
      where: { id: cycle.id },
      include: {
        subject: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              }
            }
          }
        }
      }
    })

    return NextResponse.json({ cycle: createdCycle }, { status: 201 })
  } catch (error) {
    console.error('Error creating cycle:', error)
    return NextResponse.json(
      { error: 'Failed to create cycle' },
      { status: 500 }
    )
  }
} 