import { lazy, Suspense, useEffect, useState } from 'react'
const CelebrationPlayer = lazy(() => Promise.all([import('@remotion/player'), import('../motion/RewardBurst')]).then(([{ Player }, { RewardBurst }]) => ({ default: () => <Player component={RewardBurst} durationInFrames={90} fps={30} compositionWidth={760} compositionHeight={900} autoPlay controls={false} clickToPlay={false} spaceKeyToPlayOrPause={false} style={{ width: '100%', height: '100%' }} /> })))
export function Celebration() {
  const [enabled, setEnabled] = useState(false)
  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setEnabled(!preference.matches)
    update(); preference.addEventListener('change', update)
    const timer = setTimeout(() => setEnabled(false), 3500)
    return () => { clearTimeout(timer); preference.removeEventListener('change', update) }
  }, [])
  return enabled ? <div className="reward-burst" aria-hidden="true"><Suspense fallback={null}><CelebrationPlayer /></Suspense></div> : null
}