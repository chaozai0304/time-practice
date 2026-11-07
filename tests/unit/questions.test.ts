import { describe, expect, it } from 'vitest'
import { mergeQuestions, parseQuestions, seedQuestions, validateQuestion } from '../../src/lib/questions'
const q = { grade: 3, subject: '数学', prompt: '24 × 3 = ？', options: ['48', '72', '96'], answer: '72', explanation: '24 的 3 倍' }
describe('本地题库', () => {
  it('所有示例题均通过校验', () => { expect(seedQuestions()).toHaveLength(120); seedQuestions().forEach(v => expect(validateQuestion(v)).toEqual(v)) })
  it('导入 JSON 时生成本地唯一 ID，不信任文件 ID', () => {
    const result = parseQuestions(JSON.stringify([{ ...q, id: 'external' }, q]), 'test.JSON')
    expect(result).toHaveLength(2); expect(result[0].id).not.toBe('external'); expect(result[0].id).not.toBe(result[1].id)
  })
  it('支持 BOM、CSV 引号与换行、填空题', () => {
    const result = parseQuestions('\uFEFFgrade,subject,prompt,options,answer,explanation\n3,数学,"一小时,有多少分钟？",,60,"1 小时\n等于 60 分钟"', 'test.csv')
    expect(result[0].options).toEqual([]); expect(result[0].answer).toBe('60'); expect(result[0].explanation).toContain('\n')
  })
  it('选择题 CSV 以 | 分隔选项', () => {
    const result = parseQuestions('grade,subject,prompt,options,answer\n3,数学,24×3？,48|72|96,72', 'q.csv')
    expect(result[0].options).toEqual(['48','72','96'])
  })
  it('原子校验：一条错误则整个文件拒绝，并指出行号', () => {
    expect(() => parseQuestions(JSON.stringify([q, { ...q, grade: 9 }]), 'q.json')).toThrow('第 2 道题')
  })
  it('拒绝无效答案、重复选项、错误学科', () => {
    expect(() => validateQuestion({ ...q, answer: 'B' })).toThrow('答案')
    expect(() => validateQuestion({ ...q, options: ['72','72'] })).toThrow('不重复')
    expect(() => validateQuestion({ ...q, subject: '体育' })).toThrow('学科')
  })
  it('仅接受 JSON 数组和 CSV', () => {
    expect(() => parseQuestions('{}', 'q.json')).toThrow('数组'); expect(() => parseQuestions('[]', 'q.json')).toThrow('1–2000')
    expect(() => parseQuestions('text', 'q.txt')).toThrow('.json')
  })
  it('合并会跳过重复题，不覆盖已有题', () => {
    const original = validateQuestion(q), another = validateQuestion({ ...q, prompt: '新题目' })
    const merged = mergeQuestions([original], [validateQuestion(q), another, another])
    expect(merged.added).toBe(1); expect(merged.questions).toEqual([original, another])
  })
})