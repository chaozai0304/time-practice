import { useState } from 'react'
import { LockKeyhole, ShieldCheck } from '../ui/icons'
import { Dialog } from './Dialog'
export function PinDialog({ setup = false, reason, blockedUntil, verify, onClose }: {
  setup?: boolean; reason: string; blockedUntil: number; verify: (pin: string) => Promise<void>; onClose?: () => void
}) {
  const [pin, setPin] = useState(''), [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  return <Dialog title={setup ? '先为成长，设一道保护' : '家长验证'} onClose={onClose}>
    <div className="pin-symbol">{setup ? <ShieldCheck size={30} /> : <LockKeyhole size={28} />}</div>
    <p className="dialog-description">{reason}</p>
    <form onSubmit={async e => {
      e.preventDefault(); setError('')
      if (setup && pin !== confirmation) { setError('两次密码不一致'); return }
      if (Date.now() < blockedUntil) { setError('尝试次数过多，请稍后再试'); return }
      setBusy(true)
      try { await verify(pin) } catch (err) { setError(err instanceof Error ? err.message : '验证失败，请重试') }
      finally { setBusy(false) }
    }}>
      <label className="field">{setup ? '设置 6 位数字密码' : '输入家长密码'}<input autoComplete={setup ? 'new-password' : 'current-password'} type="password" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} required placeholder="••••••" /></label>
      {setup && <label className="field">再输入一次<input type="password" autoComplete="new-password" inputMode="numeric" maxLength={6} value={confirmation} onChange={e => setConfirmation(e.target.value.replace(/\D/g, ''))} required placeholder="••••••" /></label>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button primary full" disabled={busy}>{busy ? '正在验证…' : setup ? '开启学伴时光' : '验证并继续'}</button>
    </form>
    <p className="micro-note">{setup ? '密码仅加盐保存于本机，请由家长保管。忘记密码无法找回，卸载会丢失本地数据。' : '连续输错 5 次将暂停验证 30 秒。'}</p>
  </Dialog>
}