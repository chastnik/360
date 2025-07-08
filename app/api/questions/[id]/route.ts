import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const question = await prisma.question.findUnique({
      where: { id: params.id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    })

    if (!question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ question })
  } catch (error) {
    console.error('Error fetching question:', error)
    return NextResponse.json(
      { error: 'Failed to fetch question' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const body = await request.json()
    const { text, type, order, isRequired, isActive, ratingScale } = body

    const question = await prisma.question.update({
      where: { id: params.id },
      data: {
        ...(text !== undefined && { text }),
        ...(type !== undefined && { type }),
        ...(order !== undefined && { order }),
        ...(isRequired !== undefined && { isRequired }),
        ...(isActive !== undefined && { isActive }),
        ...(ratingScale !== undefined && { ratingScale }),
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

    return NextResponse.json({ question })
  } catch (error) {
    console.error('Error updating question:', error)
    return NextResponse.json(
      { error: 'Failed to update question' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    // Проверяем, есть ли ответы на этот вопрос
    const responseCount = await prisma.feedbackResponse.count({
      where: { questionId: params.id }
    })

    if (responseCount > 0) {
      // Если есть ответы, деактивируем вопрос вместо удаления
      const question = await prisma.question.update({
        where: { id: params.id },
        data: { isActive: false },
        include: {
          category: {
            select: {
              id: true,
              name: true,
            }
          }
        }
      })
      
      return NextResponse.json({ 
        question, 
        message: 'Question deactivated due to existing responses' 
      })
    } else {
      // Если ответов нет, можно безопасно удалить
      await prisma.question.delete({
        where: { id: params.id }
      })
      
      return NextResponse.json({ 
        message: 'Question deleted successfully' 
      })
    }
  } catch (error) {
    console.error('Error deleting question:', error)
    return NextResponse.json(
      { error: 'Failed to delete question' },
      { status: 500 }
    )
  }
} 