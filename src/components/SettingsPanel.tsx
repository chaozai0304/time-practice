import { useState } from 'react'
import { Check, LockKeyhole, Save, ShieldCheck, Smartphone } from '../ui/icons'
import type { Settings, Subject } from '../lib/model'
import { grades, gradeLabel, subjectsForGrade, validateSettings } from '../lib/model'
import { isAndroid } from '../lib/native'
import type { GuardStatus } from '../lib/native'
export function SettingsPanel({ settings, onSave, onPassword, onPermission, granted, active, guard, onBackground, onRecover, onDiagnostics }: { settings: Settings; onSave: (s: Settings) => void; onPassword: () => void; onPermission: () => void; granted: boolean; active: boolean; guard: GuardStatus | null; onBackground: (screen: 'app' | 'battery') => void; onRecover: () => void; onDiagnostics: () => void }) {
  const [draft, setDraft] = useState({ ...settings }), [error, setError] = useState('')
  return <div className="settings-layout"><section className="panel">
    <div className="section-heading"><div><h2>把节奏交给家长</h2><p>适合孩子的，才是最好的学习节奏。</p></div><span className="soft-icon"><ShieldCheck /></span></div>
    <form onSubmit={e => { e.preventDefault(); try { validateSettings(draft); onSave({ ...draft, name: draft.name.trim() }) } catch (err) { setError(err instanceof Error ? err.message : '请检查设置') } }}>
      <label className="field">孩子的昵称<input required maxLength={20} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /></label>
      <label className="field">学习年级<select value={draft.grade} onChange={e => { const grade = Number(e.target.value); const subjects = draft.subjects.filter(s => subjectsForGrade(grade).includes(s)); setDraft({ ...draft, grade, subjects: subjects.length ? subjects : ['数学'] }) }}>{grades.map(g => <option key={g} value={g}>{gradeLabel(g)}</option>)}</select></label>
      <div className="field">答题学科<div className="subject-selector">{subjectsForGrade(draft.grade).map((s: Subject) => <button key={s} type="button" className={`chip ${draft.subjects.includes(s) ? 'active' : ''}`} onClick={() => setDraft({ ...draft, subjects: draft.subjects.includes(s) ? draft.subjects.filter(v => v !== s) : [...draft.subjects, s] })}>{draft.subjects.includes(s) && <Check size={14} />}{s}</button>)}</div></div>
      <p className="small muted">只抽取当前年级、所选学科中已启用的题目。未做题与高错率题加权优先，最近出现的题目降权。可在题库按单元、题型决定哪些题出现。</p>
      <div className="setting-block"><div className="row between"><label htmlFor="interval">每隔多久答题</label><strong>{draft.intervalMinutes} <span>分钟</span></strong></div><input id="interval" type="range" min={1} max={120} value={draft.intervalMinutes} onChange={e => setDraft({ ...draft, intervalMinutes: Number(e.target.value) })} /><div className="range-labels"><span>1 分钟</span><span>120 分钟</span></div><label className="inline-number">精确设置<input aria-label="答题间隔分钟数" type="number" min={1} max={120} value={draft.intervalMinutes} onChange={e => setDraft({ ...draft, intervalMinutes: Number(e.target.value) })} />分钟</label></div>
      <div className="setting-block"><div className="row between"><label htmlFor="required">答对几题可以继续玩</label><strong>{draft.requiredCorrect} <span>道</span></strong></div><input id="required" type="range" min={1} max={20} value={draft.requiredCorrect} onChange={e => setDraft({ ...draft, requiredCorrect: Number(e.target.value) })} /><p className="small muted">累计答对后解锁；答错留在当前题，不会自动放行。</p></div>
      {active && <p className="notice">守护运行中。请先通过家长密码停止守护，再修改规则。</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button primary" disabled={active}><Save size={17} />保存学习规则</button>
    </form>
  </section><div className="settings-aside"><section className="panel"><span className="soft-icon lavender"><LockKeyhole /></span><h3>家长安全区</h3><p className="muted small">修改规则、管理题库与退出守护均需密码。不要把密码告诉孩子。</p><button className="button secondary full" onClick={onPassword} disabled={active}>修改家长密码</button></section><section className="panel"><span className="soft-icon amber"><Smartphone /></span><h3>设备与权限</h3><p className="muted small">{isAndroid ? '跨应用答题需要「显示在其他应用上层」权限。授权后还需允许后台活动，系统可能停止后台服务或隐藏浮层。' : '当前支持应用内定时答题。iOS 不允许普通应用遮挡其他 App，可配合系统「引导式访问」使用。'}</p>{isAndroid && <>
    <button className="button secondary full" onClick={onPermission}>{granted ? '查看浮层授权' : '授权跨应用浮层'}</button>
    <h4>荣耀 / 华为平板后台检查</h4><ol className="small muted"><li>设置 → 应用启动管理 → 学伴时光：关闭自动管理，允许自启动、关联启动和后台活动（名称随系统版本变化）。</li><li>电池设置中取消本应用的后台限制；允许悬浮窗、后台弹出界面（若系统提供该项）及通知。</li><li>从完整屏幕开启守护后按 Home 切换其他应用；不要只用小窗或“先练习一下”验收。</li></ol>
    <button className="button secondary full" onClick={() => onBackground('app')}>打开应用后台设置</button><button className="button secondary full" onClick={() => onBackground('battery')}>查看电池优化设置</button>
    <h4>原生守护诊断</h4><p className="small muted">{guard?.device || '正在读取设备信息'} · 安装版本 {guard?.appVersion || '读取中'}</p>
    <ul className="small muted"><li>服务：{guard?.running ? '原生计时已确认运行' : guard?.active ? '已中断，不能保证后台答题' : '未开启'}</li><li>浮层：{guard?.overlayVisible ? `已挂载 ${guard.overlayWidth} × ${guard.overlayHeight}（不代表系统未遮挡）` : guard?.parentVisible ? '家长数字键盘页接管' : guard?.quizActivityVisible ? '普通原生答题页接管' : guard?.locked ? '到期但未挂载，请检查权限' : '等待到期'}</li><li>通知：{guard?.notificationsAllowed ? '允许' : '未允许，可能看不到恢复提醒'}</li><li>电池优化：{guard?.batteryUnrestricted ? '系统报告已豁免' : '系统报告未豁免，请检查限制'}</li><li>最近心跳：{guard?.lastHeartbeatAt ? new Date(guard.lastHeartbeatAt).toLocaleTimeString('zh-CN') : '暂无'}</li><li>最近浮层：{guard?.lastOverlayAt ? new Date(guard.lastOverlayAt).toLocaleTimeString('zh-CN') : '暂无'}</li><li>后台答题请求：{guard?.lastQuizRequestAt ? new Date(guard.lastQuizRequestAt).toLocaleTimeString('zh-CN') : '暂无'}</li><li>原生页面显示：{guard?.lastQuizActivityAt ? `${new Date(guard.lastQuizActivityAt).toLocaleTimeString('zh-CN')}（${guard.lastQuizActivitySource === 'notification' ? '用户点击通知' : '自动入口'}）` : '未确认'}</li></ul>
    <p className="small muted">到期时除浮层外，会尝试普通原生答题页；仍需荣耀允许后台弹出，不能绕过系统限制。家长退出请点页面内数字键盘，不再唤起系统输入法。</p>
    {guard?.error && <p className="form-error">{guard.error}</p>}
    {guard?.active && !guard.running && <button className="button primary full" onClick={onRecover}>恢复后台守护（保留原到期时间）</button>}
    <button className="button secondary full" onClick={onDiagnostics}>导出运行诊断（不含密码与题目）</button>
    <p className="small muted">密码页若被系统阻止打开，可点持续守护通知里的“家长退出”。强制停止、卸载、系统安全界面无法由普通 App 阻止。</p>
  </>}<div className="local-label"><ShieldCheck size={15} />不联网 · 不采集孩子信息</div></section></div></div>
}