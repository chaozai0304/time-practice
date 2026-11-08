import type { Attempt, Question } from './model'
import { getQuestionType } from './model'
import { normalizeAnswer } from './session'

export function wordGamePool(questions: Question[], grade: number) {
  return questions.filter(q => q.enabled !== false && q.grade === grade && q.subject === '英语' && getQuestionType(q) === 'fill' && /^[a-z]+(?:[ '-][a-z]+)*$/i.test(q.answer))
}
export function gameAttempt(question: Question, answer: string, at: number): Attempt {
  if (!answer.trim()) throw new Error('请先填写单词')
  return { id: crypto.randomUUID(), questionId: question.id, prompt: question.prompt, subject: question.subject, answer: answer.trim(), correct: normalizeAnswer(answer) === normalizeAnswer(question.answer), at }
}