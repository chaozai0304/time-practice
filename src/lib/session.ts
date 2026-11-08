import { getQuestionType, idleSession, validateSettings } from './model'
import { booleanAnswer } from './questions'
import type { Attempt, Question, Session, Settings } from './model'

export function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]] }
  return copy
}
export function eligibleQuestions(questions: Question[], settings: Settings) {
  return questions.filter(q => q.enabled !== false && q.grade === settings.grade && settings.subjects.includes(q.subject))
}
export function questionPriority(question: Question, attempts: Attempt[], now: number, recent: string[] = []) {
  const history = attempts.filter(a => a.questionId === question.id)
  const errors = history.filter(a => !a.correct).length
  const last = history.length ? history.reduce((a, b) => a.at > b.at ? a : b) : undefined
  let weight = history.length ? 1 + errors / history.length * 8 + (last && !last.correct ? 3 : 0) + Math.min(2, Math.max(0, now - (last?.at ?? now)) / 86_400_000) : 8
  if (recent.includes(question.id)) weight *= .15
  return weight
}
export function prioritizeQuestions(questions: Question[], attempts: Attempt[], now: number, recent: string[] = [], random = Math.random) {
  const histories = new Map<string, Attempt[]>()
  for (const attempt of attempts) { const history = histories.get(attempt.questionId) ?? []; history.push(attempt); histories.set(attempt.questionId, history) }
  return questions.filter(q => q.enabled !== false).map(q => ({ q, key: -Math.log(Math.max(Number.EPSILON, random())) / questionPriority(q, histories.get(q.id) ?? [], now, recent) })).sort((a, b) => a.key - b.key).map(row => row.q)
}
export function startSession(questions: Question[], settings: Settings, now: number, practice = false, attempts: Attempt[] = []): Session {
  validateSettings(settings)
  const recent = [...attempts].sort((a, b) => b.at - a.at).slice(0, 5).map(a => a.questionId)
  const queue = prioritizeQuestions(eligibleQuestions(questions, settings), attempts, now, recent).map(q => q.id)
  if (!queue.length) throw new Error('当前年级和学科没有题目，请先添加题目或调整学科')
  return { active: true, locked: practice, deadline: now + settings.intervalMinutes * 60_000, correct: 0, index: 0, queue, practice }
}
export function tickSession(session: Session, now: number): Session {
  if (!session.active || session.locked || now < session.deadline) return session
  return { ...session, locked: true, correct: 0, index: 0 }
}
export const normalizeAnswer = (value: string) => value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase()
export function answerSession(session: Session, question: Question, answer: string, settings: Settings, now: number, questions?: Question[], attempts: Attempt[] = []): { session: Session; attempt: Attempt; passed: boolean } {
  if (!session.active || !session.locked) throw new Error('当前不在答题阶段')
  if (question.id !== session.queue[session.index % session.queue.length]) throw new Error('题目与答题进度不一致')
  if (!answer.trim()) throw new Error('请先选择或填写答案')
  const correct = getQuestionType(question) === 'boolean' ? booleanAnswer(answer) === question.answer : normalizeAnswer(answer) === normalizeAnswer(question.answer)
  const count = session.correct + (correct ? 1 : 0)
  const passed = count >= settings.requiredCorrect
  const attempt: Attempt = { id: crypto.randomUUID(), questionId: question.id, prompt: question.prompt, subject: question.subject, answer: answer.trim(), correct, at: now }
  let next = { ...session, correct: count, index: session.index + (correct ? 1 : 0) }
  if (passed) {
    const history = [...attempts, attempt]
    const recent = [...history].sort((a, b) => b.at - a.at).slice(0, 5).map(a => a.questionId)
    const queue = questions ? prioritizeQuestions(eligibleQuestions(questions, settings), history, now, recent).map(q => q.id) : shuffle(session.queue)
    next = session.practice ? { ...idleSession } : { ...session, locked: false, correct: 0, index: 0, queue, deadline: now + settings.intervalMinutes * 60_000 }
  }
  return { session: next, attempt, passed }
}
export function formatCountdown(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}