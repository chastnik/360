// Автор: Стас Чашин @chastnik
import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import api, { reportsAPI } from '../services/api';
import { CategoryBarChart, CategoryRadarChart, OverallScoreDisplay, ScoreDistributionChart } from '../components/ReportCharts';

export const EmployeeAnalyticsPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const [searchParams] = useSearchParams();
  const cycleId = searchParams.get('cycleId') || undefined;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [aiText, setAiText] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  // Фильтры и сортировка для списка ответов
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [scoreFilter, setScoreFilter] = useState<string>('');
  const [respondentQuery, setRespondentQuery] = useState<string>('');
  const [questionQuery, setQuestionQuery] = useState<string>('');
  const [sortKey, setSortKey] = useState<'category' | 'score' | 'respondent' | 'question'>('category');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/reports/user/${userId}/analytics`, { params: { cycleId } });
        setData(res.data);
        // Параллельно подтягиваем сохранённые рекомендации
        if (userId) {
          const rec = await reportsAPI.getEmployeeRecommendations(userId, cycleId);
          if ((rec as any)?.recommendations) setAiText((rec as any).recommendations as string);
        }
        setError(null);
      } catch (e: any) {
        console.error(e);
        setError('Не удалось загрузить аналитику сотрудника');
      } finally {
        setLoading(false);
      }
    };
    if (userId) load();
  }, [userId, cycleId]);

  const categoryAverages = Array.isArray(data?.avgScores)
    ? data.avgScores.map((item: any, idx: number) => ({ id: idx, name: item.category, color: item.color, average: item.avgScore, count: 0 }))
    : [];

  const distribution = (() => {
    const init: any = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    if (Array.isArray(data?.scoreDistribution)) {
      for (const d of data.scoreDistribution) { const s = Number(d.score); if (init[s] !== undefined) init[s] = Number(d.count || 0); }
    }
    return init;
  })();

  const uniqueCategories: string[] = useMemo(() => {
    const set = new Set<string>();
    if (Array.isArray(data?.responses)) {
      for (const r of data.responses) {
        if (r?.category) set.add(r.category);
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [data]);

  const visibleResponses = useMemo(() => {
    let items: any[] = Array.isArray(data?.responses) ? [...data.responses] : [];
    if (categoryFilter) items = items.filter(r => (r.category || '') === categoryFilter);
    if (scoreFilter) {
      const sf = Number(scoreFilter);
      items = items.filter(r => Number(r.score) === sf);
    }
    if (respondentQuery.trim()) {
      const q = respondentQuery.toLowerCase();
      items = items.filter(r => (r.respondent || '').toLowerCase().includes(q));
    }
    if (questionQuery.trim()) {
      const q = questionQuery.toLowerCase();
      items = items.filter(r => (r.question || '').toLowerCase().includes(q));
    }
    items.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'category':
          cmp = String(a.category || '').localeCompare(String(b.category || ''));
          break;
        case 'respondent':
          cmp = String(a.respondent || '').localeCompare(String(b.respondent || ''));
          break;
        case 'question':
          cmp = String(a.question || '').localeCompare(String(b.question || ''));
          break;
        case 'score':
          cmp = Number(a.score || 0) - Number(b.score || 0);
          break;
        default:
          cmp = 0;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return items;
  }, [data, categoryFilter, scoreFilter, respondentQuery, questionQuery, sortKey, sortDir]);

  

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>;
  }

  

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Аналитика сотрудника</h1>
        {data?.cycle && (
          <p className="text-gray-600 dark:text-gray-300">Цикл: {data.cycle.name}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <OverallScoreDisplay score={Number(data?.overallAverage || 0)} title="Общий средний балл" />
        <ScoreDistributionChart distribution={distribution} title="Распределение оценок" />
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Статистика</h3>
          <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <div>Ответов: {Array.isArray(data?.responses) ? data.responses.length : 0}</div>
            <div>Категорий: {categoryAverages.length}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoryBarChart data={categoryAverages} title="Средние оценки по категориям" />
        <CategoryRadarChart data={categoryAverages} title="Профиль компетенций" />
      </div>

      {/* AI рекомендации — перед блоком ответов */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">AI рекомендации</h3>
          <button
            onClick={async () => {
              if (!userId) return;
                                        try {
                            setAiLoading(true);
                            const res = await reportsAPI.generateEmployeeRecommendations(userId, cycleId || undefined);
                            console.log('🔍 Ответ от API:', res);
                            if ('recommendations' in res && res.recommendations) {
                              setAiText(res.recommendations);
                            } else {
                              // Фолбэк: пробуем подтянуть сохранённые рекомендации, если генерация вернула ошибку
                              const cached = await reportsAPI.getEmployeeRecommendations(userId, cycleId || undefined);
                              if ('recommendations' in cached && cached.recommendations) {
                                setAiText(cached.recommendations);
                              } else if ('error' in res) {
                                console.error('Ошибка генерации:', (res as any).error);
                                alert('Ошибка генерации рекомендаций: ' + (res as any).error);
                              } else {
                                console.error('Неожиданный ответ:', res);
                                alert('Неожиданный ответ от сервера');
                              }
                            }
                          } catch (e) {
                            console.error('Ошибка запроса:', e);
                            alert('Не удалось сгенерировать рекомендации');
                          } finally {
                            setAiLoading(false);
                          }
            }}
            className="px-3 py-2 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded disabled:opacity-50"
            disabled={aiLoading}
          >
            {aiLoading ? 'Генерация…' : (aiText ? 'Перегенерировать' : 'Сгенерировать')}
          </button>
        </div>
        {aiText ? (
          <div className="markdown-body leading-7" style={{ color: '#F3F4F6' }}>
            <ReactMarkdown
              components={{
                h1: ({node, ...props}) => <h1 className="text-2xl font-bold mb-3" style={{ color: '#FFFFFF' }} {...props} />,
                h2: ({node, ...props}) => <h2 className="text-xl font-semibold mb-2" style={{ color: '#FFFFFF' }} {...props} />,
                h3: ({node, ...props}) => <h3 className="text-lg font-semibold mb-2" style={{ color: '#FFFFFF' }} {...props} />,
                p: ({node, ...props}) => <p className="mb-3 whitespace-pre-line" style={{ color: '#F3F4F6' }} {...props} />,
                ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-3" style={{ color: '#F3F4F6' }} {...props} />,
                ol: ({node, ...props}) => <ol className="list-decimal pl-6 mb-3" style={{ color: '#F3F4F6' }} {...props} />,
                li: ({node, ...props}) => <li className="mb-1" style={{ color: '#F3F4F6' }} {...props} />,
                a: ({node, ...props}) => <a className="underline" style={{ color: '#93C5FD' }} target="_blank" rel="noreferrer" {...props} />,
                strong: ({node, ...props}) => <strong style={{ color: '#FFFFFF' }} {...props} />,
                code: ({node, inline, ...props}: any) => inline
                  ? <code className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-pink-600 dark:text-pink-300" {...props} />
                  : <pre className="block w-full p-3 rounded bg-gray-100 dark:bg-gray-800 text-pink-600 dark:text-pink-300 overflow-auto"><code {...props} /></pre>,
              }}
            >
              {aiText}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="text-gray-500 dark:text-gray-400 text-sm">Рекомендации ещё не сформированы.</div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Ответы респондентов</h3>
        {/* Панель фильтров и сортировки */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Категория</label>
            <select value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)} className="w-full px-2 py-2 border rounded dark:bg-gray-700 dark:text-white">
              <option value="">Все</option>
              {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Оценка</label>
            <select value={scoreFilter} onChange={e=>setScoreFilter(e.target.value)} className="w-full px-2 py-2 border rounded dark:bg-gray-700 dark:text-white">
              <option value="">Все</option>
              {[1,2,3,4,5].map(s=> <option key={s} value={String(s)}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Респондент</label>
            <input value={respondentQuery} onChange={e=>setRespondentQuery(e.target.value)} placeholder="Поиск по ФИО" className="w-full px-2 py-2 border rounded dark:bg-gray-700 dark:text-white" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Вопрос</label>
            <input value={questionQuery} onChange={e=>setQuestionQuery(e.target.value)} placeholder="Поиск по тексту вопроса" className="w-full px-2 py-2 border rounded dark:bg-gray-700 dark:text-white" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Сортировка</label>
            <div className="flex gap-2">
              <select value={sortKey} onChange={e=>setSortKey(e.target.value as any)} className="flex-1 px-2 py-2 border rounded dark:bg-gray-700 dark:text-white">
                <option value="category">Категория</option>
                <option value="score">Оценка</option>
                <option value="respondent">Респондент</option>
                <option value="question">Вопрос</option>
              </select>
              <button onClick={()=> setSortDir(d=> d==='asc'?'desc':'asc')} className="px-3 py-2 border rounded dark:bg-gray-700 dark:text-white">
                {sortDir==='asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {visibleResponses.length > 0 ? visibleResponses.map((r: any, idx: number) => (
            <div key={idx} className="py-3">
              <div className="text-sm text-gray-500 dark:text-gray-400">Категория: {r.category}</div>
              <div className="font-medium text-gray-900 dark:text-white">{r.question}</div>
              {/* Приоритет: текст -> булево -> числовая оценка -> прочее */}
              {r.text ? (
                <div className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">Ответ: {r.text}{r.respondent ? ` • ${r.respondent}` : ''}{r.respondentType ? ` • ${r.respondentType}` : ''}</div>
              ) : (typeof r.bool === 'boolean' ? (
                <div className="text-sm text-gray-600 dark:text-gray-300">Ответ: {r.bool ? 'Да' : 'Нет'}{r.respondent ? ` • ${r.respondent}` : ''}{r.respondentType ? ` • ${r.respondentType}` : ''}</div>
              ) : (r.score != null ? (
                <div className="text-sm text-gray-600 dark:text-gray-300">Оценка: {r.score}{r.respondent ? ` • ${r.respondent}` : ''}{r.respondentType ? ` • ${r.respondentType}` : ''}</div>
              ) : (
                <div className="text-sm text-gray-600 dark:text-gray-300">Ответ: —{r.respondent ? ` • ${r.respondent}` : ''}{r.respondentType ? ` • ${r.respondentType}` : ''}</div>
              ))}
              {r.comment && (
                <div className="mt-1 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">Комментарий: {r.comment}</div>
              )}
            </div>
          )) : (
            <div className="text-gray-500 dark:text-gray-400">Нет ответов</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeAnalyticsPage;


