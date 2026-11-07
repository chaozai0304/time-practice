import { Component, lazy, memo, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode, RefObject } from 'react'
import { Pause, Play, Sparkles } from '../ui/icons'
import type { PlayerRef } from '@remotion/player'
import type { LearningIslandProps } from '../motion/LearningIsland'

const IslandPlayer = lazy(() => Promise.all([import('@remotion/player'), import('../motion/LearningIsland')]).then(([{ Player }, { LearningIsland }]) => ({ default: function ScenePlayer({ playerRef, growth, celebrating, playing, onFailure }: LearningIslandProps & { playerRef: RefObject<PlayerRef | null>; playing: boolean; onFailure: () => void }) {
  useEffect(() => { if (playing) playerRef.current?.play(); else playerRef.current?.pause() }, [playing, playerRef])
  return <Player ref={playerRef} component={LearningIsland} inputProps={{ growth, celebrating }} durationInFrames={240} fps={30} compositionWidth={760} compositionHeight={600} loop autoPlay={false} controls={false} clickToPlay={false} doubleClickToFullscreen={false} spaceKeyToPlayOrPause={false} style={{ width: '100%', height: '100%' }} errorFallback={() => <SceneError onFailure={onFailure} />} />
} })))
class SceneBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { this.props.onFailure() }
  render() { return this.state.failed ? <StaticIsland /> : this.props.children }
}
function SceneError({ onFailure }: { onFailure: () => void }) {
  useEffect(onFailure, [onFailure])
  return <StaticIsland />
}
function StaticIsland() {
  return <svg viewBox="0 0 760 600" role="img" aria-label="静态学习小岛" className="island-fallback">
    <ellipse cx="380" cy="470" rx="210" ry="30" fill="#d9def5" />
    <path d="M172 371 380 520 588 371Z" fill="#a8c7e6" /><ellipse cx="380" cy="370" rx="208" ry="64" fill="#a0d8bd" />
    <path d="m246 347 134 34 134-34v-73l-134 18-134-18Z" fill="#7062d5" /><path d="m255 325 125 35 125-35v-65l-125 21-125-21Z" fill="#fff5da" />
    <ellipse cx="380" cy="258" rx="64" ry="68" fill="#f2eaff" /><circle cx="380" cy="192" r="78" fill="#9c8aee" />
    <ellipse cx="338" cy="110" rx="22" ry="46" fill="#b9a7fa" /><ellipse cx="422" cy="110" rx="22" ry="46" fill="#b9a7fa" />
    <circle cx="352" cy="185" r="8" fill="#253352" /><circle cx="408" cy="185" r="8" fill="#253352" /><path d="M367 210q13 17 26 0" fill="none" stroke="#354164" strokeWidth="6" strokeLinecap="round" />
    <path d="M530 332V233" stroke="#319d7f" strokeWidth="9" strokeLinecap="round" /><ellipse cx="507" cy="260" rx="35" ry="14" fill="#70c8a5" transform="rotate(30 507 260)" /><ellipse cx="553" cy="239" rx="35" ry="14" fill="#41ac89" transform="rotate(-30 553 239)" />
    <circle cx="176" cy="206" r="19" fill="#f4c664" /><path d="m568 144 7 15 16 6-16 7-7 16-6-16-16-7 16-6Z" fill="#f4c664" />
  </svg>
}
export const MotionIsland = memo(function MotionIsland({ growth, celebrating = false }: LearningIslandProps) {
  const root = useRef<HTMLDivElement>(null), player = useRef<PlayerRef>(null)
  const [capable, setCapable] = useState(false), [reduced, setReduced] = useState(true)
  const [ready, setReady] = useState(false), [blocked, setBlocked] = useState(true)
  const [sceneReady, setSceneReady] = useState(false)
  const [paused, setPaused] = useState(false), [visible, setVisible] = useState(false), [focused, setFocused] = useState(false)
  const [documentVisible, setDocumentVisible] = useState(true)
  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)')
    const motionChange = () => setReduced(preference.matches)
    motionChange(); preference.addEventListener('change', motionChange)
    const canvas = document.createElement('canvas'), gl = canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: true })
    setCapable(!!gl); gl?.getExtension('WEBGL_lose_context')?.loseContext()
    // Capability detection synchronizes with an external GPU/browser API.
    // oxlint-disable-next-line react/set-state-in-effect
    setReady(true)
    const node = root.current
    const shell = node?.closest('.app-shell')
    const blockingChange = () => setBlocked(shell?.hasAttribute('inert') ?? false)
    const blockingObserver = new MutationObserver(blockingChange)
    if (shell) blockingObserver.observe(shell, { attributes: true, attributeFilter: ['inert'] })
    blockingChange()
    const observer = new IntersectionObserver(entries => setVisible(entries[0].isIntersecting), { threshold: 0.05 })
    if (node) observer.observe(node)
    const visibilityChange = () => setDocumentVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', visibilityChange); visibilityChange()
    const contextLost = (event: Event) => { event.preventDefault(); setCapable(false) }
    node?.addEventListener('webglcontextlost', contextLost, true)
    const canvasObserver = new MutationObserver(() => { if (node?.querySelector('canvas')) setSceneReady(true) })
    if (node) canvasObserver.observe(node, { childList: true, subtree: true })
    return () => { preference.removeEventListener('change', motionChange); observer.disconnect(); canvasObserver.disconnect(); blockingObserver.disconnect(); document.removeEventListener('visibilitychange', visibilityChange); node?.removeEventListener('webglcontextlost', contextLost, true) }
  }, [])
  const onFailure = useCallback(() => setCapable(false), [])
  useEffect(() => {
    if (!capable || reduced || sceneReady) return
    const timer = setTimeout(onFailure, 15_000)
    return () => clearTimeout(timer)
  }, [capable, reduced, sceneReady, onFailure])
  const playing = capable && !reduced && !paused && visible && documentVisible && !focused && !blocked
  return <div ref={root} className="motion-island" data-ready={ready} data-playing={playing} data-motion={capable && !reduced ? sceneReady ? '3d' : 'loading' : 'static'} onFocusCapture={() => setFocused(true)} onBlurCapture={e => { if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false) }}>
    <div className="island-halo" aria-hidden="true" /><span className="island-kicker"><Sparkles size={14} aria-hidden="true" />你的知识小岛</span>
    <div className="island-canvas" aria-hidden="true"><SceneBoundary onFailure={onFailure}><Suspense fallback={<StaticIsland />}>{capable && !reduced ? <IslandPlayer playerRef={player} growth={growth} celebrating={celebrating} playing={playing} onFailure={onFailure} /> : <StaticIsland />}</Suspense></SceneBoundary></div>
    <div className="island-caption"><span>LEVEL {growth}</span><strong>每一道题，都让小岛成长</strong></div>
    {capable && !reduced && sceneReady && <button className="island-pause" onClick={() => setPaused(p => !p)} aria-label={paused ? '播放小岛动画' : '暂停小岛动画'} aria-pressed={paused}>{paused ? <Play size={16} /> : <Pause size={16} />}</button>}
    {reduced && <span className="motion-mode">已遵循减少动态效果设置</span>}
  </div>
})