import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { mattermostService } from '@/lib/mattermost'
import { emailService } from '@/lib/email'

// Завершить цикл оценки и отправить уведомления
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params

    // Получаем цикл оценки
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
            manager: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                isAdmin: true,
              }
            }
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
                isAdmin: true,
              }
            }
          }
        },
        responses: {
          include: {
            question: {
              select: {
                type: true
              }
            }
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

    // Проверяем, что цикл еще не завершен
    if (cycle.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Cycle is already completed' },
        { status: 400 }
      )
    }

    // Проверяем, что цикл активен
    if (cycle.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Only active cycles can be completed' },
        { status: 400 }
      )
    }

    // Вычисляем статистику завершенности
    const totalParticipants = cycle.participants.length
    const completedParticipants = cycle.participants.filter(p => p.isCompleted).length
    const completionRate = totalParticipants > 0 ? (completedParticipants / totalParticipants) * 100 : 0

    // Вычисляем общий средний балл
    const ratingResponses = cycle.responses.filter(r => 
      r.question.type === 'RATING' && r.ratingValue !== null
    )
    const overallScore = ratingResponses.length > 0
      ? Math.round((ratingResponses.reduce((sum, r) => sum + (r.ratingValue || 0), 0) / ratingResponses.length) * 100) / 100
      : undefined

    // Обновляем статус цикла на COMPLETED
    const updatedCycle = await prisma.feedbackCycle.update({
      where: { id },
      data: { 
        status: 'COMPLETED',
        updatedAt: new Date()
      }
    })

    // Формируем URL результатов
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const resultsUrl = `${baseUrl}/results/${cycle.id}?viewer=${cycle.subject.id}`
    const adminUrl = `${baseUrl}/cycles`

    // Используем сервисы уведомлений

    // Отправляем уведомление оцениваемому сотруднику
    try {
      // Email уведомление
      await emailService.sendCycleCompletedEmail(
        cycle.subject.email,
        `${cycle.subject.firstName} ${cycle.subject.lastName}`,
        cycle.name,
        resultsUrl,
        overallScore
      )

      // Mattermost уведомление
      await mattermostService.sendCycleCompletedNotification(
        cycle.subject.email,
        cycle.name,
        completionRate
      )

      // Создаем уведомление в БД
      await prisma.notification.create({
        data: {
          type: 'CYCLE_COMPLETED',
          title: 'Завершен цикл 360° оценки',
          message: `Ваш цикл оценки "${cycle.name}" завершен. Результаты доступны для просмотра.`,
          userId: cycle.subject.id,
          cycleId: cycle.id,
          sentToMattermost: true,
        }
      })

      console.log(`Уведомления отправлены оцениваемому: ${cycle.subject.email}`)
    } catch (error) {
      console.error('Ошибка отправки уведомлений оцениваемому:', error)
    }

    // Отправляем уведомления руководителю (если есть)
    if (cycle.subject.manager) {
      try {
        const managerResultsUrl = `${baseUrl}/results/${cycle.id}?viewer=${cycle.subject.manager.id}`
        
        await emailService.sendCycleCompletedEmail(
          cycle.subject.manager.email,
          `${cycle.subject.manager.firstName} ${cycle.subject.manager.lastName}`,
          cycle.name,
          managerResultsUrl,
          overallScore
        )

        await mattermostService.sendCycleCompletedNotification(
          cycle.subject.manager.email,
          cycle.name,
          completionRate
        )

        await prisma.notification.create({
          data: {
            type: 'CYCLE_COMPLETED',
            title: 'Завершен цикл 360° оценки подчиненного',
            message: `Цикл оценки "${cycle.name}" для ${cycle.subject.firstName} ${cycle.subject.lastName} завершен.`,
            userId: cycle.subject.manager.id,
            cycleId: cycle.id,
            sentToMattermost: true,
          }
        })

        console.log(`Уведомления отправлены руководителю: ${cycle.subject.manager.email}`)
      } catch (error) {
        console.error('Ошибка отправки уведомлений руководителю:', error)
      }
    }

    // Отправляем уведомления всем администраторам
    const admins = await prisma.user.findMany({
      where: { isAdmin: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      }
    })

    for (const admin of admins) {
      try {
        await emailService.sendAdminCycleCompletedEmail(
          admin.email,
          cycle.name,
          `${cycle.subject.firstName} ${cycle.subject.lastName}`,
          Math.round(completionRate),
          adminUrl
        )

        await mattermostService.sendCycleCompletedNotification(
          admin.email,
          cycle.name,
          completionRate
        )

        await prisma.notification.create({
          data: {
            type: 'CYCLE_COMPLETED',
            title: '[Админ] Завершен цикл 360° оценки',
            message: `Цикл оценки "${cycle.name}" для ${cycle.subject.firstName} ${cycle.subject.lastName} завершен (${Math.round(completionRate)}%).`,
            userId: admin.id,
            cycleId: cycle.id,
            sentToMattermost: true,
          }
        })

        console.log(`Admin уведомления отправлены: ${admin.email}`)
      } catch (error) {
        console.error(`Ошибка отправки admin уведомлений ${admin.email}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Цикл оценки успешно завершен. Уведомления отправлены.',
      cycle: {
        id: updatedCycle.id,
        name: updatedCycle.name,
        status: updatedCycle.status,
        completionRate: Math.round(completionRate),
        overallScore,
        resultsUrl
      },
      notifications: {
        subjectNotified: true,
        managerNotified: !!cycle.subject.manager,
        adminsNotified: admins.length
      }
    })

  } catch (error) {
    console.error('Error completing cycle:', error)
    return NextResponse.json(
      { error: 'Failed to complete cycle' },
      { status: 500 }
    )
  }
} 