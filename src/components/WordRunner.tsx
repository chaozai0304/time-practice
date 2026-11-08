import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Pause, Play, Sparkles, Star, Trophy } from '../ui/icons'
import type { AppData, Attempt } from '../lib/model'
import { gradeLabel } from '../lib/model'
import { prioritizeQuestions } from '../lib/session'
import { gameAttempt, wordGamePool } from '../lib/game'
import { SpeechButton } from './SpeechButton'
import '../ui/word-runner.css'

export function WordRunner({ data, onAttempt, onExit }: { data: AppData; onAttempt: (attempt: Attempt) => void; onExit: () => void }) {
  const pool = useMemo(() => wordGamePool(data.questions, data.settings.grade), [data.questions, data.settings.grade])
  const [order, setOrder] = useState(() => prioritizeQuestions(pool, data.attempts, Date.now(), data.attempts.slice(-5).map(a => a.questionId)))
  const [index, setIndex] = useState(0), [answer, setAnswer] = useState(''), [paused, setPaused] = useState(false), [hidden, setHidden] = useState(document.hidden)
  const [score, setScore] = useState(0), [streak, setStreak] = useState(0), [hint, setHint] = useState(false), [feedback, setFeedback] = useState(''), [pulse, setPulse] = useState(0)
  useEffect(() => { const update = () => setHidden(document.hidden); document.addEventListener('visibilitychange', update); return () => document.removeEventListener('visibilitychange', update) }, [])
  const q = order[index], finished = score >= 10, stopped = paused || hidden || finished
  return <section className="word-game panel" aria-label="单词星际跑酷" data-paused={stopped}>
    <div className="section-heading"><div><span className="eyebrow"><Sparkles size={16} />单词就是你的探索能量</span><h2>单词星际跑酷</h2><p>{gradeLabel(data.settings.grade)} · 用正确拼写发射能量、清理陨石。每轮 10 个单词，完成后休息一下。</p></div><button className="button secondary" onClick={onExit}>返回首页</button></div>
    <div className="runner-world" aria-hidden="true">
      <div className="runner-planet" /><div className="runner-road" />
      {Array.from({ length: 16 }, (_, i) => <i key={i} className="runner-star" style={{ left: `${(i * 37) % 100}%`, top: `${(i * 23) % 68}%`, animationDelay: `${i / 5}s` }} />)}
      {[0,1,2,3].map(i => <div key={`${pulse}-${i}`} className={`runner-rock rock-${i}`} style={{ animationDelay: `${i * 1.8}s` }}>✦</div>)}
      <svg className="runner-ship" viewBox="0 0 120 170"><path fill="#6cdeef" d="M60 12C26 48 33 114 35 135h50C89 89 90 46 60 12Z"/><path fill="#9e89f5" d="M35 89 12 146l29-14Zm50 0 23 57-29-14Z"/><circle cx="60" cy="68" r="18" fill="#152d52" stroke="#e7fbff" strokeWidth="7"/><path fill="#ffd989" d="m43 138 17 29 17-29Z"/></svg>
      {pulse > 0 && <div key={pulse} className="runner-pulse" />}
      <div className="runner-world-label">星际探索 · {score * 100} 米</div>
    </div>
    <div className="runner-hud"><span><Star size={18} />已清理 <strong data-testid="game-score">{score}</strong> / 10</span><span>连续正确 {streak} 次</span><button className="button secondary" disabled={finished} aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? <Play size={17} /> : <Pause size={17} />}{paused ? '继续游戏' : '暂停游戏'}</button></div>
    {!pool.length ? <div className="empty-state"><h3>当前年级还没有启用的英语拼写题</h3><p>请由家长添加英语填空题，或导入词表；停用的题目不会出现在游戏中。</p></div> : finished ? <div className="empty-state"><Trophy size={48} /><h3>探索完成！你点亮了 10 颗单词星</h3><p>作答已记入学习足迹，喝口水，休息一下吧。</p><button className="button primary" onClick={onExit}>收获成长，返回首页</button></div> : q && <div className="runner-question">
      <span className="tag">{q.unit || '英语词汇'} · 中写英</span><h3>{q.prompt.replace(/^看中文写英语[:：]\s*/, '')}</h3>
      <SpeechButton key={`${q.id}-${score}`} question={q} paused={stopped} />
      <form onSubmit={e => {
        e.preventDefault(); if (stopped || !answer.trim()) return
        const attempt = gameAttempt(q, answer, Date.now())
        onAttempt(attempt)
        if (!attempt.correct) { setStreak(0); setFeedback('差一点！看看中文和提示，再试一次。'); return }
        setScore(score + 1); setStreak(streak + 1); setPulse(pulse + 1); setAnswer(''); setHint(false); setFeedback('能量发射！陨石已清理，继续探索。')
        if (index + 1 < order.length) setIndex(index + 1)
        else { setOrder(prioritizeQuestions(pool, [...data.attempts, attempt], Date.now(), order.slice(-5).map(v => v.id))); setIndex(0) }
      }}>
        <label className="field">输入正确英文单词<input aria-label="游戏英文答案" autoComplete="off" spellCheck={false} maxLength={160} disabled={stopped} value={answer} onChange={e => { setAnswer(e.target.value); setFeedback('') }} placeholder="正确拼写，释放能量" /></label>
        <div className="row"><button className="button primary" disabled={stopped || !answer.trim()}>发射单词能量<ArrowRight size={17} /></button><button type="button" className="button secondary" disabled={stopped} onClick={() => setHint(!hint)}>拼写提示</button></div>
      </form>
      {hint && <p className="notice">首字母：{q.answer[0]} · 共 {q.answer.replace(/\s/g, '').length} 个字符。空格和大小写会按规范化方式处理。</p>}
      {feedback && <p role="status" className="runner-feedback">{feedback}</p>}
      {paused && <p className="notice">已暂停，题目与进度会保留。</p>}
    </div>}
    <p className="micro-note">独立应用内游戏，不用于解除后台守护。使用当前年级已启用的英语拼写题，新题与错题加权优先；题量不足时会循环复习。</p>
  </section>
}