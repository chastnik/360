import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Начинаем заполнение базы данных...')

  // Создаем категории вопросов
  const categories = await Promise.all([
    prisma.questionCategory.create({
      data: {
        name: 'Лидерство',
        description: 'Оценка лидерских качеств и способности направлять команду',
        order: 1,
      },
    }),
    prisma.questionCategory.create({
      data: {
        name: 'Коммуникация',
        description: 'Навыки общения и передачи информации',
        order: 2,
      },
    }),
    prisma.questionCategory.create({
      data: {
        name: 'Командная работа',
        description: 'Способность работать в команде и сотрудничать',
        order: 3,
      },
    }),
    prisma.questionCategory.create({
      data: {
        name: 'Решение проблем',
        description: 'Аналитические навыки и способность решать сложные задачи',
        order: 4,
      },
    }),
    prisma.questionCategory.create({
      data: {
        name: 'Профессиональное развитие',
        description: 'Стремление к росту и развитию компетенций',
        order: 5,
      },
    }),
    prisma.questionCategory.create({
      data: {
        name: 'Результативность',
        description: 'Достижение целей и качество выполнения задач',
        order: 6,
      },
    }),
    prisma.questionCategory.create({
      data: {
        name: 'Адаптивность',
        description: 'Способность адаптироваться к изменениям',
        order: 7,
      },
    }),
  ])

  // Создаем вопросы по категориям
  const questions = []

  // Лидерство
  const leadershipQuestions = [
    'Насколько эффективно сотрудник принимает решения под давлением?',
    'Как хорошо сотрудник мотивирует и вдохновляет команду?',
    'Насколько четко сотрудник делегирует задачи и ответственность?',
    'Как эффективно сотрудник разрешает конфликты в команде?',
    'Насколько хорошо сотрудник подает пример другим?',
    'Опишите конкретную ситуацию, когда сотрудник проявил лидерские качества.',
    'Какие области лидерства сотруднику стоит развивать?',
  ]

  for (let i = 0; i < leadershipQuestions.length; i++) {
    const isTextQuestion = i >= 5 // Последние 2 вопроса - текстовые
    questions.push(
      prisma.question.create({
        data: {
          text: leadershipQuestions[i],
          type: isTextQuestion ? "TEXT" : "RATING",
          categoryId: categories[0].id,
          order: i + 1,
          ratingScale: 5,
        },
      })
    )
  }

  // Коммуникация
  const communicationQuestions = [
    'Насколько ясно и понятно сотрудник выражает свои мысли?',
    'Как эффективно сотрудник слушает и понимает точки зрения других?',
    'Насколько хорошо сотрудник адаптирует стиль общения к аудитории?',
    'Как эффективно сотрудник предоставляет обратную связь?',
    'Насколько открыт сотрудник к получению критики?',
    'Приведите пример эффективной коммуникации этого сотрудника.',
    'В каких аспектах коммуникации сотруднику стоит улучшиться?',
  ]

  for (let i = 0; i < communicationQuestions.length; i++) {
    const isTextQuestion = i >= 5
    questions.push(
      prisma.question.create({
        data: {
          text: communicationQuestions[i],
          type: isTextQuestion ? "TEXT" : "RATING",
          categoryId: categories[1].id,
          order: i + 1,
          ratingScale: 5,
        },
      })
    )
  }

  // Командная работа
  const teamworkQuestions = [
    'Насколько хорошо сотрудник сотрудничает с коллегами?',
    'Как эффективно сотрудник поддерживает инициативы команды?',
    'Насколько готов сотрудник помочь коллегам при необходимости?',
    'Как хорошо сотрудник учитывает мнения других при принятии решений?',
    'Насколько позитивно сотрудник влияет на атмосферу в команде?',
    'Опишите, как сотрудник способствует успеху команды.',
    'Что может улучшить в командной работе этот сотрудник?',
  ]

  for (let i = 0; i < teamworkQuestions.length; i++) {
    const isTextQuestion = i >= 5
    questions.push(
      prisma.question.create({
        data: {
          text: teamworkQuestions[i],
          type: isTextQuestion ? "TEXT" : "RATING",
          categoryId: categories[2].id,
          order: i + 1,
          ratingScale: 5,
        },
      })
    )
  }

  // Решение проблем
  const problemSolvingQuestions = [
    'Насколько творчески сотрудник подходит к решению проблем?',
    'Как эффективно сотрудник анализирует сложные ситуации?',
    'Насколько хорошо сотрудник предвидит потенциальные проблемы?',
    'Как быстро сотрудник находит решения в критических ситуациях?',
    'Насколько эффективно сотрудник использует ресурсы для решения задач?',
    'Приведите пример инновационного решения этого сотрудника.',
    'В каких аспектах решения проблем сотруднику стоит развиваться?',
  ]

  for (let i = 0; i < problemSolvingQuestions.length; i++) {
    const isTextQuestion = i >= 5
    questions.push(
      prisma.question.create({
        data: {
          text: problemSolvingQuestions[i],
          type: isTextQuestion ? "TEXT" : "RATING",
          categoryId: categories[3].id,
          order: i + 1,
          ratingScale: 5,
        },
      })
    )
  }

  // Профессиональное развитие
  const developmentQuestions = [
    'Насколько активно сотрудник ищет возможности для обучения?',
    'Как хорошо сотрудник применяет новые знания на практике?',
    'Насколько открыт сотрудник к обратной связи и самосовершенствованию?',
    'Как эффективно сотрудник делится знаниями с коллегами?',
    'Насколько инициативен сотрудник в развитии своих навыков?',
    'Опишите, как сотрудник развивался за последний год.',
    'Какие области развития вы бы порекомендовали этому сотруднику?',
  ]

  for (let i = 0; i < developmentQuestions.length; i++) {
    const isTextQuestion = i >= 5
    questions.push(
      prisma.question.create({
        data: {
          text: developmentQuestions[i],
          type: isTextQuestion ? "TEXT" : "RATING",
          categoryId: categories[4].id,
          order: i + 1,
          ratingScale: 5,
        },
      })
    )
  }

  // Результативность
  const performanceQuestions = [
    'Насколько стабильно сотрудник достигает поставленных целей?',
    'Как хорошо сотрудник управляет своим временем и приоритетами?',
    'Насколько высокое качество работы демонстрирует сотрудник?',
    'Как эффективно сотрудник работает с дедлайнами?',
    'Насколько надежен сотрудник в выполнении обязательств?',
    'Приведите пример выдающегося достижения этого сотрудника.',
    'В каких аспектах производительности сотруднику стоит улучшиться?',
  ]

  for (let i = 0; i < performanceQuestions.length; i++) {
    const isTextQuestion = i >= 5
    questions.push(
      prisma.question.create({
        data: {
          text: performanceQuestions[i],
          type: isTextQuestion ? "TEXT" : "RATING",
          categoryId: categories[5].id,
          order: i + 1,
          ratingScale: 5,
        },
      })
    )
  }

  // Адаптивность
  const adaptabilityQuestions = [
    'Насколько хорошо сотрудник адаптируется к изменениям?',
    'Как эффективно сотрудник работает в условиях неопределенности?',
    'Насколько гибко сотрудник подходит к новым задачам?',
    'Как хорошо сотрудник принимает изменения в процессах?',
    'Насколько позитивно сотрудник относится к нововведениям?',
    'Опишите, как сотрудник справлялся с серьезными изменениями.',
    'Что поможет сотруднику лучше адаптироваться к будущим изменениям?',
  ]

  for (let i = 0; i < adaptabilityQuestions.length; i++) {
    const isTextQuestion = i >= 5
    questions.push(
      prisma.question.create({
        data: {
          text: adaptabilityQuestions[i],
          type: isTextQuestion ? "TEXT" : "RATING",
          categoryId: categories[6].id,
          order: i + 1,
          ratingScale: 5,
        },
      })
    )
  }

  // Выполняем все запросы на создание вопросов
  await Promise.all(questions)

  // Создаем тестового администратора
  await prisma.user.create({
    data: {
      email: 'admin@company.com',
      firstName: 'Администратор',
      lastName: 'Системы',
      displayName: 'Системный администратор',
      department: 'IT',
      position: 'Системный администратор',
      isAdmin: true,
    },
  })

  console.log('База данных успешно заполнена!')
  console.log(`Создано категорий: ${categories.length}`)
  console.log(`Создано вопросов: ${questions.length}`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  }) 