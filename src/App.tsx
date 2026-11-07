import { useEffect, useRef, useState } from 'react'
import { App as CapacitorApp } from '@capacitor/app'
import { BookOpen, ChartNoAxesColumn, ChevronRight, CircleHelp, Clock3, House, Settings2, ShieldCheck, Sparkles, Sprout, X } from './ui/icons'
import type { AppData, Attempt, Settings } from './lib/model'
import { idleSession } from './lib/model'
import { loadData, saveData } from './lib/storage'
import { createCredential, verifyPin } from './lib/auth'
import { answerSession, eligibleQuestions, shuffle, startSession, tickSession } from './lib/session'
import { exportFile, isAndroid, isNative, LearningGuard } from './lib/native'
import type { GuardStatus } from './lib/native'
import { PinDialog } from './components/PinDialog'
import { Quiz } from './components/Quiz'
import { SettingsPanel } from './components/SettingsPanel'
import { Dashboard, Records } from './components/Dashboard'
import { Library } from './components/Library'
import { Help } from './components/Help'
import { Celebration } from './components/Celebration'

type Page = 'home' | 'library' | 'records' | 'settings'
const navigation = [{ id: 'home', label: '成长首页', icon: House }, { id: 'library', label: '我的题库', icon: BookOpen }, { id: 'records', label: '学习足迹', icon: ChartNoAxesColumn }, { id: 'settings', label: '家长设置', icon: Settings2 }] as const
function collectAttempts(existing: Attempt[], incoming: Attempt[]) {
  const ids = new Set(existing.map(a => a.id)), added = incoming.filter(a => !ids.has(a.id))
  return added.length ? [...existing, ...added].sort((a, b) => a.at - b.at).slice(-10_000) : existing
}
export default function App() {
  const [data, setData] = useState<AppData | null>(null), [loadError, setLoadError] = useState('')
  const [page, setPage] = useState<Page>('home'), [now, setNow] = useState(() => Date.now())
  const [guard, setGuard] = useState<GuardStatus | null>(null), [busy, setBusy] = useState(false)
  const [toast, setToast] = useState(''), [help, setHelp] = useState(false), [changePassword, setChangePassword] = useState(false)
  const [parent, setParent] = useState<{ reason: string; action: (pin: string) => void | Promise<void> } | null>(null)
  const current = useRef(data)
  useEffect(() => { current.current = data }, [data])
  useEffect(() => {
    let live = true
    loadData().then(d => { if (live) setData(d) }).catch(e => { if (live) setLoadError(e.message) })
    return () => { live = false }
  }, [])
  useEffect(() => { if (data) saveData(data).catch(() => setToast('保存失败：设备存储不可用，请不要退出应用，先导出题库。')) }, [data])
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 5000); return () => clearTimeout(timer) }, [toast])
  useEffect(() => {
    const lifecycle = { polling: false, disposed: false }
    const tick = async () => {
      if (lifecycle.disposed) return
      const time = Date.now(); setNow(time)
      setData(d => { if (!d) return d; const session = tickSession(d.session, time); return session === d.session ? d : { ...d, session } })
      if (isAndroid && !lifecycle.polling) {
        lifecycle.polling = true
        try {
          const status = await LearningGuard.getStatus()
          if (!lifecycle.disposed) { setGuard(status); setData(d => { if (!d) return d; const attempts = collectAttempts(d.attempts, status.attempts); return attempts === d.attempts ? d : { ...d, attempts } }) }
        } catch { if (!lifecycle.disposed) setToast('安卓守护服务不可用，请检查原生安装版本。') }
        finally { lifecycle.polling = false }
      }
    }
    void tick(); const timer = setInterval(() => void tick(), 1000)
    const resume = () => void tick()
    document.addEventListener('visibilitychange', resume)
    const listener = isNative ? CapacitorApp.addListener('appStateChange', resume) : null
    return () => { lifecycle.disposed = true; clearInterval(timer); document.removeEventListener('visibilitychange', resume); void listener?.then(l => l.remove()) }
  }, [])
  useEffect(() => {
    if (!isAndroid) return
    const handle = CapacitorApp.addListener('backButton', () => { if (!current.current?.session.locked) setPage('home') })
    return () => { void handle.then(l => l.remove()) }
  }, [])
  if (loadError) return <div className="loading"><ShieldCheck size={40} /><h2>先保护好你的本地数据</h2><p>{loadError}</p></div>
  if (!data) return <div className="loading"><Sprout size={42} /><p>正在准备一段美好时光…</p></div>
  const nativeActive = isAndroid && !!guard?.active
  const active = nativeActive || data.session.active
  const eligible = eligibleQuestions(data.questions, data.settings)
  const protect = (reason: string, action: (pin: string) => void | Promise<void>) => setParent({ reason, action })
  const stop = async (pin: string) => {
    if (nativeActive) { await LearningGuard.stop({ pin }); setGuard(await LearningGuard.getStatus()) }
    setData(d => d && ({ ...d, session: { ...idleSession } })); setPage('home'); setToast('守护已停止，家长可以安心管理设备。')
  }
  const start = async (practice = false) => {
    setBusy(true)
    try {
      if (active) throw new Error('请先停止当前守护，再开始新的练习')
      const session = startSession(data.questions, data.settings, Date.now(), practice)
      if (isAndroid && !practice) {
        if (!guard?.overlayGranted) { protect('请由家长授权显示在其他应用上层，然后返回开启守护。', async () => { await LearningGuard.requestOverlay() }); return }
        await LearningGuard.start({ questions: shuffle(eligible), settings: data.settings, credential: data.credential! }); setGuard(await LearningGuard.getStatus())
      } else setData({ ...data, session })
      setToast(practice ? '' : '守护已开启，到时间就来学一点！')
    } catch (err) { setToast(err instanceof Error ? err.message : '无法开启守护') }
    finally { setBusy(false) }
  }
  const navigate = (next: Page) => {
    if (next === 'library' || next === 'settings') protect(next === 'library' ? '题库包含答案与编辑功能，请由家长进入。' : '学习规则与密码由家长管理。', () => setPage(next))
    else setPage(next)
  }
  const verifyParent = async (pin: string) => {
    if (Date.now() < data.authBlockedUntil) throw new Error('尝试次数过多，请 30 秒后再试')
    const valid = isAndroid ? (await LearningGuard.verifyParent({ pin, credential: data.credential! })).valid : await verifyPin(pin, data.credential!)
    if (!valid) {
      const failures = data.authFailures + 1
      setData(d => d && ({ ...d, authFailures: failures >= 5 ? 0 : failures, authBlockedUntil: failures >= 5 ? Date.now() + 30_000 : 0 }))
      throw new Error(failures >= 5 ? '已连续输错 5 次，请 30 秒后再试' : '密码不正确，请重试')
    }
    setData(d => d && ({ ...d, authFailures: 0, authBlockedUntil: 0 }))
    await parent?.action(pin); setParent(null)
  }
  const saveSettings = (settings: Settings) => protect('保存新的学习规则，将用于下一次守护。', () => {
    if (active) { setToast('请先停止守护再修改规则'); return }
    setData(d => d && ({ ...d, settings })); setToast('学习规则已保存')
  })
  const recoverGuard = () => protect('恢复已中断的原生服务，保留原来的到期时间与答题进度。', async () => { await LearningGuard.resumeService(); setGuard(await LearningGuard.getStatus()); setToast('原生后台守护已恢复，请切换其他应用验收。') })
  const backgroundSettings = (screen: 'app' | 'battery') => protect('请由家长调整后台活动与电池限制；应用无法自动授予荣耀系统权限。', async () => { await LearningGuard.openBackgroundSettings({ screen }) })
  const exportDiagnostics = () => protect('导出设备与服务运行诊断，不包含家长密码、题目或答案。', async () => {
    const status = await LearningGuard.getStatus()
    const { device, appVersion, active, locked, running, error, overlayGranted, overlayVisible, overlayWidth, overlayHeight, parentVisible, quizActivityVisible, mainForeground, displayState, lastQuizRequestAt, lastQuizActivityAt, lastQuizActivitySource, lastHeartbeatAt, lastOverlayAt, batteryUnrestricted, notificationsAllowed, diagnostics } = status
    await exportFile('学伴守护诊断.json', JSON.stringify({ exportedAt: Date.now(), device, appVersion, active, locked, running, error, overlayGranted, overlayVisible, overlayWidth, overlayHeight, parentVisible, quizActivityVisible, mainForeground, displayState, lastQuizRequestAt, lastQuizActivityAt, lastQuizActivitySource, lastHeartbeatAt, lastOverlayAt, batteryUnrestricted, notificationsAllowed, diagnostics }, null, 2))
  })
  const q = data.questions.find(q => q.id === data.session.queue[data.session.index % data.session.queue.length])
  const pageTitle = navigation.find(n => n.id === page)!.label
  return <>
    <div className="app-shell" inert={data.session.locked || !!parent || !data.credential || help || changePassword ? true : undefined}>
      <aside className="sidebar"><a className="brand" href="#" onClick={e => { e.preventDefault(); setPage('home') }}><span className="brand-mark"><Sprout size={25} /></span><span>学伴时光<small>一点学习，一点成长</small></span></a>
        <div className="nav-label">成长空间</div><nav>{navigation.map(item => <button className={`nav-item ${page === item.id ? 'active' : ''}`} aria-label={item.label} aria-current={page === item.id ? 'page' : undefined} key={item.id} onClick={() => navigate(item.id)}><item.icon size={22} /><span>{item.label}</span>{page === item.id && <span className="nav-dot" />}</button>)}</nav>
        <div className="sidebar-bottom"><div className="offline-card"><ShieldCheck size={22} /><strong>只属于你们的小天地</strong><p>所有题目与记录保存在本机<br />无需账号，也无需联网</p><span><span className="status-dot" />本地模式</span></div><button className="sidebar-help" onClick={() => setHelp(true)}><CircleHelp size={17} />使用指南<ChevronRight size={16} /></button><p className="version">学伴时光 {isAndroid ? `安卓 v${guard?.appVersion || '1.2'}` : 'v1.0'} · 陪伴每一步</p></div>
      </aside>
      <div className="workspace"><header className="topbar"><span className="breadcrumb">成长空间 <ChevronRight size={14} /><strong>{pageTitle}</strong></span><span className="mobile-brand"><Sprout size={22} />学伴时光</span><div className="topbar-actions"><span className="local-pill"><ShieldCheck size={14} />本地安全存储</span><button className="icon-button" aria-label="使用帮助" onClick={() => setHelp(true)}><CircleHelp size={20} /></button><button className="avatar" aria-label="进入家长设置" onClick={() => navigate('settings')}>家</button></div></header>
        <main className="main-content"><div className="page-heading"><div><div className="eyebrow">{page === 'home' ? '每一次小小进步，都值得被看见' : page === 'library' ? '把适合孩子的题目，装进口袋' : page === 'records' ? '每一步成长，都留下足迹' : '温柔的陪伴，也需要清晰的规则'}</div><h1>{page === 'home' ? `你好，${data.settings.name}` : pageTitle}{page === 'home' && <span className="greeting-leaf">✦</span>}</h1><p>{page === 'home' ? '让玩耍有节奏，让学习悄悄发生。' : page === 'library' ? '支持手动添加与批量导入，离线也能随时管理。' : page === 'records' ? '用真实记录，了解孩子的学习节奏。' : '设置一次，让学伴按你们的节奏运行。'}</p></div><div className="date-label"><Clock3 size={16} />{new Date(now).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}</div></div>
          {page === 'home' && <Dashboard data={data} now={now} active={active} deadline={nativeActive ? guard.deadline : data.session.deadline} eligibleCount={eligible.length} busy={busy} guardReady={!isAndroid || !!guard} guardError={guard?.error || (nativeActive && !guard.running ? '请重新启动并检查后台权限' : '')} onStart={() => void start()} onPractice={() => void start(true)} onStop={() => protect('停止守护后，孩子将不再被定时要求答题。', stop)} onSettings={() => navigate('settings')} onLibrary={() => navigate('library')} onRecords={() => setPage('records')} />}
          {page === 'library' && <Library questions={data.questions} grade={data.settings.grade} active={active} protect={protect} notify={setToast} onQuestions={questions => setData(d => d && ({ ...d, questions }))} />}
          {page === 'records' && <Records attempts={data.attempts} active={active} onPractice={() => void start(true)} onExport={() => protect('答题记录包含孩子的学习信息，请确认导出。', () => exportFile('学伴学习记录.json', JSON.stringify(data.attempts, null, 2)))} />}
          {page === 'settings' && <SettingsPanel settings={data.settings} active={active} granted={!!guard?.overlayGranted} guard={guard} onBackground={backgroundSettings} onRecover={recoverGuard} onDiagnostics={exportDiagnostics} onPermission={() => protect('授权浮层后可以在其他应用之上弹出题目。系统设置和卸载仍可能绕过，不能视作系统锁屏。', async () => { await LearningGuard.requestOverlay() })} onPassword={() => protect('验证现有密码后，可设置新的 6 位家长密码。', () => setChangePassword(true))} onSave={saveSettings} />}
        </main>
      </div><nav className="mobile-nav">{navigation.map(n => <button key={n.id} aria-label={n.label} aria-current={page === n.id ? 'page' : undefined} className={page === n.id ? 'active' : ''} onClick={() => navigate(n.id)}><n.icon size={23} /><span>{n.label}</span></button>)}</nav>
    </div>
    {data.session.locked && q && <div data-quiz-layer inert={parent ? true : undefined}><Quiz question={q} correct={data.session.correct} target={data.settings.requiredCorrect} practice={data.session.practice} onParent={() => protect('验证密码后将结束本轮答题，并停止定时守护。', stop)} onAnswer={answer => {
      const result = answerSession(data.session, q, answer, data.settings, Date.now())
      setData({ ...data, session: result.session, attempts: [...data.attempts, result.attempt].slice(-10_000) })
      if (result.passed) setToast(data.session.practice ? '练习完成！每一点努力都值得一个赞。' : '太棒了！已解锁，继续你的快乐时光吧。')
      return result.attempt.correct
    }} /></div>}
    {!data.credential && <PinDialog setup reason="欢迎来到学伴时光。请由家长设置密码，用于管理题库、调整学习规则及停止守护。" blockedUntil={0} verify={async pin => { const credential = await createCredential(pin); setData(d => d && ({ ...d, credential })); setToast('准备好了！开始你们的第一段学伴时光吧。') }} />}
    {parent && <PinDialog reason={parent.reason} blockedUntil={data.authBlockedUntil} verify={verifyParent} onClose={() => setParent(null)} />}
    {changePassword && <PinDialog setup reason="设置新的家长密码，并请妥善保管。" blockedUntil={0} verify={async pin => { const credential = await createCredential(pin); setData(d => d && ({ ...d, credential })); setChangePassword(false); setToast('家长密码已修改') }} onClose={() => setChangePassword(false)} />}
    {help && <Help onClose={() => setHelp(false)} />}
    {(toast.startsWith('练习完成') || toast.startsWith('太棒了')) && <Celebration />}
    {toast && <div className="toast" role="status"><Sparkles size={20} /><span>{toast}</span><button aria-label="关闭提示" onClick={() => setToast('')}><X size={18} /></button></div>}
  </>
}