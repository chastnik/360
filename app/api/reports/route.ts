import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get('type') || 'overview'

    switch (reportType) {
      case 'overview':
        return await getOverviewReport()
      case 'departments':
        return await getDepartmentReport()
      case 'cycles':
        return await getCyclesReport()
      case 'responses':
        return await getResponsesReport()
      case 'categories':
        return await getCategoriesReport()
      default:
        return await getOverviewReport()
    }
  } catch (error) {
    console.error('Error generating report:', error)
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    )
  }
}

// Общий обзор системы
async function getOverviewReport() {
  const [
    totalUsers,
    activeUsers,
    totalCycles,
    activeCycles,
    completedCycles,
    totalResponses,
    totalCategories,
    totalQuestions,
    departmentStats,
    recentCycles
  ] = await Promise.all([
    // Общая статистика пользователей
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    
    // Статистика циклов
    prisma.feedbackCycle.count(),
    prisma.feedbackCycle.count({ where: { status: 'ACTIVE' } }),
    prisma.feedbackCycle.count({ where: { status: 'COMPLETED' } }),
    
    // Статистика ответов
    prisma.feedbackResponse.count(),
    
    // Статистика вопросов
    prisma.questionCategory.count(),
    prisma.question.count(),
    
    // Статистика по отделам
    prisma.user.groupBy({
      by: ['department'],
      _count: { id: true },
      where: { 
        department: { not: null },
        isActive: true 
      }
    }),
    
    // Последние циклы
    prisma.feedbackCycle.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        subject: {
          select: {
            firstName: true,
            lastName: true,
            department: true
          }
        },
        _count: {
          select: {
            participants: true,
            responses: true
          }
        }
      }
    })
  ])

  return NextResponse.json({
    overview: {
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: totalUsers - activeUsers
      },
      cycles: {
        total: totalCycles,
        active: activeCycles,
        completed: completedCycles,
        planned: totalCycles - activeCycles - completedCycles
      },
      responses: {
        total: totalResponses
      },
      system: {
        categories: totalCategories,
        questions: totalQuestions
      }
    },
    departments: departmentStats.map(dept => ({
      name: dept.department || 'Не указан',
      count: dept._count.id
    })),
    recentCycles: recentCycles.map(cycle => ({
      id: cycle.id,
      name: cycle.name,
      subject: `${cycle.subject.firstName} ${cycle.subject.lastName}`,
      department: cycle.subject.department,
      status: cycle.status,
      participants: cycle._count.participants,
      responses: cycle._count.responses,
      createdAt: cycle.createdAt
    }))
  })
}

// Отчет по отделам
async function getDepartmentReport() {
  const departmentStats = await prisma.user.groupBy({
    by: ['department'],
    _count: { id: true },
    where: { 
      department: { not: null },
      isActive: true 
    }
  })

  const departmentCycles = await prisma.feedbackCycle.findMany({
    include: {
      subject: {
        select: {
          department: true
        }
      }
    }
  })

  // Группируем циклы по отделам
  const cyclesByDepartment = departmentCycles.reduce((acc, cycle) => {
    const dept = cycle.subject.department || 'Не указан'
    if (!acc[dept]) {
      acc[dept] = { total: 0, active: 0, completed: 0 }
    }
    acc[dept].total++
    if (cycle.status === 'ACTIVE') acc[dept].active++
    if (cycle.status === 'COMPLETED') acc[dept].completed++
    return acc
  }, {} as Record<string, { total: number, active: number, completed: number }>)

  const report = departmentStats.map(dept => ({
    name: dept.department || 'Не указан',
    users: dept._count.id,
    cycles: cyclesByDepartment[dept.department || 'Не указан'] || { total: 0, active: 0, completed: 0 }
  }))

  return NextResponse.json({ departments: report })
}

