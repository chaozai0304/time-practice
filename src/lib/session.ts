import { idleSession, validateSettings } from './model'
import type { Attempt, Question, Session, Settings } from './model'

export function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]] }
  return copy
}
export function eligibleQuestions(questions: Question[], settings: Settings) {
  return questions.filter(q => q.grade === settings.grade && settings.subjects.includes(q.subject))
}
export function startSession(questions: Question[], settings: Settings, now: number, practice = false): Session {
  validateSettings(settings)
  const queue = shuffle(eligibleQuestions(questions, settings).map(q => q.id))
  if (!queue.length) throw new Error('当前年级和学科没有题目，请先添加题目或调整学科')
  return { active: true, locked: practice, deadline: now + settings.intervalMinutes * 60_000, correct: 0, index: 0, queue, practice }
}
export function tickSession(session: Session, now: number): Session {
  if (!session.active || session.locked || now < session.deadline) return session
  return { ...session, locked: true, correct: 0, index: 0 }
}
export const normalizeAnswer = (value: string) => value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase()
export function answerSession(session: Session, question: Question, answer: string, settings: Settings, now: number): { session: Session; attempt: Attempt; passed: boolean } {
  if (!session.active || !session.locked) throw new Error('当前不在答题阶段')
  if (question.id !== session.queue[session.index % session.queue.length]) throw new Error('题目与答题进度不一致')
  if (!answer.trim()) throw new Error('请先选择或填写答案')
  const correct = normalizeAnswer(answer) === normalizeAnswer(question.answer)
  const count = session.correct + (correct ? 1 : 0)
  const passed = count >= settings.requiredCorrect
  const attempt: Attempt = { id: crypto.randomUUID(), questionId: question.id, prompt: question.prompt, subject: question.subject, answer: answer.trim(), correct, at: now }
  let next = { ...session, correct: count, index: session.index + (correct ? 1 : 0) }
  if (passed) next = session.practice ? { ...idleSession } : { ...session, locked: false, correct: 0, index: 0, queue: shuffle(session.queue), deadline: now + settings.intervalMinutes * 60_000 }
  return { session: next, attempt, passed }
}
export function formatCountdown(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}