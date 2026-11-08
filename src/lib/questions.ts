import Papa from 'papaparse'
import type { Question, Subject } from './model'
import { getQuestionType, parseGrade, parseLesson, parseSemester, subjectsForGrade } from './model'
import { expansionQuestions } from './starter-bank'

// Small, original starter bank; parents can replace or expand it locally.
export function seedQuestions(): Question[] {
  const result: Question[] = []
  for (let grade = 1; grade <= 6; grade++) {
    for (let n = 1; n <= 12; n++) {
      const a = grade * 7 + n, b = n + grade
      const multiply = grade >= 3
      const answer = multiply ? a * b : a + b
      result.push({ id: `seed-m-${grade}-${n}`, grade, subject: '数学',
        prompt: `${a} ${multiply ? '×' : '+'} ${b} = ？`,
        options: [String(answer + b), String(answer), String(answer - 1), String(answer + 1)],
        answer: String(answer), explanation: multiply ? `${a} × ${b} 表示 ${b} 个 ${a} 相加，结果是 ${answer}。` : `把 ${a} 和 ${b} 合起来，共有 ${answer}。` })
    }
    const chinese = [
      ['“温暖”的反义词是？', ['寒冷', '暖和', '热情', '明亮'], '寒冷', '反义词表达相反的意思，温暖与寒冷相对。'],
      ['哪一个词语表示颜色？', ['奔跑', '蓝色', '开心', '桌子'], '蓝色', '蓝色是颜色词，奔跑是动作，开心是心情。'],
      ['“一寸光阴一寸金”提醒我们要？', ['珍惜时间', '收集金子', '测量长度', '多睡觉'], '珍惜时间', '时间像金子一样宝贵，我们应该珍惜它。'],
      ['下面哪个词语没有错别字？', ['学效', '学校', '学较', '雪校'], '学校', '学校的“校”是木字旁。'],
    ] as const
    chinese.forEach(([prompt, options, answer, explanation], i) => result.push({ id: `seed-c-${grade}-${i}`, grade, subject: '语文', prompt, options: [...options], answer, explanation }))
    const english = [
      ['“苹果”的英文是？', ['apple', 'book', 'cat', 'sun'], 'apple', 'apple 表示苹果。'],
      ['“Thank you” 的意思是？', ['你好', '谢谢你', '再见', '对不起'], '谢谢你', '收到帮助时，可以说 Thank you。'],
      ['Which word means “蓝色”？', ['red', 'green', 'blue', 'yellow'], 'blue', 'blue 是蓝色，red 是红色。'],
      ['“I am a student.” 的意思是？', ['我是学生', '我有一本书', '我喜欢苹果', '我是老师'], '我是学生', 'student 表示学生。'],
    ] as const
    english.forEach(([prompt, options, answer, explanation], i) => result.push({ id: `seed-e-${grade}-${i}`, grade, subject: '英语', prompt, options: [...options], answer, explanation }))
  }
  return [...result, ...expansionQuestions()].map(validateQuestion)
}
function text(value: unknown, name: string, max: number): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new Error(`${name}需为 1–${max} 个字符`)
  return value.trim()
}
export function validateQuestion(value: unknown): Question {
  if (!value || typeof value !== 'object') throw new Error('题目必须是对象')
  const q = value as Record<string, unknown>
  const grade = parseGrade(q.grade)
  if (!Number.isInteger(grade) || grade < 1 || grade > 12) throw new Error('年级需为 1–12（7–9 为初中，10–12 为高中）')
  if (!subjectsForGrade(grade).includes(q.subject as Subject)) throw new Error('学科不属于当前学段，请选择对应学段科目')
  if (q.options != null && !Array.isArray(q.options)) throw new Error('JSON 选项必须是数组')
  let options = Array.isArray(q.options) ? q.options.map(o => text(o, '选项', 160)) : []
  const aliases: Record<string, 'choice' | 'fill' | 'boolean'> = { choice: 'choice', fill: 'fill', boolean: 'boolean', '选择题': 'choice', '填空题': 'fill', '判断题': 'boolean' }
  const type = q.type == null || q.type === '' ? options.length ? 'choice' : 'fill' : Object.keys(aliases).includes(String(q.type)) ? aliases[String(q.type)] : undefined
  if (!type) throw new Error('题型需为 choice/选择题、fill/填空题或 boolean/判断题')
  const answer = type === 'boolean' ? booleanAnswer(q.answer) : text(q.answer, '答案', 160)
  if (type === 'boolean') { if (!answer) throw new Error('判断题答案请填写正确/错误或 true/false'); options = ['正确', '错误'] }
  if (type === 'choice' && !options.length) throw new Error('选择题需有 2–6 个不重复选项')
  if (type === 'fill' && options.length) throw new Error('填空题选项应留空')
  if (options.length !== 0 && (options.length < 2 || options.length > 6 || new Set(options).size !== options.length)) throw new Error('选择题需有 2–6 个不重复选项')
  if (options.length && !options.includes(answer)) throw new Error('答案必须与某个选项的文字完全一致，不要填写 A/B/C/D')
  return { id: typeof q.id === 'string' && q.id ? q.id : crypto.randomUUID(), grade,
    subject: q.subject as Subject, prompt: text(q.prompt, '题干', 1000), options, answer, type,
    enabled: parseEnabled(q.enabled), semester: parseSemester(q.semester), lesson: parseLesson(q.lesson), lessonTitle: typeof q.lessonTitle === 'string' ? q.lessonTitle.trim().slice(0, 80) : '',
    unit: typeof q.unit === 'string' ? q.unit.trim().slice(0, 80) : '', source: typeof q.source === 'string' ? q.source.trim().slice(0, 300) : '', word: typeof q.word === 'string' ? q.word.trim().slice(0, 80) : '',
    explanation: typeof q.explanation === 'string' ? q.explanation.trim().slice(0, 2000) : '' }
}
export function booleanAnswer(value: unknown) {
  const normalized = String(value ?? '').normalize('NFKC').trim().toLowerCase()
  if (['正确', '对', '是', 'true', '1', '√'].includes(normalized)) return '正确'
  if (['错误', '错', '否', 'false', '0', '×'].includes(normalized)) return '错误'
  return ''
}
function parseEnabled(value: unknown) {
  if (value == null || value === '') return true
  if (typeof value === 'boolean') return value
  if (['true', '1', '启用', '是'].includes(String(value).trim().toLowerCase())) return true
  if (['false', '0', '禁用', '否'].includes(String(value).trim().toLowerCase())) return false
  throw new Error('enabled 请填写 true/false')
}
export function parseQuestions(content: string, filename: string): Question[] {
  let values: unknown[]
  if (filename.toLowerCase().endsWith('.json')) {
    const parsed: unknown = JSON.parse(content.replace(/^\uFEFF/, ''))
    if (!Array.isArray(parsed)) throw new Error('JSON 顶层必须是题目数组')
    values = parsed
  } else if (filename.toLowerCase().endsWith('.csv')) {
    const parsed = Papa.parse<Record<string, string>>(content.replace(/^\uFEFF/, ''), { header: true, skipEmptyLines: 'greedy' })
    if (parsed.errors.length) throw new Error(`CSV 格式错误：${parsed.errors[0].message}`)
    values = parsed.data.map(row => ({ ...row, options: row.options ? row.options.split('|') : [] }))
  } else throw new Error('请选择 .json 或 .csv 题库文件')
  if (!values.length || values.length > 2000) throw new Error('每次请导入 1–2000 道题')
  return values.map((q, i) => {
    try { return { ...validateQuestion(q), id: crypto.randomUUID() } }
    catch (error) { throw new Error(`第 ${i + 1} 道题：${error instanceof Error ? error.message : '格式错误'}`) }
  })
}
export function mergeQuestions(existing: Question[], incoming: Question[]) {
  const key = (q: Question) => JSON.stringify([q.grade, q.subject, parseSemester(q.semester), parseLesson(q.lesson), q.lessonTitle ?? '', getQuestionType(q), q.prompt, q.options, q.answer])
  const keys = new Set(existing.map(key))
  const added = incoming.filter(q => { const k = key(q); if (keys.has(k)) return false; keys.add(k); return true })
  if (existing.length + added.length > 5000) throw new Error('本地题库最多保存 5000 道题，请先整理题库')
  return { questions: [...existing, ...added], added: added.length }
}