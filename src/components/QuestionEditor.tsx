import { useId, useState } from 'react'
import { Dialog } from './Dialog'
import type { Question, QuestionType, Semester, Subject } from '../lib/model'
import { getQuestionType, grades, gradeLabel, questionTypeLabels, semesterLabels, subjectsForGrade } from '../lib/model'
import { validateQuestion } from '../lib/questions'
export function QuestionEditor({ question, grade, subject = '数学', semester = 'unspecified', lesson = null, onSave, onClose }: { question?: Question; grade: number; subject?: Subject; semester?: Semester; lesson?: number | null; onSave: (q: Question) => void; onClose: () => void }) {
  const formId = useId()
  const [draft, setDraft] = useState({ grade: question?.grade ?? grade, subject: question?.subject ?? subject, semester: question?.semester ?? semester, lesson: String(question?.lesson ?? lesson ?? ''), lessonTitle: question?.lessonTitle ?? '', type: question ? getQuestionType(question) : 'choice' as QuestionType, enabled: question?.enabled !== false, unit: question?.unit ?? '', source: question?.source ?? '', word: question?.word ?? '', prompt: question?.prompt ?? '', options: question?.options.join('\n') ?? '', answer: question?.answer ?? '', explanation: question?.explanation ?? '' })
  const [error, setError] = useState('')
  return <Dialog title={question ? '编辑题目' : '添加一道新题'} onClose={onClose} wide>
    <form onSubmit={e => { e.preventDefault(); try { const q = validateQuestion({ ...draft, id: question?.id, options: draft.type === 'choice' && draft.options.trim() ? draft.options.split('\n').filter(s => s.trim()) : [] }); onSave(q) } catch (err) { setError(err instanceof Error ? err.message : '请检查题目') } }}>
      <div className="form-grid">
        <div className="field"><label htmlFor={`${formId}-grade`}>年级</label><select id={`${formId}-grade`} value={draft.grade} onChange={e => { const g = Number(e.target.value); setDraft({ ...draft, grade: g, subject: subjectsForGrade(g).includes(draft.subject) ? draft.subject : '数学' }) }}>{grades.map(g => <option key={g} value={g}>{gradeLabel(g)}</option>)}</select></div>
        <div className="field"><label htmlFor={`${formId}-subject`}>学科</label><select id={`${formId}-subject`} value={draft.subject} onChange={e => setDraft({ ...draft, subject: e.target.value as Subject })}>{subjectsForGrade(draft.grade).map(s => <option key={s}>{s}</option>)}</select></div>
        <div className="field"><label htmlFor={`${formId}-type`}>题型</label><select id={`${formId}-type`} value={draft.type} onChange={e => { const type = e.target.value as QuestionType; setDraft({ ...draft, type, answer: type === 'boolean' ? '正确' : '' }) }}>{Object.entries(questionTypeLabels).map(([type, label]) => <option key={type} value={type}>{label}</option>)}</select></div>
        <label className="field">单元/主题<input maxLength={80} value={draft.unit} onChange={e => setDraft({ ...draft, unit: e.target.value })} placeholder="例如：三上 Unit 1 / 分数" /></label>
        <div className="field"><label htmlFor={`${formId}-semester`}>教材册次</label><select id={`${formId}-semester`} value={draft.semester} onChange={e => setDraft({ ...draft, semester: e.target.value as Semester })}>{Object.entries(semesterLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
        <div className="field"><label htmlFor={`${formId}-lesson`}>第几课</label><input id={`${formId}-lesson`} type="number" min={1} max={300} step={1} value={draft.lesson} onChange={e => setDraft({ ...draft, lesson: e.target.value })} placeholder="未标注可留空" /></div>
        <div className="field"><label htmlFor={`${formId}-lesson-title`}>课题名称</label><input id={`${formId}-lesson-title`} maxLength={80} value={draft.lessonTitle} onChange={e => setDraft({ ...draft, lessonTitle: e.target.value })} placeholder="例如：Lesson 1 — Hello" /></div>
      </div>
      <div className="field"><label htmlFor={`${formId}-prompt`}>题目</label><textarea id={`${formId}-prompt`} required maxLength={1000} rows={3} value={draft.prompt} onChange={e => setDraft({ ...draft, prompt: e.target.value })} placeholder="例如：24 × 3 = ？" /></div>
      {draft.type === 'choice' && <div className="field"><label htmlFor={`${formId}-options`}>选项 <span className="muted small">每行一个，需 2–6 个选项</span></label><textarea id={`${formId}-options`} rows={4} value={draft.options} onChange={e => setDraft({ ...draft, options: e.target.value })} placeholder={'48\n72\n96\n64'} /></div>}
      <div className="field"><label htmlFor={`${formId}-answer`}>正确答案</label>{draft.type === 'boolean' ? <select id={`${formId}-answer`} value={draft.answer} onChange={e => setDraft({ ...draft, answer: e.target.value })}><option>正确</option><option>错误</option></select> : <input id={`${formId}-answer`} required maxLength={160} value={draft.answer} onChange={e => setDraft({ ...draft, answer: e.target.value })} placeholder={draft.type === 'choice' ? '填写选项完整文字，不是 B' : '填写准确答案或英文单词'} />}</div>
      <label className="field">教材/来源<input maxLength={300} value={draft.source} onChange={e => setDraft({ ...draft, source: e.target.value })} placeholder="例如：北京版三年级上册，家长校对" /></label>
      {draft.subject === '英语' && <label className="field">对应英语单词（可选）<input maxLength={80} value={draft.word} onChange={e => setDraft({ ...draft, word: e.target.value })} placeholder="apple" /></label>}
      <label className="inline-number"><input type="checkbox" checked={draft.enabled} onChange={e => setDraft({ ...draft, enabled: e.target.checked })} />允许此题在守护与练习中出现</label>
      <div className="field"><label htmlFor={`${formId}-explanation`}>解析（答题结束后可在题库查看）</label><textarea id={`${formId}-explanation`} maxLength={2000} rows={2} value={draft.explanation} onChange={e => setDraft({ ...draft, explanation: e.target.value })} /></div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button primary full">保存到本地题库</button>
    </form>
  </Dialog>
}