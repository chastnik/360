import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId')

    let questions
    if (categoryId) {
      // Получаем вопросы конкретной категории
      questions = await prisma.question.findMany({
        where: { categoryId },
        include: {
          category: {
            select: {
              id: true,
              name: true,
            }
          }
        },
        orderBy: { order: 'asc' }
      })
    } else {
      // Получаем все вопросы
      questions = await prisma.question.findMany({
        include: {
          category: {
            select: {
              id: true,
              name: true,
            }
          }
        },
        orderBy: [
          { category: { order: 'asc' } },
          { order: 'asc' }
        ]
      })
    }

    return NextResponse.json({ questions })
  } catch (error) {
    console.error('Error fetching questions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch questions' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { text, type, categoryId, order, isRequired, ratingScale } = body

    if (!text || !categoryId) {
      return NextResponse.json(
        { error: 'Text and categoryId are required' },
        { status: 400 }
      )
    }

    // Если порядок не указан, ставим в конец
    let finalOrder = order
    if (!finalOrder) {
      const lastQuestion = await prisma.question.findFirst({
        where: { categoryId },
        orderBy: { order: 'desc' }
      })
      finalOrder = (lastQuestion?.order || 0) + 1
    }

    const question = await prisma.question.create({
      data: {
        text,
        type: type || 'RATING',
        categoryId,
        order: finalOrder,
        isRequired: isRequired !== undefined ? isRequired : true,
        ratingScale: ratingScale || 5,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    })

    return NextResponse.json({ question }, { status: 201 })
  } catch (error) {
    console.error('Error creating question:', error)
    return NextResponse.json(
      { error: 'Failed to create question' },
      { status: 500 }
    )
  }
} 