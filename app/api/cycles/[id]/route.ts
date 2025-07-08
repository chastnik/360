import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Получить конкретный цикл по ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const cycle = await prisma.feedbackCycle.findUnique({
      where: { id },
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
      }
    })

    if (!cycle) {
      return NextResponse.json(
        { error: 'Cycle not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ cycle })
  } catch (error) {
    console.error('Error fetching cycle:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cycle' },
      { status: 500 }
    )
  }
}

// Обновить цикл
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    
    const { 
      name, 
      description, 
      subjectId, 
      startDate, 
      endDate,
      reminderDate,
      participantIds = [],
      status
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

    // Проверяем, что цикл существует
    const existingCycle = await prisma.feedbackCycle.findUnique({
      where: { id }
    })

    if (!existingCycle) {
      return NextResponse.json(
        { error: 'Cycle not found' },
        { status: 404 }
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

    // Обновляем цикл в транзакции
    const updatedCycle = await prisma.$transaction(async (tx) => {
      // Обновляем основные данные цикла
      const cycle = await tx.feedbackCycle.update({
        where: { id },
        data: {
          name,
          description,
          subjectId,
          startDate: start,
          endDate: end,
          reminderDate: reminderDate ? new Date(reminderDate) : null,
          status: status || existingCycle.status,
        }
      })

      // Удаляем старых участников и добавляем новых
      if (participantIds.length > 0) {
        await tx.cycleParticipant.deleteMany({
          where: { cycleId: id }
        })

        const participantsData = participantIds.map((userId: string, index: number) => ({
          cycleId: id,
          userId,
          role: index === 0 ? "SELF" : "PEER", // Первый участник - сам сотрудник
        }))

        await tx.cycleParticipant.createMany({
          data: participantsData
        })
      }

      return cycle
    })

    // Получаем обновленный цикл с включенными данными
    const cycle = await prisma.feedbackCycle.findUnique({
      where: { id },
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
      }
    })

    return NextResponse.json({ cycle })
  } catch (error) {
    console.error('Error updating cycle:', error)
    return NextResponse.json(
      { error: 'Failed to update cycle' },
      { status: 500 }
    )
  }
}

// Удалить цикл
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // Проверяем, что цикл существует
    const existingCycle = await prisma.feedbackCycle.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            responses: true,
          }
        }
      }
    })

    if (!existingCycle) {
      return NextResponse.json(
        { error: 'Cycle not found' },
        { status: 404 }
      )
    }

    // Проверяем, что в цикле нет ответов (если есть ответы, лучше не удалять)
    if (existingCycle._count.responses > 0) {
      return NextResponse.json(
        { error: 'Cannot delete cycle with existing responses. Consider marking as cancelled instead.' },
        { status: 400 }
      )
    }

    // Удаляем цикл и связанные данные в транзакции
    await prisma.$transaction(async (tx) => {
      // Удаляем участников
      await tx.cycleParticipant.deleteMany({
        where: { cycleId: id }
      })

      // Удаляем номинации
      await tx.reviewerNomination.deleteMany({
        where: { cycleId: id }
      })

      // Удаляем уведомления
      await tx.notification.deleteMany({
        where: { cycleId: id }
      })

      // Удаляем сам цикл
      await tx.feedbackCycle.delete({
        where: { id }
      })
    })

    return NextResponse.json({ 
      message: 'Cycle deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting cycle:', error)
    return NextResponse.json(
      { error: 'Failed to delete cycle' },
      { status: 500 }
    )
  }
} 