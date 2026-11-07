import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { GuardPortal } from './components/GuardPortal'
function NativeGuardMotion() {
  const [state, setState] = useState({ progress: 0, paused: false })
  useEffect(() => {
    const apply = (detail: unknown) => {
      if (!detail || typeof detail !== 'object') return
      const value = detail as Record<string, unknown>
      setState({ progress: typeof value.progress === 'number' && Number.isFinite(value.progress) ? Math.min(1, Math.max(0, value.progress)) : 0, paused: value.paused === true })
    }
    const update = (event: Event) => apply((event as CustomEvent<unknown>).detail)
    window.addEventListener('sprout:guard-motion', update)
    apply((window as Window & { __sproutGuardMotion?: unknown }).__sproutGuardMotion)
    return () => window.removeEventListener('sprout:guard-motion', update)
  }, [])
  return <GuardPortal progress={state.progress} externalPaused={state.paused} controls={false} />
}
createRoot(document.getElementById('root')!).render(<NativeGuardMotion />)