// © 2025 Бит.Цифра - Стас Чашин

// Автор: Стас Чашин @chastnik
/* eslint-disable no-console */
import axios from 'axios';

export interface LlmCategorySummary {
  category: string;
  avgScore: number;
}

export interface LlmResponseItem {
  category: string;
  question: string;
  score?: number;
  comment?: string | null;
}

export interface LlmCourse {
  name: string;
  description: string | null;
}

export interface LlmCompetency {
  name: string;
  level: 'junior' | 'middle' | 'senior';
  score: number;
  source: 'training' | 'manual';
}

export async function generateEmployeeRecommendations(params: {
  employeeFullName: string;
  cycleName: string;
  overallAverage: number;
  categories: LlmCategorySummary[];
  responses: LlmResponseItem[];
  courses?: LlmCourse[];
  resume?: string | null;
  competencies?: LlmCompetency[];
}): Promise<string> {
  const baseUrl = process.env.LLM_BASE_URL;
  const token = process.env.LLM_PROXY_TOKEN;
  const model = process.env.LLM_MODEL || 'qwen2.5:14b';

  if (!baseUrl || !token) {
    throw new Error('LLM не сконфигурирован (LLM_BASE_URL/LLM_PROXY_TOKEN)');
  }

  // Формируем компактный промпт для qwen3:14b
  const systemPrompt = [
    'Ты HR-эксперт по развитию персонала.',
    'Проанализируй результаты 360-градусной оценки и дай персональные рекомендации на русском языке.',
    'Учитывай числовые оценки по категориям и текстовые комментарии респондентов.',
    'При формировании рекомендаций обязательно учитывай:',
    '- Резюме сотрудника (если указано) - опыт работы, навыки, образование',
    '- Текущие компетенции сотрудника (полученные через обучение или введенные вручную)',
    '- Доступные курсы обучения и предлагай конкретные курсы, которые помогут сотруднику развить выявленные зоны роста.',
    '',
    'Формат ответа (строго без лишних заголовков):',
    '',
    '## Краткий анализ',
    '2-3 предложения о текущем уровне развития сотрудника.',
    '',
    '## Сильные стороны',
    '- Конкретные компетенции с высокими оценками',
    '- На что опираться в развитии',
    '',
    '## Зоны роста',
    '- Области с низкими оценками',
    '- Что требует первоочередного внимания',
    '',
    '## План развития (4-6 недель)',
    '- [ ] Конкретное действие с измеримым результатом',
    '- [ ] Следующий шаг с дедлайном',
    '- [ ] И так далее (5-8 пунктов)',
    '',
    'При формировании плана развития обязательно ссылайся на конкретные доступные курсы обучения, если они релевантны выявленным зонам роста.',
  ].join('\n');

  // Сокращаем данные для экономии токенов
  const compactCategories = params.categories.map(c => `${c.category}: ${c.avgScore.toFixed(1)}`).join(', ');
  const sampleComments = params.responses
    .filter(r => r.comment && r.comment.trim().length > 10)
    .slice(0, 15)
    .map(r => `${r.category}: "${r.comment}"`)
    .join('\n');

  // Формируем информацию о резюме
  let resumeInfo = '';
  if (params.resume && params.resume.trim()) {
    // Удаляем HTML теги из резюме для более компактного представления
    const resumeText = params.resume
      .replace(/<[^>]+>/g, ' ') // Удаляем HTML теги
      .replace(/\s+/g, ' ') // Удаляем лишние пробелы
      .trim()
      .substring(0, 2000); // Ограничиваем длину для экономии токенов
    resumeInfo = [
      '',
      'Резюме сотрудника:',
      resumeText,
    ].join('\n');
  }

  // Формируем информацию о компетенциях
  let competenciesInfo = '';
  if (params.competencies && params.competencies.length > 0) {
    const competenciesList = params.competencies
      .map(c => {
        const sourceLabel = c.source === 'manual' ? ' (введено вручную)' : ' (получено через обучение)';
        const levelLabel = c.level === 'junior' ? 'Начальный' : c.level === 'middle' ? 'Средний' : 'Продвинутый';
        return `- ${c.name}: ${levelLabel} (${c.score}/100)${sourceLabel}`;
      })
      .join('\n');
    competenciesInfo = [
      '',
      'Текущие компетенции сотрудника:',
      competenciesList,
    ].join('\n');
  }

  // Формируем информацию о курсах
  let coursesInfo = '';
  if (params.courses && params.courses.length > 0) {
    const coursesList = params.courses
      .map(c => {
        const desc = c.description ? ` (${c.description})` : '';
        return `- ${c.name}${desc}`;
      })
      .join('\n');
    coursesInfo = [
      '',
      'Доступные курсы обучения:',
      coursesList,
    ].join('\n');
  } else {
    coursesInfo = '\nДоступные курсы обучения: курсы не найдены';
  }

  const userContent = [
    `Сотрудник: ${params.employeeFullName}`,
    `Цикл: ${params.cycleName}`,
    `Общий балл: ${params.overallAverage.toFixed(1)}/5.0`,
    resumeInfo,
    competenciesInfo,
    '',
    `Оценки по категориям: ${compactCategories}`,
    '',
    'Ключевые комментарии:',
    sampleComments || 'Комментарии отсутствуют',
    coursesInfo,
  ].join('\n');

  const url = `${baseUrl.replace(/\/$/, '')}/api/chat`;

  const payload = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    stream: false,
  };

  const headers = {
    'Content-Type': 'application/json',
    'X-PROXY-AUTH': token,
  };

  try {
    console.log(`🤖 Генерация рекомендаций для ${params.employeeFullName} через ${model}`);
    console.log(`🔗 URL: ${url}`);
    console.log(`🔑 Используем X-PROXY-AUTH: ${token.substring(0, 8)}...`);
    
    const response = await axios.post(url, payload, { 
      headers, 
      timeout: 90000,
      validateStatus: (status) => status < 500, // не бросаем ошибку на 4xx
      maxRedirects: 5,
      decompress: true,
    });

    // Выводим полный ответ для диагностики
    console.log(`📊 HTTP Status: ${response.status}`);
    console.log(`📋 Response Headers:`, JSON.stringify(response.headers, null, 2));
    console.log(`📄 Response Data:`, JSON.stringify(response.data, null, 2));

    if (response.status === 403) {
      const errorDetails = response.data?.error || response.data;
      throw new Error(`Доступ запрещён к модели qwen3:14b. Детали: ${JSON.stringify(errorDetails)}`);
    }

    if (response.status === 401) {
      const errorDetails = response.data?.error || response.data;
      throw new Error(`Ошибка авторизации. Детали: ${JSON.stringify(errorDetails)}`);
    }

    if (response.status >= 400) {
      const errorMsg = response.data?.error?.message || response.data?.message || JSON.stringify(response.data) || `HTTP ${response.status}`;
      throw new Error(`LLM API error: ${errorMsg}`);
    }

    let content = response.data?.message?.content?.trim();
    
    if (!content) {
      console.error('Пустой ответ от LLM:', JSON.stringify(response.data, null, 2));
      throw new Error('LLM вернул пустой ответ');
    }

    // Удаляем блоки <think></think> из ответа
    content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    
    // Удаляем лишние переносы строк
    content = content.replace(/\n{3,}/g, '\n\n');

    console.log(`✅ Рекомендации сгенерированы (${content.length} символов)`);
    return content;

  } catch (error: any) {
    console.error('❌ Ошибка генерации рекомендаций:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Не удается подключиться к LLM API. Проверьте LLM_BASE_URL');
    }
    
    if (error.code === 'ETIMEDOUT') {
      throw new Error('Таймаут запроса к LLM API. Попробуйте позже');
    }

    throw error;
  }
}

export default { generateEmployeeRecommendations };