// Отчет по циклам
async function getCyclesReport() {
  const cycles = await prisma.feedbackCycle.findMany({
    include: {
      subject: {
        select: {
          firstName: true,
          lastName: true,
          department: true,
          position: true
        }
      },
      participants: {
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        }
      },
      _count: {
        select: {
          responses: true,
          participants: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  const cyclesReport = cycles.map(cycle => {
    const completedParticipants = cycle.participants.filter(p => p.isCompleted).length
    const totalParticipants = cycle.participants.length
    const completionRate = totalParticipants > 0 ? (completedParticipants / totalParticipants) * 100 : 0

    return {
      id: cycle.id,
      name: cycle.name,
      subject: {
        name: `${cycle.subject.firstName} ${cycle.subject.lastName}`,
        department: cycle.subject.department,
        position: cycle.subject.position
      },
      status: cycle.status,
      startDate: cycle.startDate,
      endDate: cycle.endDate,
      participants: {
        total: totalParticipants,
        completed: completedParticipants,
        completionRate: Math.round(completionRate)
      },
      responses: cycle._count.responses,
      createdAt: cycle.createdAt
    }
  })

  return NextResponse.json({ cycles: cyclesReport })
}

// Отчет по ответам
async function getResponsesReport() {
  const [
    totalResponses,
    ratingResponses,
    textResponses,
    avgRatings,
    responsesByCategory
  ] = await Promise.all([
    prisma.feedbackResponse.count(),
    prisma.feedbackResponse.count({ where: { ratingValue: { not: null } } }),
    prisma.feedbackResponse.count({ where: { textValue: { not: null } } }),
    
    // Средние оценки по категориям
    prisma.feedbackResponse.groupBy({
      by: ['questionId'],
      _avg: { ratingValue: true },
      where: { ratingValue: { not: null } }
    }),
    
    // Ответы по категориям
    prisma.feedbackResponse.findMany({
      include: {
        question: {
          include: {
            category: true
          }
        }
      },
      where: { ratingValue: { not: null } }
    })
  ])

  // Группируем ответы по категориям
  const categoryStats = responsesByCategory.reduce((acc, response) => {
    const categoryName = response.question.category.name
    if (!acc[categoryName]) {
      acc[categoryName] = { responses: 0, totalRating: 0, avgRating: 0 }
    }
    acc[categoryName].responses++
    acc[categoryName].totalRating += response.ratingValue || 0
    return acc
  }, {} as Record<string, { responses: number, totalRating: number, avgRating: number }>)

  // Вычисляем средние оценки по категориям
  Object.keys(categoryStats).forEach(category => {
    const stats = categoryStats[category]
    stats.avgRating = stats.responses > 0 ? stats.totalRating / stats.responses : 0
  })

  return NextResponse.json({
    total: totalResponses,
    byType: {
      rating: ratingResponses,
      text: textResponses
    },
    categories: Object.keys(categoryStats).map(name => ({
      name,
      responses: categoryStats[name].responses,
      avgRating: Math.round(categoryStats[name].avgRating * 100) / 100
    }))
  })
}

// Отчет по категориям вопросов
async function getCategoriesReport() {
  const categories = await prisma.questionCategory.findMany({
    include: {
      questions: {
        include: {
          responses: {
            where: { ratingValue: { not: null } }
          }
        }
      }
    },
    orderBy: { order: 'asc' }
  })

  const categoryReport = categories.map(category => {
    const allResponses = category.questions.flatMap(q => q.responses)
    const avgRating = allResponses.length > 0 
      ? allResponses.reduce((sum, r) => sum + (r.ratingValue || 0), 0) / allResponses.length
      : 0

    return {
      id: category.id,
      name: category.name,
      description: category.description,
      questionsCount: category.questions.length,
      responsesCount: allResponses.length,
      avgRating: Math.round(avgRating * 100) / 100,
      questions: category.questions.map(question => ({
        id: question.id,
        text: question.text,
        type: question.type,
        responsesCount: question.responses.length,
        avgRating: question.responses.length > 0
          ? Math.round((question.responses.reduce((sum, r) => sum + (r.ratingValue || 0), 0) / question.responses.length) * 100) / 100
          : 0
      }))
    }
  })

  return NextResponse.json({ categories: categoryReport })
} 