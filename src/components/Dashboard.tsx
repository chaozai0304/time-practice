import { ArrowRight, BookOpen, ChartNoAxesColumn, Check, Clock3, Flame, GraduationCap, Leaf, Play, Settings2, ShieldCheck, Sparkles, Sprout, Square, Star, Target, Trophy } from '../ui/icons'
import type { AppData, Attempt } from '../lib/model'
import { gradeLabel } from '../lib/model'
import { formatCountdown } from '../lib/session'
import { isAndroid } from '../lib/native'
import { MotionIsland } from './MotionIsland'

const dayKey = (at: number) => new Date(at).toLocaleDateString('sv-SE')
export function Stat({ icon: Icon, color, label, value, unit, note }: { icon: typeof Check; color: string; label: string; value: string | number; unit: string; note: string }) {
  return <section className="stat-card">
    <div className="row between"><span className="stat-label">{label}</span><span className={`soft-icon ${color}`}><Icon size={22} /></span></div>
    <div className="stat-value">{value}<span>{unit}</span></div><p>{note}</p>
  </section>
}
export function Dashboard({ data, now, active, deadline, eligibleCount, busy, guardReady, guardError, onStart, onPractice, onStop, onSettings, onLibrary, onRecords }: {
  data: AppData; now: number; active: boolean; deadline: number; eligibleCount: number; busy: boolean; guardReady: boolean; guardError: string
  onStart: () => void; onPractice: () => void; onStop: () => void; onSettings: () => void; onLibrary: () => void; onRecords: () => void
}) {
  const today = data.attempts.filter(a => dayKey(a.at) === dayKey(now)), correct = today.filter(a => a.correct).length
  const target = data.settings.requiredCorrect
  const growth = Math.min(3, 1 + Math.floor(correct / Math.max(1, target)))
  const streak = (() => {
    const days = new Set(data.attempts.map(a => dayKey(a.at))), date = new Date(now)
    let count = 0
    if (!days.has(dayKey(+date))) date.setDate(date.getDate() - 1)
    while (days.has(dayKey(+date))) { count++; date.setDate(date.getDate() - 1) }
    return count
  })()
  return <>
    <section className="hero-card">
      <div className="hero-copy">
        <span className="hero-label"><Sparkles size={16} />欢迎来到你的学习小宇宙</span>
        <h2>玩一会，<br /><span>学一点。</span></h2>
        <p>让每一次好奇，都长成新的本领。<br />和学伴一起，把知识装进小小世界。</p>
        <div className="hero-buttons">
          <button className="button primary" onClick={active ? onStop : onStart} disabled={busy || !guardReady}>
            {active ? <Square size={18} /> : <Play size={18} weight="fill" />}{busy ? '准备中…' : active ? '家长停止守护' : '开启学习守护'}<ArrowRight size={18} />
          </button>
          <button className="button hero-secondary" onClick={onPractice} disabled={active || busy}><Sparkles size={18} />先练习一下</button>
        </div>
        <span className="hero-footnote"><ShieldCheck size={16} />{isAndroid ? '授权后支持跨应用答题浮层' : '应用内守护 · 离线可用 · 无广告'}</span>
      </div>
      <MotionIsland growth={growth} celebrating={correct >= target} />
    </section>
    <section className="daily-quest" aria-label="今日学习目标">
      <span className="quest-icon"><Trophy size={25} /></span>
      <div className="quest-copy"><h3>{correct >= target ? '今日小目标，已经完成！' : '今天，也为好奇心充个电'}</h3><p>答对 {target} 道题，收获一次小小成长。不用着急，慢慢来。</p></div>
      <div className="quest-progress"><span><strong>{Math.min(correct, target)}</strong> / {target} 道</span><progress aria-label="今日探索进度" max={target} value={Math.min(correct, target)} /></div>
    </section>
    <div className="stat-grid">
      <Stat icon={Check} color="green" label="今天答对" value={correct} unit="道题" note={today.length ? `已尝试 ${today.length} 次，继续加油` : '第一道小题，等你来挑战'} />
      <Stat icon={Target} color="lavender" label="今日正确率" value={today.length ? Math.round(correct / today.length * 100) : '—'} unit={today.length ? '%' : ''} note="每一次尝试，都是进步" />
      <Stat icon={Flame} color="amber" label="连续学习" value={streak} unit="天" note="好习惯，从今天开始" />
    </div>
    <div className="home-columns">
      <section className="panel guard-panel">
        <div className="section-heading"><div><h2><span className="heading-dot" />学习守护</h2><p>玩耍与学习，刚刚好的平衡。</p></div><span className={`badge ${active && !guardError ? 'live' : ''}`}><span className="status-dot" />{guardError ? '守护需要检查' : active ? '守护运行中' : '等待开启'}</span></div>
        <div className="timer-row">
          <div className={`timer-ring ${active ? 'running' : ''}`}><Clock3 size={24} /><strong>{active ? formatCountdown(deadline - now) : `${String(data.settings.intervalMinutes).padStart(2, '0')}:00`}</strong><span>{active ? '距离下次答题' : '每轮玩耍时间'}</span></div>
          <div className="guard-details">
            <div><span className="detail-icon"><Clock3 size={18} /></span><span>答题间隔</span><strong>{data.settings.intervalMinutes} 分钟</strong></div>
            <div><span className="detail-icon"><GraduationCap size={18} /></span><span>过关目标</span><strong>答对 {target} 题</strong></div>
            <div><span className="detail-icon"><BookOpen size={18} /></span><span>学习范围</span><strong>{gradeLabel(data.settings.grade)} · {data.settings.subjects.join(' / ')}</strong></div>
          </div>
        </div>
        <div className="guard-tip"><Leaf size={18} /><span>答错没关系，继续思考，答对就能继续玩。</span><button onClick={onSettings} aria-label="调整学习规则"><Settings2 size={20} /></button></div>
        {guardError && <><p className="form-error">守护状态异常：{guardError}</p><button className="button secondary" onClick={onSettings}>检查后台权限与恢复服务</button></>}
      </section>
      <section className="panel weekly-panel">
        <div className="section-heading"><div><h2>一周小成长</h2><p>不求快，每天进步一点点。</p></div><span className="soft-icon amber"><Star size={22} /></span></div>
        <WeekChart attempts={data.attempts} now={now} />
        <div className="weekly-footer"><span><span className="legend-dot" />答对题数</span><button className="text-button" onClick={onRecords}>查看足迹<ArrowRight size={16} /></button></div>
      </section>
    </div>
    <section className="library-teaser"><span className="teaser-icon"><BookOpen size={28} /></span><div><h3>你的专属小题库</h3><p>已收录 {data.questions.length} 道题，当前学习范围有 {eligibleCount} 道。</p></div><span className="tag">{gradeLabel(data.settings.grade)}</span><button className="button secondary" onClick={onLibrary}>管理题库<ArrowRight size={18} /></button></section>
    <div className="bottom-note"><Sprout size={18} />学习不是打断快乐，而是让快乐多一点收获。</div>
  </>
}
function WeekChart({ attempts, now }: { attempts: Attempt[]; now: number }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now); d.setDate(d.getDate() - 6 + i)
    return { label: ['日','一','二','三','四','五','六'][d.getDay()], count: attempts.filter(a => a.correct && dayKey(a.at) === dayKey(+d)).length }
  })
  const max = Math.max(5, ...days.map(d => d.count))
  return <div className="week-chart" role="img" aria-label={days.map((d, i) => `${i === 6 ? '今天' : `周${d.label}`}答对${d.count}道`).join('，')}>
    {days.map((d, i) => <div className={`chart-day ${i === 6 ? 'today' : ''}`} key={i}><span className="chart-count">{d.count || ''}</span><div className="bar-track"><div className="bar-fill" style={{ height: `${d.count / max * 100}%` }} /></div><span className="day-label">{i === 6 ? '今天' : `周${d.label}`}</span></div>)}
  </div>
}
export function Records({ attempts, active, onPractice, onExport }: { attempts: Attempt[]; active: boolean; onPractice: () => void; onExport: () => void }) {
  return <>
    <div className="stat-grid"><Stat icon={BookOpen} color="green" label="累计尝试" value={attempts.length} unit="次" note="每一次认真都算数" /><Stat icon={Check} color="lavender" label="累计答对" value={attempts.filter(a => a.correct).length} unit="道" note="知识在一点点积累" /><Stat icon={Flame} color="amber" label="学习天数" value={new Set(attempts.map(a => dayKey(a.at))).size} unit="天" note="记录属于你的成长" /></div>
    <section className="panel"><div className="section-heading"><div><h2>最近的学习足迹</h2><p>保留最近 10,000 次答题记录，不记录其他 App 使用情况。</p></div><button className="button secondary" onClick={onExport}><ChartNoAxesColumn size={18} />导出记录</button></div>
      {!attempts.length ? <div className="empty-state"><Sprout size={48} /><h3>成长的故事，从第一题开始</h3><p>完成一次练习后，这里就会留下学习足迹。</p><button className="button primary" disabled={active} onClick={onPractice}>开始小练习<ArrowRight size={18} /></button></div> : <div className="records-list">{[...attempts].reverse().slice(0, 100).map(a => <div key={a.id} className="record-item"><span className={`record-result ${a.correct ? 'correct' : 'retry'}`}>{a.correct ? <Check size={20} /> : <Settings2 size={20} />}</span><div><h3>{a.prompt}</h3><p>{a.subject} · 作答：{a.answer} · {a.correct ? '答对啦' : '继续思考'}</p></div><time>{new Date(a.at).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</time></div>)}</div>}
    </section>
  </>
}