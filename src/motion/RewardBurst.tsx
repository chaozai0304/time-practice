import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion'
export function RewardBurst() {
  const frame = useCurrentFrame(), { fps } = useVideoConfig()
  return <AbsoluteFill style={{ pointerEvents: 'none' }}>
    {Array.from({ length: 24 }, (_, i) => <div key={i} style={{ position: 'absolute', left: `${8 + i * 3.6}%`, top: 0, width: i % 2 ? 8 : 12, height: i % 2 ? 14 : 12, borderRadius: i % 3 ? 3 : '50%', background: ['#9b8bea', '#f3bd55', '#5bc3a0', '#efa4c3'][i % 4], opacity: interpolate(frame, [0, 8, 2 * fps, 3 * fps], [0, 1, 1, 0], { extrapolateRight: 'clamp' }), translate: `0 ${interpolate(frame, [0, 3 * fps], [-30 - i * 6, 780 + i * 5])}px`, rotate: `${frame * (i % 2 ? 3 : -2)}deg` }} />)}
  </AbsoluteFill>
}