export type Subject = '数学' | '语文' | '英语' | '科学' | '道德与法治' | '历史' | '地理' | '物理' | '化学' | '生物' | '思想政治' | '信息科技' | '信息技术' | '通用技术' | '音乐' | '美术' | '体育与健康' | '劳动'
export type QuestionType = 'choice' | 'fill' | 'boolean'
export type Semester = 'unspecified' | 'upper' | 'lower'
export const semesterLabels: Record<Semester, string> = { unspecified: '未标注', upper: '上册', lower: '下册' }
export function parseSemester(value: unknown): Semester {
  if (typeof value === 'string') value = value.trim().toLowerCase()
  if (value == null || value === '' || value === 'unspecified' || value === '未标注') return 'unspecified'
  if (value === 'upper' || value === '上册') return 'upper'
  if (value === 'lower' || value === '下册') return 'lower'
  throw new Error('册次需为 upper/上册、lower/下册或 unspecified/未标注')
}
export function parseLesson(value: unknown): number | null {
  if (value == null || value === '') return null
  if (typeof value !== 'number' && typeof value !== 'string') throw new Error('课次需为 1–300 的整数或留空')
  if (typeof value === 'string' && !value.trim()) return null
  const number = typeof value === 'string' ? Number(value.trim().replace(/^第\s*(\d+)\s*课$/, '$1')) : value
  if (!Number.isInteger(number) || number < 1 || number > 300) throw new Error('课次需为 1–300 的整数或留空')
  return number
}
export const questionLocation = (q: Question) => [semesterLabels[q.semester ?? 'unspecified'], q.lesson == null ? '课次未标注' : `第 ${q.lesson} 课`, q.lessonTitle].filter(Boolean).join(' · ')
export const questionTypeLabels: Record<QuestionType, string> = { choice: '选择题', fill: '填空题', boolean: '判断题' }
export const grades = Array.from({ length: 12 }, (_, i) => i + 1)
export const primarySubjects: Subject[] = ['数学', '语文', '英语', '科学', '道德与法治', '信息科技', '音乐', '美术', '体育与健康', '劳动']
export const juniorSubjects: Subject[] = ['数学', '语文', '英语', '道德与法治', '历史', '地理', '生物', '物理', '化学', '信息科技', '音乐', '美术', '体育与健康', '劳动']
export const seniorSubjects: Subject[] = ['数学', '语文', '英语', '思想政治', '历史', '地理', '物理', '化学', '生物', '信息技术', '通用技术', '音乐', '美术', '体育与健康', '劳动']
export const subjectsForGrade = (grade: number) => grade <= 6 ? primarySubjects : grade <= 9 ? juniorSubjects : seniorSubjects
export const stageLabel = (grade: number) => grade <= 6 ? '小学' : grade <= 9 ? '初中' : '高中'
export const getQuestionType = (q: Question): QuestionType => q.type ?? (q.options.length ? 'choice' : 'fill')
export interface Question {
  id: string
  grade: number
  subject: Subject
  prompt: string
  options: string[]
  answer: string
  explanation: string
  type?: QuestionType
  enabled?: boolean
  unit?: string
  source?: string
  word?: string
  semester?: Semester
  lesson?: number | null
  lessonTitle?: string
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
  contentRevision?: number
}
export const idleSession: Session = {
  active: false, locked: false, deadline: 0, correct: 0, index: 0, queue: [], practice: false,
}
export const defaultSettings: Settings = {
  name: '小小探索家', grade: 3, subjects: ['数学'], intervalMinutes: 15, requiredCorrect: 3,
}
export const gradeLabel = (grade: number) => grade <= 6 ? `${['一', '二', '三', '四', '五', '六'][grade - 1]}年级` : grade <= 9 ? `初${['一', '二', '三'][grade - 7]}` : `高${['一', '二', '三'][grade - 10]}`
export function parseGrade(value: unknown) {
  const label = String(value ?? '').trim()
  const matched = grades.find(g => gradeLabel(g) === label)
  return matched ?? Number(label)
}
export function validateSettings(settings: Settings) {
  if (!Number.isInteger(settings.grade) || settings.grade < 1 || settings.grade > 12) throw new Error('请选择小学一至六年级、初一至初三或高一至高三')
  if (!Number.isInteger(settings.intervalMinutes) || settings.intervalMinutes < 1 || settings.intervalMinutes > 120) throw new Error('答题间隔需为 1–120 分钟的整数')
  if (!Number.isInteger(settings.requiredCorrect) || settings.requiredCorrect < 1 || settings.requiredCorrect > 20) throw new Error('过关题数需为 1–20 的整数')
  if (!Array.isArray(settings.subjects) || !settings.subjects.length || settings.subjects.some(s => !subjectsForGrade(settings.grade).includes(s))) throw new Error('请至少选择一个对应学段的学科')
  if (!settings.name.trim() || settings.name.length > 20) throw new Error('孩子昵称需为 1–20 个字符')
}