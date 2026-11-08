import { describe, expect, it } from 'vitest'
import { mergeQuestions, parseQuestions, validateQuestion } from '../../src/lib/questions'
import { parseLesson, parseSemester } from '../../src/lib/model'
import { defaultQuestionFilters, deleteQuestions, filterQuestions, setQuestionsEnabled } from '../../src/lib/question-management'
import { foundationVocabulary, parseVocabulary, vocabularyQuestions } from '../../src/lib/vocabulary'

const base = validateQuestion({ id: 'old-id', grade: 3, subject: '英语', prompt: '看中文写英语：苹果', options: [], answer: 'apple' })
describe('课程归属和批量管理', () => {
  it('旧题不猜上下册或课次，保留已有ID', () => { expect(base.semester).toBe('unspecified'); expect(base.lesson).toBeNull(); expect(base.lessonTitle).toBe(''); expect(base.id).toBe('old-id') })
  it('册次和课次支持标准值/中文，错误整批拒绝', () => {
    expect(parseSemester('下册')).toBe('lower'); expect(parseLesson('第 12 课')).toBe(12)
    const q = validateQuestion({ ...base, semester: 'upper', lesson: '1', lessonTitle: '水果' }); expect(q.lesson).toBe(1)
    for (const invalid of [{ semester: 'summer' }, { lesson: 0 }, { lesson: 301 }, { lesson: 1.5 }, { lesson: true }]) expect(() => validateQuestion({ ...base, ...invalid })).toThrow()
    expect(() => parseQuestions(JSON.stringify([base, { ...base, semester: 'summer' }]), 'q.json')).toThrow('第 2 道题')
  })
  it('相同题目不同上下册/课次分别保留，旧未标注题仍去重', () => {
    const upper = validateQuestion({ ...base, id: 'upper', semester: 'upper', lesson: 1 }), lower = validateQuestion({ ...base, id: 'lower', semester: 'lower', lesson: 1 }), other = validateQuestion({ ...upper, id: 'other', lesson: 2 })
    const result = mergeQuestions([base], [validateQuestion({ ...base, id: 'duplicate' }), upper, lower, other]); expect(result.added).toBe(3); expect(result.questions[0].id).toBe(base.id)
  })
  it('词表元数据进入双向题，同词跨课程允许，原始基础词ID稳定', () => {
    const entries = parseVocabulary('english,chinese,grade,unit,semester,lesson,lessonTitle\napple,苹果,3,词汇,upper,1,水果\napple,苹果,3,词汇,lower,2,复习', 'words.csv')
    const questions = vocabularyQuestions(entries, 'import'); expect(questions).toHaveLength(4); expect(new Set(questions.map(q => q.id)).size).toBe(4)
    expect(questions[0].semester).toBe('upper'); expect(questions[1].lessonTitle).toBe('水果'); expect(questions[2].lesson).toBe(2)
    expect(vocabularyQuestions(foundationVocabulary)[0].id).toBe('vocab-3-book-choice')
  })
  it('按年级、科目、册次、课次、课题组合筛选，明确未标注范围', () => {
    const first = validateQuestion({ ...base, id: 'first', semester: 'upper', lesson: 1, lessonTitle: '水果探索' }), second = validateQuestion({ ...base, id: 'second', semester: 'lower', lesson: 2 }), filters = { ...defaultQuestionFilters(3), subject: '英语', semester: 'upper', lesson: '1', search: '水果探索' }
    expect(filterQuestions([base, first, second], filters)).toEqual([first])
    expect(filterQuestions([base, first, second], { ...defaultQuestionFilters(0), semester: 'unspecified', lesson: '未标注' })).toEqual([base])
  })
  it('批量启停只改目标，批量删除仅移除所选ID，不改剩余对象', () => {
    const other = { ...base, id: 'other' }, pool = [base, other], ids = new Set([base.id])
    const disabled = setQuestionsEnabled(pool, ids, false); expect(disabled[0].enabled).toBe(false); expect(disabled[1]).toBe(other); expect(base.enabled).toBe(true)
    expect(deleteQuestions(pool, ids)).toEqual([other]); expect(pool).toEqual([base, other])
  })
  it('在线改变全部归属和内容仍保留题目ID，搜索可定位新课题', () => {
    const edited = validateQuestion({ ...base, grade: 8, subject: '物理', semester: 'lower', lesson: 5, lessonTitle: '运动测量', prompt: '速度等于路程除以什么？', answer: '时间' })
    expect(edited.id).toBe(base.id); expect(filterQuestions([edited], { ...defaultQuestionFilters(8), search: '运动测量', semester: 'lower', lesson: '5' })).toEqual([edited])
  })
})