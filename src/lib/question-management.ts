import type { Question } from './model'
import { getQuestionType, questionLocation } from './model'

export interface QuestionFilters { grade: number; subject: string; type: string; enabled: string; semester: string; lesson: string; unit: string; search: string }
export const defaultQuestionFilters = (grade: number): QuestionFilters => ({ grade, subject: '全部', type: '全部', enabled: '全部', semester: '全部', lesson: '全部', unit: '全部', search: '' })
export function filterQuestions(questions: Question[], filters: QuestionFilters) {
  const needle = filters.search.trim().toLocaleLowerCase()
  return questions.filter(q => (!filters.grade || q.grade === filters.grade) && (filters.subject === '全部' || q.subject === filters.subject)
    && (filters.type === '全部' || getQuestionType(q) === filters.type) && (filters.enabled === '全部' || (q.enabled !== false) === (filters.enabled === '启用'))
    && (filters.semester === '全部' || (q.semester ?? 'unspecified') === filters.semester)
    && (filters.lesson === '全部' || (filters.lesson === '未标注' ? q.lesson == null : q.lesson === Number(filters.lesson)))
    && (filters.unit === '全部' || (q.unit || '未分单元') === filters.unit)
    && [q.prompt, q.unit, q.source, q.lessonTitle, questionLocation(q)].filter(Boolean).join(' ').toLocaleLowerCase().includes(needle))
}
export function setQuestionsEnabled(questions: Question[], ids: ReadonlySet<string>, enabled: boolean) {
  return questions.map(q => ids.has(q.id) ? { ...q, enabled } : q)
}
export const deleteQuestions = (questions: Question[], ids: ReadonlySet<string>) => questions.filter(q => !ids.has(q.id))