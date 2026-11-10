import { describe, expect, it } from 'vitest'
import { defaultSettings, getQuestionType, idleSession, validateSettings } from '../../src/lib/model'
import { answerSession, eligibleQuestions, formatCountdown, normalizeAnswer, startSession, tickSession } from '../../src/lib/session'
import { seedQuestions } from '../../src/lib/questions'
const questions = seedQuestions(), settings = { ...defaultSettings, requiredCorrect: 2 }
const now = 1_700_000_000_000

describe('守护状态机', () => {
  it('仅抽取所选年级与学科', () => {
    const selected = eligibleQuestions(questions, settings)
    expect(selected.length).toBeGreaterThan(12)
    expect(new Set(selected.map(q => q.type))).toEqual(new Set(['choice','fill','boolean']))
    expect(selected.every(q => q.grade === 3 && q.subject === '数学')).toBe(true)
  })
  it('启动后正常计时，截止前不锁定，截止时锁定', () => {
    const s = startSession(questions, settings, now)
    expect(s.locked).toBe(false)
    expect(tickSession(s, s.deadline - 1)).toBe(s)
    expect(tickSession(s, s.deadline).locked).toBe(true)
  })
  it('从后台返回或重启读取后，逾期即锁定，而非重置倒计时', () => {
    const s = JSON.parse(JSON.stringify(startSession(questions, settings, now)))
    const locked = tickSession(s, now + 120 * 60_000)
    expect(locked.locked).toBe(true)
    expect(locked.deadline).toBe(now + 15 * 60_000)
  })
  it('答错不改变题号、不解锁，并记录错误尝试', () => {
    const s = startSession(questions, settings, now, true)
    const q = questions.find(q => q.id === s.queue[0])!
    const result = answerSession(s, q, '错误答案', settings, now)
    expect(result.session).toEqual(s)
    expect(result.attempt.correct).toBe(false)
    expect(result.passed).toBe(false)
  })
  it('无限次答错也不能放行', () => {
    let s = startSession(questions, settings, now, true)
    const q = questions.find(q => q.id === s.queue[0])!
    const wrong = getQuestionType(q) === 'boolean' ? q.answer === '正确' ? '错误' : '正确' : '__测试错误答案__'
    for (let i = 0; i < 100; i++) { const result = answerSession(s, q, wrong, settings, now); expect(result.attempt.correct).toBe(false); s = result.session }
    expect(s.locked).toBe(true); expect(s.correct).toBe(0)
  })
  it('达到过关题数才解锁，并从完成时间重新计时', () => {
    let s = tickSession(startSession(questions, settings, now), now + 15 * 60_000)
    const q1 = questions.find(q => q.id === s.queue[0])!
    s = answerSession(s, q1, q1.answer, settings, now + 16 * 60_000).session
    expect(s.locked).toBe(true); expect(s.correct).toBe(1)
    const q2 = questions.find(q => q.id === s.queue[1])!
    const result = answerSession(s, q2, q2.answer, settings, now + 17 * 60_000)
    expect(result.passed).toBe(true); expect(result.session.locked).toBe(false)
    expect(result.session.active).toBe(true)
    expect(result.session.deadline).toBe(now + 32 * 60_000)
  })
  it('练习模式完成后停止，不启动下一轮', () => {
    const s = startSession(questions, { ...settings, requiredCorrect: 1 }, now, true)
    const q = questions.find(q => q.id === s.queue[0])!
    expect(answerSession(s, q, q.answer, { ...settings, requiredCorrect: 1 }, now).session).toEqual(idleSession)
  })
  it('题库少于过关题数时循环出题', () => {
    const q = questions[0], config = { ...settings, grade: q.grade, requiredCorrect: 2 }
    let s = startSession([q], config, now, true)
    s = answerSession(s, q, q.answer, config, now).session
    expect(answerSession(s, q, q.answer, config, now).passed).toBe(true)
  })
  it('拒绝错误状态、过期题目和空答案', () => {
    expect(() => answerSession(idleSession, questions[0], '1', settings, now)).toThrow('阶段')
    const s = startSession(questions, settings, now, true), q = questions.find(q => q.id === s.queue[0])!
    expect(() => answerSession(s, { ...q, id: 'stale' }, q.answer, settings, now)).toThrow('不一致')
    expect(() => answerSession(s, q, ' ', settings, now)).toThrow('答案')
  })
  it('没有匹配题目时禁止启动', () => { expect(() => startSession([], settings, now)).toThrow('没有题目') })
  it('全角数字、大小写与前后空白统一判分', () => {
    expect(normalizeAnswer(' ７２ ')).toBe('72'); expect(normalizeAnswer(' APPLE ')).toBe('apple')
  })
  it('倒计时不出现负数，支持 120 分钟', () => {
    expect(formatCountdown(-100)).toBe('00:00'); expect(formatCountdown(120 * 60_000)).toBe('120:00'); expect(formatCountdown(1001)).toBe('00:02')
  })
  it.each([{ intervalMinutes: 0 }, { intervalMinutes: 121 }, { intervalMinutes: 1.5 }, { requiredCorrect: 0 }, { requiredCorrect: 21 }, { subjects: [] }, { grade: 13 }, { name: '' }])('规则校验 %j', invalid => {
    expect(() => validateSettings({ ...settings, ...invalid })).toThrow()
  })
})