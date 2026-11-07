import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { X } from '../ui/icons'

export function Dialog({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose?: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose }, [onClose])
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const root = ref.current
    const first = root?.querySelector<HTMLElement>('input, textarea, select') ?? root?.querySelector<HTMLElement>('button')
    first?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current?.() }
      if (event.key !== 'Tab') return
      const items = Array.from(root?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select, textarea, [tabindex="0"]') ?? [])
      if (!items.length) return
      if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1)?.focus() }
      else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0].focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('keydown', onKey); previous?.focus() }
  }, [])
  return <div className="modal-backdrop"><div ref={ref} className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
    <div className="modal-heading"><h2>{title}</h2>{onClose && <button className="icon-button" aria-label="关闭弹窗" onClick={onClose}><X size={20} /></button>}</div>
    {children}
  </div></div>
}