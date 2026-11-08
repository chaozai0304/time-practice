import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { App as CapacitorApp } from '@capacitor/app'
import { ArrowRight, Pause, Play, Settings2, Sparkles, Star, Trophy } from '../ui/icons'
import type { AppData, Attempt, GameSettings } from '../lib/model'
import { gradeLabel } from '../lib/model'
import { advanceArena, chineseTarget, createArena, defaultGameSettings, fireWord, gameSettings, wordGamePool } from '../lib/game'
import { SpeechButton } from './SpeechButton'
import { isNative } from '../lib/native'
import { stopEnglishSpeech } from '../lib/speech'
import '../ui/word-runner.css'

export function WordRunner({ data, onAttempt, onExit, onSettings, suspended = false }: { data: AppData; onAttempt: (attempt: Attempt) => void; onExit: () => void; onSettings: (settings: GameSettings) => void; suspended?: boolean }) {
  const pool = useMemo(() => wordGamePool(data.questions, data.settings.grade), [data.questions, data.settings.grade])
  const settings = useMemo(() => gameSettings(data.gameSettings), [data.gameSettings])
  const [arena, setArena] = useState(createArena), engine = useRef(createArena()), runtime = useRef({ settings, history: data.attempts })
  const [answer, setAnswer] = useState(''), [paused, setPaused] = useState(false), [hidden, setHidden] = useState(document.hidden), [configure, setConfigure] = useState(false)
  const [selectedId, setSelectedId] = useState(''), [hint, setHint] = useState(false), [feedback, setFeedback] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const finished = arena.hits >= 10, stopped = paused || hidden || configure || suspended || finished
  const focus = arena.targets.find(t => t.id === selectedId && !t.incoming) ?? arena.targets.find(t => !t.incoming)
  useLayoutEffect(() => { runtime.current = { settings, history: data.attempts } }, [settings, data.attempts])
  useEffect(() => {
    const update = () => setHidden(document.hidden); document.addEventListener('visibilitychange', update)
    const listener = isNative ? CapacitorApp.addListener('appStateChange', state => setHidden(!state.isActive)) : null
    return () => { document.removeEventListener('visibilitychange', update); void listener?.then(handle => handle.remove()) }
  }, [])
  useEffect(() => {
    if (stopped || !pool.length) { stopEnglishSpeech(); return }
    const clock = { frame: 0, previous: 0, painted: 0 }
    const tick = (timestamp: number) => {
      const seconds = clock.previous ? (timestamp - clock.previous) / 1000 : 0; clock.previous = timestamp
      const next = advanceArena(engine.current, seconds, pool, runtime.current.history, Date.now(), runtime.current.settings)
      const changed = next.hits !== engine.current.hits || next.targets.length !== engine.current.targets.length
      engine.current = next
      if (changed || timestamp - clock.painted >= 40) { setArena(next); clock.painted = timestamp }
      clock.frame = requestAnimationFrame(tick)
    }
    clock.frame = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(clock.frame); stopEnglishSpeech() }
  }, [pool, stopped])
  return <section className="word-game" role="dialog" aria-modal="true" aria-label="单词星际跑酷" data-paused={stopped} inert={suspended ? true : undefined}>
    <div className="runner-world" aria-hidden="true"><div className="runner-planet" /><div className="runner-orbit" />{Array.from({ length: 36 }, (_, i) => <i key={i} className="runner-star" style={{ left: `${(i * 37) % 100}%`, top: `${(i * 23) % 100}%` }} />)}</div>
    <header className="game-header"><div><span className="game-kicker"><Sparkles size={15} />SPELL & SHOOT · {gradeLabel(data.settings.grade)}</span><h2>单词星际跑酷</h2><p>中文目标正在下落 · 拼写正确，子弹自动追踪</p></div><div className="game-buttons"><button className="button secondary" onClick={() => setConfigure(true)}><Settings2 size={18} />调整难度</button><button className="button secondary" disabled={finished} aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? <Play size={17} /> : <Pause size={17} />}{paused ? '继续游戏' : '暂停游戏'}</button><button className="button secondary" onClick={onExit}>返回首页</button></div></header>
    <div className="runner-hud"><span><Star size={18} />命中 <strong data-testid="game-score">{arena.hits}</strong> / 10</span><span>连击 {arena.streak}</span><span>漏词 <strong data-testid="game-misses">{arena.misses}</strong></span><span className="game-rate">每 {settings.spawnIntervalSeconds} 秒出现 · 速度 {settings.fallSpeed}</span></div>
    <div className="game-playfield" aria-label="中文目标与子弹场景" data-testid="game-arena">
      <div className="game-danger-line"><span>在中文目标越过这条线前完成拼写</span></div>
      {arena.targets.map(target => <button key={target.id} type="button" className={`game-target ${focus?.id === target.id ? 'locked' : ''} ${target.incoming ? 'incoming' : ''}`} aria-label={`锁定中文目标 ${chineseTarget(target.question)}`} aria-pressed={focus?.id === target.id} disabled={stopped || target.incoming} data-target-id={target.id} data-question-id={target.question.id} data-y={target.y.toFixed(2)} style={{ left: `${target.x}%`, top: `${target.y}%` }} onClick={() => { setSelectedId(target.id); setHint(false); input.current?.focus({ preventScroll: true }) }}><span className="target-orbit" aria-hidden="true">✦</span><span className="target-chinese" data-testid="game-chinese">{chineseTarget(target.question)}</span><small>{target.incoming ? '子弹追踪中' : focus?.id === target.id ? '已锁定' : '中文目标'}</small></button>)}
      <svg className="game-effects" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">
        {arena.bullets.map(bullet => <g key={bullet.id} data-testid="game-bullet" className="game-bullet" transform={`translate(${bullet.x * 10} ${bullet.y * 10}) rotate(${bullet.angle})`}><path d="M0 6V40" stroke="#53defb" strokeWidth="7" strokeLinecap="round" opacity=".6" /><ellipse rx="6" ry="18" fill="#f8ffda" /><ellipse rx="11" ry="24" fill="none" stroke="#8df9ff" strokeWidth="3" /></g>)}
        {arena.bursts.map(burst => <g key={burst.id} className="game-hit" data-testid="game-hit" opacity={burst.life / .65}><circle cx={burst.x * 10} cy={burst.y * 10} r={(.65 - burst.life) * 100 + 20} fill="none" stroke="#a6ffff" strokeWidth="5" />{[0,1,2,3,4,5].map(i => <circle key={i} cx={burst.x * 10 + Math.cos(i * Math.PI / 3) * (1 - burst.life) * 60} cy={burst.y * 10 + Math.sin(i * Math.PI / 3) * (1 - burst.life) * 60} r="5" fill="#ffe79b" />)}</g>)}
      </svg>
      <svg className="runner-ship" viewBox="0 0 120 170" aria-hidden="true"><path fill="#6cdeef" d="M60 12C26 48 33 114 35 135h50C89 89 90 46 60 12Z"/><path fill="#9e89f5" d="M35 89 12 146l29-14Zm50 0 23 57-29-14Z"/><circle cx="60" cy="68" r="18" fill="#152d52" stroke="#e7fbff" strokeWidth="7"/><path fill="#ffd989" d="m43 138 17 29 17-29Z"/></svg>
    </div>
    {!pool.length ? <div className="game-overlay"><h3>当前年级还没有启用的英语拼写题</h3><p>请由家长添加题目或导入英语词表。</p></div> : finished ? <div className="game-overlay"><Trophy size={48} /><h3>探索完成！成功命中 10 个中文目标</h3><p>作答已保存。喝口水，让眼睛休息一下。</p><button className="button primary" onClick={onExit}>收获成长，返回首页</button></div> : <div className="game-input-dock runner-question">
      <div className="game-lock-status">{focus ? <>锁定中文：<strong>{chineseTarget(focus.question)}</strong></> : '等待子弹命中或下一个中文目标…'}<span>可填写场上任意目标的正确英文</span></div>
      <form onSubmit={event => { event.preventDefault(); if (stopped) return; const result = fireWord(engine.current, answer, Date.now(), selectedId); engine.current = result.state; setArena(result.state); setFeedback(result.message); if (result.attempt) onAttempt(result.attempt); if (result.attempt?.correct) { setAnswer(''); setHint(false) } }}>
        <label className="game-answer-label" htmlFor="game-english-answer">输入英文，按 Enter 或点击发射</label>
        <div className="game-fire-row"><input ref={input} id="game-english-answer" aria-label="游戏英文答案" autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={80} disabled={stopped || !focus || arena.hits + arena.bullets.length >= 10} value={answer} onChange={event => { setAnswer(event.target.value); setFeedback('') }} placeholder="看到中文 → 输入英文 → 发射" /><button className="button primary" disabled={stopped || !focus || !answer.trim() || arena.hits + arena.bullets.length >= 10}>发射子弹<ArrowRight size={17} /></button><button type="button" className="button secondary" disabled={stopped || !focus} onClick={() => setHint(!hint)}>拼写提示</button></div>
      </form>
      {hint && focus && <p className="game-hint">首字母：{focus.question.answer[0]} · 共 {focus.question.answer.replace(/\s/g, '').length} 个字符。</p>}
      {feedback && <p role="status" className="runner-feedback">{feedback}</p>}
      {focus && <SpeechButton key={focus.id} question={focus.question} paused={stopped} />}
      <p className="game-footnote">新题/错题加权 · 漏词不伪造作答记录 · 本游戏不能解除学习守护</p>
    </div>}
    {paused && !configure && !finished && <div className="game-pause-banner">已暂停，中文目标、子弹和输入草稿均保留</div>}
    {configure && <div className="game-settings-mask"><section className="game-settings" role="dialog" aria-modal="true" aria-label="调整游戏难度"><h3>调整游戏难度</h3><p>调节时场景暂停；设置自动保存在本机。</p><label className="field" htmlFor="game-frequency">中文出现间隔：每 {settings.spawnIntervalSeconds} 秒一个<input id="game-frequency" aria-label="中文出现间隔" type="range" min={1} max={12} step={.5} value={settings.spawnIntervalSeconds} onChange={event => onSettings({ ...settings, spawnIntervalSeconds: Number(event.target.value) })} /></label><p>间隔越小，中文出现越频繁；同时最多 3 个目标。</p><label className="field" htmlFor="game-fall-speed">目标下落速度：{settings.fallSpeed}<input id="game-fall-speed" aria-label="目标下落速度" type="range" min={1} max={8} step={.5} value={settings.fallSpeed} onChange={event => onSettings({ ...settings, fallSpeed: Number(event.target.value) })} /></label><p>速度越大，留给拼写的时间越短。慢速更适合初学者。</p><div className="game-buttons"><button className="button secondary" onClick={() => onSettings(defaultGameSettings)}>恢复默认难度</button><button className="button primary" onClick={() => setConfigure(false)}>保存并返回游戏</button></div></section></div>}
  </section>
}