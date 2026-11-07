import { useId, useState } from 'react'
import { Dialog } from './Dialog'
import type { Question, Subject } from '../lib/model'
import { gradeLabel } from '../lib/model'
import { validateQuestion } from '../lib/questions'
export function QuestionEditor({ question, grade, onSave, onClose }: { question?: Question; grade: number; onSave: (q: Question) => void; onClose: () => void }) {
  const formId = useId()
  const [draft, setDraft] = useState({ grade: question?.grade ?? grade, subject: question?.subject ?? '数学' as Subject, prompt: question?.prompt ?? '', options: question?.options.join('\n') ?? '', answer: question?.answer ?? '', explanation: question?.explanation ?? '' })
  const [error, setError] = useState('')
  return <Dialog title={question ? '编辑题目' : '添加一道新题'} onClose={onClose} wide>
    <form onSubmit={e => { e.preventDefault(); try { const q = validateQuestion({ ...draft, id: question?.id, options: draft.options.trim() ? draft.options.split('\n').filter(s => s.trim()) : [] }); onSave(q) } catch (err) { setError(err instanceof Error ? err.message : '请检查题目') } }}>
      <div className="form-grid"><label className="field">年级<select value={draft.grade} onChange={e => setDraft({ ...draft, grade: Number(e.target.value) })}>{[1,2,3,4,5,6].map(g => <option key={g} value={g}>{gradeLabel(g)}</option>)}</select></label><label className="field">学科<select value={draft.subject} onChange={e => setDraft({ ...draft, subject: e.target.value as Subject })}>{['数学','语文','英语'].map(s => <option key={s}>{s}</option>)}</select></label></div>
      <div className="field"><label htmlFor={`${formId}-prompt`}>题目</label><textarea id={`${formId}-prompt`} required maxLength={1000} rows={3} value={draft.prompt} onChange={e => setDraft({ ...draft, prompt: e.target.value })} placeholder="例如：24 × 3 = ？" /></div>
      <div className="field"><label htmlFor={`${formId}-options`}>选项 <span className="muted small">每行一个，留空则为填空题</span></label><textarea id={`${formId}-options`} rows={4} value={draft.options} onChange={e => setDraft({ ...draft, options: e.target.value })} placeholder={'48\n72\n96\n64'} /></div>
      <div className="field"><label htmlFor={`${formId}-answer`}>正确答案</label><input id={`${formId}-answer`} required maxLength={160} value={draft.answer} onChange={e => setDraft({ ...draft, answer: e.target.value })} placeholder="填写答案文字，例如 72，而不是 B" /></div>
      <div className="field"><label htmlFor={`${formId}-explanation`}>解析（答题结束后可在题库查看）</label><textarea id={`${formId}-explanation`} maxLength={2000} rows={2} value={draft.explanation} onChange={e => setDraft({ ...draft, explanation: e.target.value })} /></div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button primary full">保存到本地题库</button>
    </form>
  </Dialog>
}