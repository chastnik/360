import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

interface FeedbackResult {
  questionId: string
  questionText: string
  questionType: string
  categoryName: string
  responses: {
    id: string
    ratingValue?: number
    textValue?: string
    reviewerName?: string // Только для админов и менеджеров
    reviewerRole: string
    isAnonymous: boolean
  }[]
  averageRating?: number
}

// Получить результаты цикла оценки
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const url = new URL(request.url)
    const viewerUserId = url.searchParams.get('viewer') // ID пользователя, который просматривает результаты

    if (!viewerUserId) {
      return NextResponse.json(
        { error: 'Viewer user ID is required' },
        { status: 400 }
      )
    }

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
                isAdmin: true,
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

    // Проверяем статус цикла
    if (cycle.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Cycle is not completed yet' },
        { status: 400 }
      )
    }

    // Получаем информацию о пользователе, который просматривает результаты
    const viewer = await prisma.user.findUnique({
      where: { id: viewerUserId },
      select: {
        id: true,
        isAdmin: true,
        managedEmployees: {
          select: {
            id: true
          }
        }
      }
    })

    if (!viewer) {
      return NextResponse.json(
        { error: 'Viewer not found' },
        { status: 404 }
      )
    }

    // Определяем права доступа
    const isAdmin = viewer.isAdmin
    const isManager = cycle.subject.manager?.id === viewer.id
    const isSubject = cycle.subject.id === viewer.id
    const canViewNonAnonymous = isAdmin || isManager

    // Проверяем права на просмотр результатов
    if (!isAdmin && !isManager && !isSubject) {
      return NextResponse.json(
        { error: 'Access denied. You are not authorized to view these results.' },
        { status: 403 }
      )
    }

    // Получаем все ответы для данного цикла
    const responses = await prisma.feedbackResponse.findMany({
      where: { cycleId: id },
      include: {
        question: {
          include: {
            category: {
              select: {
                name: true,
                order: true
              }
            }
          }
        },
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        }
      },
      orderBy: [
        { question: { category: { order: 'asc' } } },
        { question: { order: 'asc' } }
      ]
    })

    // Получаем информацию о ролях участников
    const participantRoles = new Map()
    cycle.participants.forEach(participant => {
      participantRoles.set(participant.userId, participant.role)
    })

    // Группируем ответы по вопросам
    const questionResults: { [questionId: string]: FeedbackResult } = {}

    responses.forEach(response => {
      const questionId = response.questionId
      
      if (!questionResults[questionId]) {
        questionResults[questionId] = {
          questionId,
          questionText: response.question.text,
          questionType: response.question.type,
          categoryName: response.question.category.name,
          responses: [],
          averageRating: undefined
        }
      }

      const reviewerRole = participantRoles.get(response.reviewerId) || 'UNKNOWN'
      const reviewerName = canViewNonAnonymous 
        ? `${response.reviewer.firstName} ${response.reviewer.lastName}`
        : undefined

      questionResults[questionId].responses.push({
        id: response.id,
        ratingValue: response.ratingValue,
        textValue: response.textValue,
        reviewerName,
        reviewerRole,
        isAnonymous: !canViewNonAnonymous
      })
    })

    // Вычисляем средние оценки для вопросов с рейтингами
    Object.values(questionResults).forEach(result => {
      const ratingResponses = result.responses.filter(r => r.ratingValue !== null)
      if (ratingResponses.length > 0) {
        const sum = ratingResponses.reduce((acc, r) => acc + (r.ratingValue || 0), 0)
        result.averageRating = Math.round((sum / ratingResponses.length) * 100) / 100
      }
    })

    // Группируем результаты по категориям
    const categorizedResults: { [categoryName: string]: FeedbackResult[] } = {}
    Object.values(questionResults).forEach(result => {
      if (!categorizedResults[result.categoryName]) {
        categorizedResults[result.categoryName] = []
      }
      categorizedResults[result.categoryName].push(result)
    })

    // Вычисляем общую статистику
    const totalParticipants = cycle.participants.length
    const totalResponses = responses.length
    const uniqueRespondents = new Set(responses.map(r => r.reviewerId)).size
    const completionRate = totalParticipants > 0 ? (uniqueRespondents / totalParticipants) * 100 : 0

    // Средние оценки по категориям
    const categoryAverages: { [categoryName: string]: number } = {}
    Object.entries(categorizedResults).forEach(([categoryName, questions]) => {
      const categoryRatings = questions
        .filter(q => q.averageRating !== undefined)
        .map(q => q.averageRating!) 
      
      if (categoryRatings.length > 0) {
        const sum = categoryRatings.reduce((acc, rating) => acc + rating, 0)
        categoryAverages[categoryName] = Math.round((sum / categoryRatings.length) * 100) / 100
      }
    })

    // Общий средний балл
    const overallRatings = Object.values(questionResults)
      .filter(q => q.averageRating !== undefined)
      .map(q => q.averageRating!)
    
    const overallAverage = overallRatings.length > 0
      ? Math.round((overallRatings.reduce((acc, rating) => acc + rating, 0) / overallRatings.length) * 100) / 100
      : 0

    return NextResponse.json({
      cycle: {
        id: cycle.id,
        name: cycle.name,
        description: cycle.description,
        startDate: cycle.startDate,
        endDate: cycle.endDate,
        status: cycle.status,
        subject: {
          name: `${cycle.subject.firstName} ${cycle.subject.lastName}`,
          department: cycle.subject.department,
          position: cycle.subject.position,
          email: cycle.subject.email
        }
      },
      statistics: {
        totalParticipants,
        totalResponses,
        uniqueRespondents,
        completionRate: Math.round(completionRate),
        overallAverage,
        categoryAverages
      },
      results: categorizedResults,
      permissions: {
        canViewNonAnonymous,
        isSubject,
        isManager,
        isAdmin
      }
    })

  } catch (error) {
    console.error('Error fetching cycle results:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cycle results' },
      { status: 500 }
    )
  }
} 