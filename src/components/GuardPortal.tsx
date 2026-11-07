import { Component, lazy, Suspense, useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { ReactNode, RefObject } from 'react'
import { createPortal } from 'react-dom'
import type { PlayerRef } from '@remotion/player'
import { Pause, Play } from '../ui/icons'
import '../ui/guard-portal.css'

const subscribeMotion = (notify: () => void) => { const m = matchMedia('(prefers-reduced-motion: reduce)'); m.addEventListener('change', notify); return () => m.removeEventListener('change', notify) }
const motionSnapshot = () => matchMedia('(prefers-reduced-motion: reduce)').matches
type RuntimeProps = { progress: number; playing: boolean; playerRef: RefObject<PlayerRef | null>; onFailure: () => void; width: number; height: number }
const GatePlayer = lazy(() => Promise.all([import('@remotion/player'), import('../motion/KnowledgeGate')]).then(([{ Player }, { KnowledgeGate }]) => ({ default: function Runtime({ progress, playing, playerRef, onFailure, width, height }: RuntimeProps) {
  useEffect(() => { if (playing) playerRef.current?.play(); else playerRef.current?.pause() }, [playing, playerRef])
  return <Player ref={playerRef} component={KnowledgeGate} inputProps={{ progress }} durationInFrames={1800} fps={30} compositionWidth={width} compositionHeight={height} controls={false} autoPlay={false} loop clickToPlay={false} doubleClickToFullscreen={false} spaceKeyToPlayOrPause={false} style={{ width: '100%', height: '100%' }} errorFallback={() => <PortalFailure onFailure={onFailure} />} />
} })))
function PortalFailure({ onFailure }: { onFailure: () => void }) { useEffect(onFailure, [onFailure]); return <StaticGate /> }
class PortalBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { this.props.onFailure() }
  render() { return this.state.failed ? <StaticGate /> : this.props.children }
}
function StaticGate() {
  return <svg className="portal-fallback" viewBox="0 0 1400 900" preserveAspectRatio="xMidYMid slice" role="img" aria-label="知识星门静态画面">
    <defs><radialGradient id="cosmic-nebula"><stop stopColor="#644186" stopOpacity=".55"/><stop offset=".5" stopColor="#194375" stopOpacity=".3"/><stop offset="1" stopColor="#040819" stopOpacity="0"/></radialGradient><radialGradient id="cosmic-planet" cx=".2" cy=".2"><stop stopColor="#c8a9b5"/><stop offset=".5" stopColor="#6d617e"/><stop offset="1" stopColor="#151a32"/></radialGradient></defs>
    <rect width="1400" height="900" fill="#040819"/><ellipse cx="690" cy="350" rx="870" ry="260" transform="rotate(-22 690 350)" fill="url(#cosmic-nebula)"/>
    {Array.from({length:220},(_,i)=><circle key={i} cx={(i*173)%1400} cy={(i*97)%900} r={i%9?.7:1.6} fill={i%4?'#b4c9f0':'#e0c6f7'} opacity={.3+i%5*.1}/>)}
    <g transform="translate(390 440) rotate(-23)">{[265,285,318].map((r,i)=><ellipse key={r} rx={r} ry={r*.86} fill="none" stroke={i%2?'#9779ca':'#7cbad2'} strokeWidth={i===0?1.7:.8} opacity=".3"/>)}</g>
    <g transform="translate(1170 205) rotate(-23)"><ellipse rx="256" ry="59" fill="none" stroke="#9b859c" strokeWidth="17" opacity=".32"/><circle r="134" fill="url(#cosmic-planet)"/><path d="M-256 0a256 59 0 0 0 512 0" fill="none" stroke="#b4a0b9" strokeWidth="15" opacity=".35"/></g>
    <circle cx="140" cy="750" r="57" fill="#254161" opacity=".85"/>
  </svg>
}
export function GuardPortal({ progress = 0, controls = true, externalPaused = false, background = false }: { progress?: number; controls?: boolean; externalPaused?: boolean; background?: boolean }) {
  const root = useRef<HTMLDivElement>(null), player = useRef<PlayerRef>(null)
  const reduced = useSyncExternalStore(subscribeMotion, motionSnapshot, () => true)
  const [capable, setCapable] = useState(false), [ready, setReady] = useState(false), [visible, setVisible] = useState(false), [paused, setPaused] = useState(false)
  const [foreground, setForeground] = useState(true), [blocked, setBlocked] = useState(false)
  const [dimensions, setDimensions] = useState({ width: 900, height: 560 })
  const [controlsHost, setControlsHost] = useState<Element | null>(null)
  const failed = useCallback(() => setCapable(false), [])
  useEffect(() => {
    const node = root.current
    setControlsHost(node?.closest('.quiz-screen') ?? null)
    const resize = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      if (width > 0 && height > 0) {
        // Only the backdrop is resolution-capped; DOM questions remain sharp.
        const scale = Math.min(1, 1080 / Math.max(width, height))
        setDimensions({ width: Math.max(240, Math.round(width * scale)), height: Math.max(180, Math.round(height * scale)) })
      }
    })
    if (node) resize.observe(node)
    const canvas = document.createElement('canvas'), gl = canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: true })
    setCapable(!!gl); gl?.getExtension('WEBGL_lose_context')?.loseContext()
    const visibility = () => setForeground(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', visibility)
    const observer = new IntersectionObserver(e => setVisible(e[0].isIntersecting), { threshold: .01 }); if (node) observer.observe(node)
    const inertRoot = node?.closest('[data-quiz-layer]')
    const inert = () => setBlocked(inertRoot?.hasAttribute('inert') ?? false)
    const inertObserver = new MutationObserver(inert); if (inertRoot) inertObserver.observe(inertRoot, { attributes: true, attributeFilter: ['inert'] })
    inert()
    const renderObserver = new MutationObserver(() => { if (node?.querySelector('canvas')) setReady(true) }); if (node) renderObserver.observe(node, { childList: true, subtree: true })
    const lost = (e: Event) => { e.preventDefault(); failed() }; node?.addEventListener('webglcontextlost', lost, true)
    return () => { document.removeEventListener('visibilitychange', visibility); resize.disconnect(); observer.disconnect(); inertObserver.disconnect(); renderObserver.disconnect(); node?.removeEventListener('webglcontextlost', lost, true) }
  }, [failed])
  useEffect(() => { if (!capable || reduced || ready) return; const timeout = setTimeout(failed, 15_000); return () => clearTimeout(timeout) }, [capable, reduced, ready, failed])
  const playing = capable && !reduced && !paused && !externalPaused && foreground && visible && !blocked
  const mode = capable && !reduced && !externalPaused ? ready ? '3d' : 'loading' : 'static'
  const control = controls ? <button className="portal-toggle" onClick={() => setPaused(v => !v)} disabled={mode !== '3d'} aria-label={paused ? '播放星门动画' : '暂停星门动画'} aria-pressed={paused}>{paused ? <Play size={16} /> : <Pause size={16} />}{mode === 'static' ? '静态星门' : mode === 'loading' ? '正在点亮' : paused ? '播放' : '暂停'}</button> : null
  return <><div className={`guard-portal${background ? ' guard-portal--background' : ''}`} ref={root} data-mode={mode} data-playing={playing}>
    <div className="portal-stage" aria-hidden="true"><PortalBoundary onFailure={failed}><Suspense fallback={<StaticGate />}>{capable && !reduced && !externalPaused ? <GatePlayer progress={Math.max(0, Math.min(1, progress))} playing={playing} playerRef={player} onFailure={failed} width={dimensions.width} height={dimensions.height} /> : <StaticGate />}</Suspense></PortalBoundary></div>
    <div className="portal-vignette" aria-hidden="true" /><div className="portal-hud"><span>KNOWLEDGE GATE</span><strong>知识星门</strong><small>已收集 {Math.round(Math.max(0, Math.min(1, progress)) * 100)}% 学习能量</small></div>
    {!background && control}
  </div>{background && controlsHost && control && createPortal(<div className="portal-controls-layer">{control}</div>, controlsHost)}</>
}