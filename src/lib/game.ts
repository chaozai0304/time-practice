import type { Attempt, GameSettings, Question } from './model'
import { getQuestionType } from './model'
import { normalizeAnswer, prioritizeQuestions } from './session'

export function wordGamePool(questions: Question[], grade: number) {
  return questions.filter(q => q.enabled !== false && q.grade === grade && q.subject === '英语' && getQuestionType(q) === 'fill' && q.answer.length <= 80 && /^[a-z]+(?:[ '-][a-z]+)*$/i.test(q.answer))
}
export const defaultGameSettings: GameSettings = { spawnIntervalSeconds: 4, fallSpeed: 2.5 }
export function gameSettings(value?: Partial<GameSettings> | null): GameSettings {
  const bounded = (v: unknown, fallback: number, min: number, max: number) => typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback
  return { spawnIntervalSeconds: bounded(value?.spawnIntervalSeconds, 4, 1, 12), fallSpeed: bounded(value?.fallSpeed, 2.5, 1, 8) }
}
export const chineseTarget = (q: Question) => q.prompt.replace(/^看中文写英语[:：]\s*/, '')
export interface WordTarget { id: string; question: Question; x: number; y: number; incoming: boolean }
export interface WordBullet { id: string; targetId: string; x: number; y: number; angle: number }
export interface HitBurst { id: string; x: number; y: number; life: number }
export interface ArenaState { elapsed: number; nextSpawn: number; spawnInterval: number; sequence: number; targets: WordTarget[]; bullets: WordBullet[]; bursts: HitBurst[]; hits: number; misses: number; streak: number; shots: number; recent: string[] }
export const createArena = (): ArenaState => ({ elapsed: 0, nextSpawn: 0, spawnInterval: 4, sequence: 0, targets: [], bullets: [], bursts: [], hits: 0, misses: 0, streak: 0, shots: 0, recent: [] })
export function advanceArena(state: ArenaState, seconds: number, pool: Question[], history: Attempt[], now: number, settings: GameSettings, random = Math.random): ArenaState {
  if (state.hits >= 10) return state
  const dt = Math.max(0, Math.min(.1, seconds)), elapsed = state.elapsed + dt, options = gameSettings(settings)
  let hits = state.hits, misses = state.misses, streak = state.streak, sequence = state.sequence, nextSpawn = state.nextSpawn - state.spawnInterval + options.spawnIntervalSeconds
  let recent = state.recent, targets = state.targets.map(t => ({ ...t, y: Math.min(t.incoming ? 81 : 100, t.y + options.fallSpeed * dt) }))
  const bursts = state.bursts.map(b => ({ ...b, life: b.life - dt })).filter(b => b.life > 0), hitIds = new Set<string>(), bullets: WordBullet[] = []
  for (const bullet of state.bullets) {
    const target = targets.find(t => t.id === bullet.targetId); if (!target) continue
    const dx = target.x - bullet.x, dy = target.y - bullet.y, distance = Math.hypot(dx, dy), travel = 75 * dt
    if (distance <= travel + 2) { hitIds.add(target.id); bursts.push({ id: bullet.id, x: target.x, y: target.y, life: .65 }); hits++; streak++; recent = [...recent, target.question.id].slice(-5) }
    else bullets.push({ ...bullet, x: bullet.x + dx / distance * travel, y: bullet.y + dy / distance * travel, angle: Math.atan2(dy, dx) * 180 / Math.PI + 90 })
  }
  targets = targets.filter(target => {
    if (hitIds.has(target.id)) return false
    if (target.y >= 82 && !target.incoming) { misses++; streak = 0; recent = [...recent, target.question.id].slice(-5); return false }
    return true
  })
  if (hits < 10 && targets.length < 3 && (targets.length === 0 || elapsed >= nextSpawn)) {
    const activeWords = new Set(targets.map(t => normalizeAnswer(t.question.answer))), available = pool.filter(q => q.enabled !== false && !activeWords.has(normalizeAnswer(q.answer)))
    const question = prioritizeQuestions(available, history, now, recent, random)[0]
    if (question) {
      const lanes = [18,50,82].filter(x => !targets.some(t => t.x === x)), x = lanes[Math.min(lanes.length - 1, Math.floor(random() * lanes.length))]
      sequence++; targets.push({ id: `target-${sequence}`, question, x, y: 8, incoming: false }); nextSpawn = elapsed + options.spawnIntervalSeconds
    }
  }
  return { elapsed, nextSpawn, spawnInterval: options.spawnIntervalSeconds, sequence, targets, bullets, bursts, hits, misses, streak, shots: state.shots, recent }
}
export function fireWord(state: ArenaState, answer: string, at: number, selectedId?: string): { state: ArenaState; attempt: Attempt | null; message: string } {
  if (!answer.trim() || state.hits >= 10 || state.hits + state.bullets.length >= 10) return { state, attempt: null, message: '等待当前子弹命中，或先填写英文。' }
  const eligible = state.targets.filter(t => !t.incoming)
  const match = eligible.find(t => normalizeAnswer(t.question.answer) === normalizeAnswer(answer))
  if (!match && state.targets.some(t => t.incoming && normalizeAnswer(t.question.answer) === normalizeAnswer(answer))) return { state, attempt: null, message: '该目标已有子弹追踪，试试其他中文目标。' }
  const target = match ?? eligible.find(t => t.id === selectedId) ?? eligible[0]
  if (!target) return { state, attempt: null, message: '中文目标正在准备中。' }
  const attempt = gameAttempt(target.question, answer, at)
  if (!match) return { state: { ...state, streak: 0 }, attempt, message: '拼写还不匹配，未发射子弹。看看场上的中文，再试一次！' }
  return { state: { ...state, shots: state.shots + 1, targets: state.targets.map(t => t.id === match.id ? { ...t, incoming: true } : t), bullets: [...state.bullets, { id: `bullet-${state.shots + 1}`, targetId: match.id, x: 50, y: 94, angle: 0 }] }, attempt, message: '拼写正确！子弹已发射，正在追踪中文目标。' }
}
export function gameAttempt(question: Question, answer: string, at: number): Attempt {
  if (!answer.trim()) throw new Error('请先填写单词')
  return { id: crypto.randomUUID(), questionId: question.id, prompt: question.prompt, subject: question.subject, answer: answer.trim(), correct: normalizeAnswer(answer) === normalizeAnswer(question.answer), at }
}