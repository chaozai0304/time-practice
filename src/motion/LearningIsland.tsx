import { ThreeCanvas } from '@remotion/three'
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion'
import type { ThreeElements } from '@react-three/fiber'

export type LearningIslandProps = { growth: number; celebrating: boolean }
const TAU = Math.PI * 2
type Position = [number, number, number]

function Ball({ color, radius = 1, ...props }: ThreeElements['mesh'] & { color: string; radius?: number }) {
  return <mesh {...props}><sphereGeometry args={[radius, 24, 16]} /><meshStandardMaterial color={color} roughness={0.43} metalness={0.08} /></mesh>
}
function Book() {
  return <group position={[-0.15, 0.02, 0.45]} rotation={[0.08, -0.15, 0]}>
    <mesh position={[0, -0.04, 0]}><boxGeometry args={[2.3, 0.14, 1.25]} /><meshStandardMaterial color="#6659db" roughness={0.4} /></mesh>
    {[-1, 1].map(side => <group key={side} position={[side * 0.55, 0.1, 0]} rotation={[0, 0, side * 0.12]}>
      <mesh><boxGeometry args={[1.07, 0.13, 1.12]} /><meshStandardMaterial color="#fff8e4" /></mesh>
      {[0, 1, 2].map(line => <mesh key={line} position={[0, 0.072, (line - 1) * 0.24]}><boxGeometry args={[0.72, 0.009, 0.018]} /><meshStandardMaterial color="#d2c8a9" /></mesh>)}
    </group>)}
    <mesh position={[0, 0.19, 0.14]}><boxGeometry args={[0.09, 0.06, 0.94]} /><meshStandardMaterial color="#f6bc63" /></mesh>
  </group>
}
function Buddy({ wave }: { wave: number }) {
  return <group position={[-0.3, 1.1, -0.12]} rotation={[0, 0.2, 0]}>
    <Ball color="#9481ed" position={[0, 0.14, 0]} scale={[0.64, 0.64, 0.57]} />
    <Ball color="#baa7ff" position={[-0.35, 0.74, 0]} scale={[0.18, 0.36, 0.2]} rotation={[0, 0, 0.2]} />
    <Ball color="#baa7ff" position={[0.35, 0.74, 0]} scale={[0.18, 0.36, 0.2]} rotation={[0, 0, -0.2]} />
    <Ball color="#f3edff" position={[0, -0.49, 0]} scale={[0.48, 0.43, 0.4]} />
    <Ball color="#b6a1ff" position={[-0.53, -0.37, 0.03]} scale={[0.19, 0.28, 0.18]} rotation={[0, 0, -0.8]} />
    <Ball color="#b6a1ff" position={[0.54, -0.22 + wave * 0.05, 0.04]} scale={[0.19, 0.3, 0.18]} rotation={[0, 0, -0.6 - wave * 0.3]} />
    <Ball color="#253352" radius={0.062} position={[-0.21, 0.22, 0.537]} />
    <Ball color="#253352" radius={0.062} position={[0.21, 0.22, 0.537]} />
    <Ball color="#ffffff" radius={0.019} position={[-0.225, 0.24, 0.588]} />
    <Ball color="#ffffff" radius={0.019} position={[0.195, 0.24, 0.588]} />
    <Ball color="#f6a8b5" position={[-0.36, 0.02, 0.48]} scale={[0.11, 0.07, 0.032]} />
    <Ball color="#f6a8b5" position={[0.36, 0.02, 0.48]} scale={[0.11, 0.07, 0.032]} />
    <mesh position={[0, 0.035, 0.565]} rotation={[0, 0, Math.PI]}><torusGeometry args={[0.082, 0.016, 8, 16, Math.PI]} /><meshStandardMaterial color="#354164" /></mesh>
    <Ball color="#8070d8" position={[-0.25, -0.8, 0.23]} scale={[0.22, 0.12, 0.3]} />
    <Ball color="#8070d8" position={[0.25, -0.8, 0.23]} scale={[0.22, 0.12, 0.3]} />
  </group>
}
function Sprout({ growth }: { growth: number }) {
  return <group position={[1.0, -0.03, -0.3]} scale={0.8 + growth * 0.1}>
    <mesh position={[0, 0.39, 0]}><cylinderGeometry args={[0.04, 0.055, 0.85, 10]} /><meshStandardMaterial color="#2e967b" /></mesh>
    <Ball color="#75cba9" position={[-0.23, 0.7, 0]} rotation={[0, 0, -0.5]} scale={[0.4, 0.13, 0.22]} />
    <Ball color="#31a384" position={[0.23, 0.92, 0]} rotation={[0, 0, 0.5]} scale={[0.4, 0.13, 0.22]} />
    <Ball color="#a6e2bf" position={[-0.19, 1.12, 0]} rotation={[0, 0, -0.6]} scale={[0.29, 0.1, 0.17]} />
  </group>
}
function IslandWorld({ growth, celebrating }: LearningIslandProps) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const phase = frame / (8 * fps) * TAU
  const float = Math.sin(phase) * 0.09
  const orbit: Position = [Math.cos(phase) * 2.45, 0.8 + Math.sin(phase) * 0.38, Math.sin(phase) * 1.65]
  return <>
    <ambientLight intensity={1.5} />
    <directionalLight position={[4, 7, 6]} intensity={3.5} color="#fff6e8" />
    <directionalLight position={[-5, 3, -2]} intensity={2} color="#c3ceff" />
    <group position={[0, float - 0.35, 0]} rotation={[0, -0.12 + Math.sin(phase) * 0.11, Math.sin(phase) * 0.015]}>
      <mesh position={[0, -0.64, 0]} rotation={[Math.PI, 0.2, 0]}><coneGeometry args={[1.85, 0.92, 10]} /><meshStandardMaterial color="#abc8e8" flatShading roughness={0.65} /></mesh>
      <mesh position={[0, -0.2, 0]}><cylinderGeometry args={[1.85, 1.8, 0.2, 48]} /><meshStandardMaterial color="#93d6bd" roughness={0.55} /></mesh>
      <mesh position={[0, -0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[1.72, 48]} /><meshStandardMaterial color="#b9ead2" /></mesh>
      <Book /><Buddy wave={Math.sin(phase * 2)} /><Sprout growth={growth} />
      {[[-1.3, -0.03, -0.2], [1.35, -0.02, 0.8], [-0.9, -0.05, -1.05]].map((p, i) => <Ball key={i} position={p as Position} scale={[0.17, 0.1, 0.17]} color={['#f5cb6b', '#a7b0ef', '#e7eeed'][i]} />)}
    </group>
    <group rotation={[0.35, 0.25, 0.16]}>
      <mesh position={[0, 0.35, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[2.58, 0.018, 8, 100]} /><meshStandardMaterial color="#a9b5ed" transparent opacity={0.65} /></mesh>
      <Ball position={orbit} color="#f7cb6d" radius={0.18} />
    </group>
    {Array.from({ length: 10 }, (_, i) => {
      const angle = i * 2.4
      return <mesh key={i} position={[Math.cos(angle) * (2.1 + (i % 3) * 0.2), Math.sin(angle) * 1.5 + 0.5 + Math.sin(phase + i) * 0.1, Math.sin(angle * 2) * 0.5]} rotation={[phase * 0.4, angle, phase]} scale={celebrating ? 1.4 : 1}>
        <octahedronGeometry args={[i % 2 ? 0.075 : 0.12]} /><meshStandardMaterial color={i % 2 ? '#c1c5f7' : '#f1bf56'} roughness={0.25} metalness={0.25} />
      </mesh>
    })}
  </>
}
export function LearningIsland(props: LearningIslandProps) {
  const { width, height } = useVideoConfig()
  return <AbsoluteFill
    style={{
      background: 'transparent',
      translate: '-36.8px 0px'
    }}
  >
    <ThreeCanvas width={width} height={height} dpr={1} camera={{ position: [4.5, 3.2, 7.3], fov: 36 }} gl={{ alpha: true, antialias: true }}>
      <IslandWorld {...props} />
    </ThreeCanvas>
  </AbsoluteFill>
}