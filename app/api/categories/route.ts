import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const categories = await prisma.questionCategory.findMany({
      include: {
        questions: {
          select: {
            id: true,
            text: true,
            type: true,
            order: true,
            isActive: true,
            isRequired: true,
            ratingScale: true,
          },
          orderBy: { order: 'asc' }
        }
      },
      orderBy: { order: 'asc' }
    })

    return NextResponse.json({ categories })
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    )
  }
} 