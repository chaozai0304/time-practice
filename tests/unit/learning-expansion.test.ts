import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { defaultSettings, gradeLabel, parseGrade, subjectsForGrade, validateSettings } from '../../src/lib/model'
import type { Attempt } from '../../src/lib/model'
import { parseQuestions, validateQuestion } from '../../src/lib/questions'
import { foundationVocabulary, parseVocabulary, vocabularyQuestions } from '../../src/lib/vocabulary'
import { questionTemplateCSV, questionExamples, vocabularyTemplateCSV } from '../../src/lib/templates'
import { answerSession, eligibleQuestions, prioritizeQuestions, questionPriority, startSession } from '../../src/lib/session'
import { gameAttempt, wordGamePool } from '../../src/lib/game'
const now = 1700000000000
const base = validateQuestion({ id: 'new', grade: 3, subject: '英语', type: 'fill', prompt: '苹果的英文', options: [], answer: 'apple' })
const attempt = (questionId: string, correct: boolean, at = now - 1000): Attempt => ({ id: crypto.randomUUID(), questionId, correct, at, subject: '英语', prompt: 'fixture', answer: correct ? 'apple' : 'bad' })
describe('扩展学习内容与策略', () => {
  it('磁盘题库/词表模板与应用下载模板一致，均能直接导入', () => {
    const withoutId = (q: ReturnType<typeof validateQuestion>) => { const { id: _id, ...rest } = q; return rest }
    const expected = questionExamples.map(validateQuestion).map(withoutId)
    for (const ext of ['csv','json']) {
      expect(parseQuestions(readFileSync(new URL(`../../examples/questions.${ext}`, import.meta.url), 'utf8'), `questions.${ext}`).map(withoutId)).toEqual(expected)
      expect(parseVocabulary(readFileSync(new URL(`../../examples/vocabulary.${ext}`, import.meta.url), 'utf8'), `words.${ext}`)).toEqual(parseVocabulary(vocabularyTemplateCSV, 'words.csv'))
    }
  })
  it('游戏只使用当前年级启用拼写题，正确与错误均记录，不把空答案计分', () => {
    expect(wordGamePool([base, { ...base, enabled: false }, { ...base, grade: 7 }, { ...base, answer: '42' }], 3)).toEqual([base])
    expect(gameAttempt(base, ' APPLE ', now).correct).toBe(true); expect(gameAttempt(base, 'bad', now).correct).toBe(false)
    expect(() => gameAttempt(base, ' ', now)).toThrow('填写')
  })
  it('三题型 CSV/JSON 模板可完整往返，包含初高中与停用案例', () => {
    for (const bank of [parseQuestions(questionTemplateCSV, 'template.csv'), parseQuestions(JSON.stringify(questionExamples), 'template.json')]) {
      expect(new Set(bank.map(q => q.type))).toEqual(new Set(['choice', 'fill', 'boolean']))
      expect(bank.some(q => q.grade === 8 && q.subject === '物理')).toBe(true)
      expect(bank.find(q => q.grade === 10)?.enabled).toBe(false)
    }
  })
  it('判断答案规范化，旧题型推断，拒绝错用选项/类型/开关', () => {
    expect(validateQuestion({ ...base, type: '判断题', answer: 'false' }).answer).toBe('错误')
    expect(validateQuestion({ ...base, type: undefined }).type).toBe('fill')
    for (const invalid of [{ options: 'a|b' }, { options: ['a','b'] }, { type: 'essay' }, { type: 'constructor' }, { type: 'toString' }, { enabled: 'maybe' }, { type: 'boolean', answer: 'possibly' }]) expect(() => validateQuestion({ ...base, ...invalid })).toThrow()
  })
  it('学段科目与标签正确，拒绝小学物理、高中道德与法治', () => {
    expect(parseGrade('初二')).toBe(8); expect(gradeLabel(12)).toBe('高三'); expect(subjectsForGrade(11)).toContain('思想政治')
    expect(() => validateQuestion({ ...base, grade: 3, subject: '物理' })).toThrow('学科')
    expect(() => validateSettings({ ...defaultSettings, grade: 10, subjects: ['道德与法治'] })).toThrow('学科')
    expect(() => validateSettings({ ...defaultSettings, grade: 9, subjects: ['物理','化学'] })).not.toThrow()
  })
  it('基础词库每词生成双向题且 ID 唯一，不声明教材完整覆盖', () => {
    const entries = foundationVocabulary, bank = vocabularyQuestions(entries)
    expect(entries.length).toBeGreaterThan(200); expect(bank).toHaveLength(entries.length * 2)
    expect(new Set(bank.map(q => q.id)).size).toBe(bank.length)
    bank.forEach(q => { expect(validateQuestion(q).word).toBeTruthy(); expect(q.source).toContain('非北京某版教材完整词表') })
  })
  it('词表模板与独立单词导入，重复/非法/超量整批拒绝', () => {
    expect(parseVocabulary(vocabularyTemplateCSV, 'words.csv')).toHaveLength(3)
    expect(vocabularyQuestions(parseVocabulary('[{"english":"apple","chinese":"苹果"}]', 'words.json'))).toHaveLength(2)
    for (const entries of [[{ english: 'apple', chinese: '苹果', grade: 13 }], [{ english: 'apple', chinese: '苹果' }, { english: 'APPLE', chinese: '苹果' }], [{ english: 'a<script>', chinese: 'bad' }], Array(1001).fill({ english: 'word', chinese: '单词' })]) expect(() => parseVocabulary(JSON.stringify(entries), 'words.json')).toThrow()
  })
  it('启用开关控制抽题池，无可用题禁止启动', () => {
    const settings = { ...defaultSettings, subjects: ['英语' as const] }, disabled = { ...base, enabled: false }
    expect(eligibleQuestions([disabled], settings)).toEqual([])
    expect(() => startSession([disabled], settings, now)).toThrow('没有题目')
  })
  it('新题及高错率权重更高，近期题降权，过时题恢复机会', () => {
    const good = { ...base, id: 'good' }, bad = { ...base, id: 'bad' }, history = [attempt(good.id, true), attempt(bad.id, false)]
    expect(questionPriority(base, history, now)).toBeGreaterThan(questionPriority(good, history, now))
    expect(questionPriority(bad, history, now)).toBeGreaterThan(questionPriority(good, history, now))
    expect(questionPriority(bad, history, now, ['bad'])).toBeCloseTo(questionPriority(bad, history, now) * .15)
    expect(questionPriority(good, history, now + 3 * 86400000)).toBeGreaterThan(questionPriority(good, history, now))
  })
  it('固定随机值可验证加权排序，停用排除、无重复、不修改输入', () => {
    const good = { ...base, id: 'good' }, bad = { ...base, id: 'bad' }, disabled = { ...base, id: 'disabled', enabled: false }, pool = [good, base, bad, disabled]
    expect(prioritizeQuestions(pool, [attempt('good', true), attempt('bad', false)], now, [], () => .5).map(q => q.id)).toEqual(['bad','new','good'])
    expect(pool[0]).toBe(good); expect(new Set(prioritizeQuestions(pool, [], now).map(q => q.id)).size).toBe(3)
  })
  it('判断题错答不放行，别名正确判分；过关重新排队并排除停用题', () => {
    const q = validateQuestion({ ...base, id: 'boolean', type: 'boolean', answer: '错误' }), settings = { ...defaultSettings, subjects: ['英语' as const], requiredCorrect: 1 }
    const s = { ...startSession([q], settings, now), locked: true }
    expect(answerSession(s, q, '正确', settings, now).session.locked).toBe(true)
    const result = answerSession(s, q, 'false', settings, now, [q, { ...base, enabled: false }])
    expect(result.passed).toBe(true); expect(result.session.queue).toEqual([q.id]); expect(result.session.deadline).toBe(now + 900000)
  })
})