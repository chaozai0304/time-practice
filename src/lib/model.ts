export type Subject = '数学' | '语文' | '英语'
export interface Question {
  id: string
  grade: number
  subject: Subject
  prompt: string
  options: string[]
  answer: string
  explanation: string
}
export interface Settings {
  name: string
  grade: number
  subjects: Subject[]
  intervalMinutes: number
  requiredCorrect: number
}
export interface Credential { salt: string; hash: string; iterations: number }
export interface Attempt {
  id: string
  questionId: string
  prompt: string
  subject: Subject
  answer: string
  correct: boolean
  at: number
}
export interface Session {
  active: boolean
  locked: boolean
  deadline: number
  correct: number
  index: number
  queue: string[]
  practice: boolean
}
export interface AppData {
  version: 1
  settings: Settings
  questions: Question[]
  credential: Credential | null
  attempts: Attempt[]
  session: Session
  authFailures: number
  authBlockedUntil: number
}
export const idleSession: Session = {
  active: false, locked: false, deadline: 0, correct: 0, index: 0, queue: [], practice: false,
}
export const defaultSettings: Settings = {
  name: '小小探索家', grade: 3, subjects: ['数学'], intervalMinutes: 15, requiredCorrect: 3,
}
export const gradeLabel = (grade: number) => `${['一', '二', '三', '四', '五', '六'][grade - 1]}年级`
export function validateSettings(settings: Settings) {
  if (!Number.isInteger(settings.grade) || settings.grade < 1 || settings.grade > 6) throw new Error('请选择 1–6 年级')
  if (!Number.isInteger(settings.intervalMinutes) || settings.intervalMinutes < 1 || settings.intervalMinutes > 120) throw new Error('答题间隔需为 1–120 分钟的整数')
  if (!Number.isInteger(settings.requiredCorrect) || settings.requiredCorrect < 1 || settings.requiredCorrect > 20) throw new Error('过关题数需为 1–20 的整数')
  if (!settings.subjects.length || settings.subjects.some(s => !['数学', '语文', '英语'].includes(s))) throw new Error('至少选择一个学科')
  if (!settings.name.trim() || settings.name.length > 20) throw new Error('孩子昵称需为 1–20 个字符')
}