import { useState } from 'react'
import { ArrowRight, Check, LockKeyhole, Sparkles, Star } from '../ui/icons'
import type { Question } from '../lib/model'
import { gradeLabel } from '../lib/model'
import { shuffle } from '../lib/session'
import { GuardPortal } from './GuardPortal'
export function Quiz({ question, correct, target, practice, onAnswer, onParent }: {
  question: Question; correct: number; target: number; practice: boolean; onAnswer: (answer: string) => boolean; onParent: () => void
}) {
  return <div className="quiz-screen" role="dialog" aria-modal="true" aria-label="答题时间">
    <GuardPortal background progress={correct / target} />
    <header className="quiz-header"><span className="brand"><span className="brand-mark"><Sparkles size={20} /></span>学伴时光</span><button className="button ghost" onClick={onParent}><LockKeyhole size={16} />家长退出</button></header>
    <main className="quiz-content">
      <div className="eyebrow"><Star size={16} /> {practice ? '小小练习时间' : '玩耍暂停 · 成长继续'}</div>
      <h1>给大脑充个电吧！</h1><p>答对 {target} 道题，就能继续探索。慢慢想，你一定可以。</p>
      <div className="quiz-progress" aria-label={`已答对 ${correct} 道，共 ${target} 道`}>{Array.from({ length: target }, (_, i) => <span key={i} className={i < correct ? 'done' : ''}>{i < correct ? <Check size={18} /> : i + 1}</span>)}</div>
      <QuizQuestion key={`${question.id}-${correct}`} question={question} correct={correct} target={target} onAnswer={onAnswer} />
      <p className="quiz-footer"><span aria-hidden="true">✦</span>每一点努力，都会长成大大的进步</p>
    </main>
  </div>
}
function QuizQuestion({ question, correct, target, onAnswer }: { question: Question; correct: number; target: number; onAnswer: (answer: string) => boolean }) {
  const [answer, setAnswer] = useState(''), [error, setError] = useState(false)
  const [options] = useState(() => shuffle(question.options))
  return <section className="question-card">
        <div className="row between"><span className="tag">{gradeLabel(question.grade)} · {question.subject}</span><span className="muted small">第 {correct + 1} / {target} 题</span></div>
        <h2>{question.prompt}</h2>
        <form onSubmit={e => { e.preventDefault(); if (onAnswer(answer)) { setAnswer(''); setError(false) } else { setError(true); setAnswer('') } }}>
          {options.length ? <div className="answer-grid">{options.map((option, i) => <button key={option} type="button" className={`answer-option ${answer === option ? 'selected' : ''}`} aria-pressed={answer === option} onClick={() => { setAnswer(option); setError(false) }}><span>{String.fromCharCode(65 + i)}</span>{option}{answer === option && <Check size={18} />}</button>)}</div> : <label className="field">你的答案<input value={answer} onChange={e => { setAnswer(e.target.value); setError(false) }} placeholder="在这里填写答案" autoComplete="off" required /></label>}
          {error && <div className="gentle-error" role="alert">差一点点！再仔细读一遍题目，试试其他答案。答错不会扣分。</div>}
          <button className="button primary full" disabled={!answer.trim()}>确认答案<ArrowRight size={18} /></button>
        </form>
      </section>
}