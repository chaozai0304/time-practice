import { Preferences } from '@capacitor/preferences'
import { defaultSettings, idleSession, validateSettings } from './model'
import type { AppData } from './model'
import { seedQuestions, validateQuestion } from './questions'
import { tickSession } from './session'
const KEY = 'sprout.data.v1'
export function initialData(): AppData {
  return { version: 1, settings: { ...defaultSettings }, questions: seedQuestions(), credential: null, attempts: [], session: { ...idleSession }, authFailures: 0, authBlockedUntil: 0 }
}
export async function loadData(): Promise<AppData> {
  const { value } = await Preferences.get({ key: KEY })
  if (!value) return initialData()
  try {
    const data = JSON.parse(value) as AppData
    if (data.version !== 1 || !Array.isArray(data.questions) || !Array.isArray(data.attempts)) throw new Error('数据版本不兼容')
    validateSettings(data.settings)
    data.questions = data.questions.map(validateQuestion)
    if (!data.session || !Array.isArray(data.session.queue)) throw new Error('计时数据损坏')
    if (data.session.active && (!data.session.queue.length || data.session.queue.some(id => !data.questions.some(q => q.id === id)))) throw new Error('守护题目缺失')
    return { ...data, session: tickSession(data.session, Date.now()), authFailures: data.authFailures || 0, authBlockedUntil: data.authBlockedUntil || 0 }
  } catch { throw new Error('本地数据读取失败。为避免丢失题库，已停止自动覆盖；请保留应用数据并联系维护者。') }
}
// Serialize writes so an older slow write cannot overwrite a newer state.
let writes = Promise.resolve()
export function saveData(data: AppData): Promise<void> {
  const value = JSON.stringify(data)
  const next = writes.catch(() => {}).then(() => Preferences.set({ key: KEY, value }))
  writes = next
  return next
}