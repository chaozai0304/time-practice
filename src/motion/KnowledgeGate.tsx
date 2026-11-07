import { useMemo } from 'react'
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion'
import { ThreeCanvas } from '@remotion/three'
import { AdditiveBlending, BackSide, DoubleSide } from 'three'

export type KnowledgeGateProps = { progress: number }
const TAU = Math.PI * 2
const seed = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x) }
const vertex = 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}'
const noise = `
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*noise2(p);p=p*2.03+vec2(2.4,1.7);a*=.5;}return v;}
`

function Nebula({ phase }: { phase: number }) {
  return <mesh position={[0, 0, -55]}>
    <planeGeometry args={[180, 130]} />
    <shaderMaterial depthWrite={false} uniforms={{ uPhase: { value: phase } }} vertexShader={vertex} fragmentShader={`
      varying vec2 vUv;uniform float uPhase;${noise}
      void main(){
        vec2 p=(vUv-.5)*vec2(3.2,2.4);vec2 drift=vec2(cos(uPhase),sin(uPhase))*.09;
        float n=fbm(p*3.+drift);float detail=fbm(p*7.+vec2(n*2.,-n));
        float band=exp(-pow((p.y+.26*sin(p.x*2.7)-.1)/.28,2.));
        float clouds=smoothstep(.22,.85,n)*(.32+detail)*band;
        vec3 purple=vec3(.23,.075,.46),blue=vec3(.025,.24,.43),pink=vec3(.39,.075,.28);
        vec3 hue=mix(purple,blue,smoothstep(-.8,.9,p.x));hue=mix(hue,pink,pow(detail,3.)*.8);
        vec3 base=vec3(.009,.015,.045);vec3 color=base+hue*clouds*1.65;
        color+=vec3(.12,.17,.3)*exp(-length(p-vec2(-.65,.23))*3.)*.25;
        gl_FragColor=vec4(color,1.);
      }`} />
  </mesh>
}
function Starfield({ phase, compact }: { phase: number; compact: boolean }) {
  const positions = useMemo(() => {
    const count = compact ? 1700 : 3000, result = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) { result[i*3]=(seed(i+2)-.5)*120;result[i*3+1]=(seed(i+31)-.5)*82;result[i*3+2]=-12-seed(i+71)*95 }
    return result
  }, [compact])
  return <group rotation={[Math.sin(phase)*.018, Math.cos(phase)*.025, Math.sin(phase)*.008]}>
    <points><bufferGeometry><bufferAttribute attach="attributes-position" args={[positions,3]} /></bufferGeometry><pointsMaterial color="#c4d7ff" size={compact?.065:.075} sizeAttenuation transparent opacity={.88} depthWrite={false} blending={AdditiveBlending} /></points>
  </group>
}
function Galaxy({ phase, compact }: { phase: number; compact: boolean }) {
  const particles = useMemo(() => {
    const count=compact?1100:2100,positions=new Float32Array(count*3),colors=new Float32Array(count*3)
    for(let i=0;i<count;i++){
      const r=Math.sqrt(seed(i+113))*8.5, arm=i%4*TAU/4, angle=arm+r*.58+(seed(i+7)-.5)*.8
      positions[i*3]=Math.cos(angle)*r;positions[i*3+1]=(seed(i+29)-.5)*(.24+r*.09);positions[i*3+2]=Math.sin(angle)*r
      colors[i*3]=.55+seed(i+5)*.4;colors[i*3+1]=.45+seed(i+8)*.4;colors[i*3+2]=1
    }
    return {positions,colors}
  },[compact])
  return <group position={[-10,5,-30]} rotation={[.68,phase,-.22]}>
    <points><bufferGeometry><bufferAttribute attach="attributes-position" args={[particles.positions,3]} /><bufferAttribute attach="attributes-color" args={[particles.colors,3]} /></bufferGeometry><pointsMaterial vertexColors size={.085} sizeAttenuation transparent opacity={.7} depthWrite={false} blending={AdditiveBlending} /></points>
    <mesh rotation={[-Math.PI/2,0,0]}><planeGeometry args={[12,12]} /><shaderMaterial transparent depthWrite={false} blending={AdditiveBlending} vertexShader={vertex} fragmentShader={'varying vec2 vUv;void main(){float r=length((vUv-.5)*2.);float a=exp(-r*7.)*.55;gl_FragColor=vec4(.8,.65,1.,a);}'} /></mesh>
  </group>
}
function Planet({ phase, compact }: { phase: number; compact: boolean }) {
  return <group position={[compact?4.7:8.3,3.8,-13]} rotation={[.25,0,-.35]}>
    <group rotation={[0,phase,0]}>
      <mesh><sphereGeometry args={[3.1,48,32]} /><shaderMaterial uniforms={{uPhase:{value:phase}}}
        vertexShader={'varying vec3 vNormal;varying vec3 vPos;void main(){vNormal=normalize(normalMatrix*normal);vPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}'}
        fragmentShader={`varying vec3 vNormal;varying vec3 vPos;uniform float uPhase;${noise}
          void main(){float cloud=noise2(vPos.xz*2.2+vec2(sin(uPhase),cos(uPhase))*.15);float bands=sin(vPos.y*12.+cloud*4.);vec3 base=mix(vec3(.24,.18,.4),vec3(.83,.62,.49),bands*.5+.5);float light=max(dot(normalize(vNormal),normalize(vec3(-.7,.45,1.))),0.);gl_FragColor=vec4(base*(.055+light*.85),1.);}`} />
          </mesh>
    </group>
    <mesh rotation={[-1.12,.14,.12]}><ringGeometry args={[3.7,5.25,112]} /><shaderMaterial side={DoubleSide} transparent depthWrite={false} vertexShader={vertex}
      fragmentShader={'varying vec2 vUv;void main(){float r=length(vUv-.5)*2.;float stripes=.45+.3*sin(r*240.);float a=stripes*.52;vec3 c=mix(vec3(.31,.28,.54),vec3(.78,.65,.59),r);gl_FragColor=vec4(c,a);}'} /></mesh>
    <mesh scale={1.045}><sphereGeometry args={[3.1,36,24]} /><shaderMaterial side={BackSide} transparent depthWrite={false} blending={AdditiveBlending}
      vertexShader={'varying vec3 n;varying vec3 v;void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}'}
      fragmentShader={'varying vec3 n;varying vec3 v;void main(){float a=pow(1.-abs(dot(normalize(n),normalize(v))),3.)*.38;gl_FragColor=vec4(.34,.48,1.,a);}'} /></mesh>
  </group>
}
function AncientGate({ phase, progress, compact }: { phase: number; progress: number; compact: boolean }) {
  return <group position={[compact?-3.3:-5.5,.9,-17]} rotation={[.36, Math.sin(phase)*.16, -.25]}>
    {[0,1,2].map(i=><group key={i} rotation={[0,0,phase*(i%2?-1:1)+i*.4]}>
      <mesh><torusGeometry args={[5.2+i*.45,i===0?.034:.014,8,144]} /><meshBasicMaterial color={i%2?'#9c7af1':'#70d9f4'} transparent opacity={i===0?.66:.36} depthWrite={false} blending={AdditiveBlending} /></mesh>
      {Array.from({length:12},(_,j)=><mesh key={j} position={[Math.cos(j*TAU/12)*(5.2+i*.45),Math.sin(j*TAU/12)*(5.2+i*.45),0]} rotation={[0,0,j*TAU/12]}><boxGeometry args={[.04,j%3?.18:.36,.04]} /><meshBasicMaterial color={i%2?'#b3a5e8':'#a0e9fb'} transparent opacity={.6} /></mesh>)}
    </group>)}
    <mesh rotation={[0,0,Math.PI/2]}><torusGeometry args={[4.7,.025,8,120,TAU*Math.max(.015,Math.min(1,progress))]} /><meshBasicMaterial color="#f6cf8e" transparent opacity={.66} depthWrite={false} blending={AdditiveBlending} /></mesh>
    <mesh position={[0,0,-1]}><planeGeometry args={[17,17]} /><shaderMaterial transparent depthWrite={false} blending={AdditiveBlending} vertexShader={vertex} fragmentShader={'varying vec2 vUv;void main(){float r=length((vUv-.5)*2.);float ring=exp(-pow((r-.62)*19.,2.))*.19;vec3 c=mix(vec3(.28,.11,.73),vec3(.06,.48,.8),vUv.x);gl_FragColor=vec4(c,ring);}'} /></mesh>
  </group>
}
function CosmicWorld({ progress }: KnowledgeGateProps) {
  const frame=useCurrentFrame(),{fps,width,height}=useVideoConfig(), phase=frame/(60*fps)*TAU,compact=width/height<1
  const streams=useMemo(()=>Array.from({length:40},(_,i)=>({angle:seed(i+7)*TAU,radius:5.5+seed(i+9)*9,offset:seed(i+33)})),[])
  return <>
    <color attach="background" args={['#040819']} /><ambientLight intensity={.4} /><directionalLight position={[-7,6,8]} intensity={2} color="#9ebeff" />
    <Nebula phase={phase} /><Starfield phase={phase} compact={compact} /><Galaxy phase={phase} compact={compact} /><Planet phase={phase} compact={compact} />
    <AncientGate phase={phase} progress={progress} compact={compact} />
    <group position={[compact?-4.5:-9,-3.6,-14]} rotation={[.2,phase,0]}><mesh><sphereGeometry args={[1.45,32,24]} /><meshStandardMaterial color="#2c669d" roughness={.75} metalness={.12} /></mesh><mesh scale={1.035}><sphereGeometry args={[1.45,24,16]} /><meshBasicMaterial color="#66a7ef" transparent opacity={.08} side={BackSide} blending={AdditiveBlending} depthWrite={false} /></mesh></group>
    <mesh position={[compact?3.2:7,-4,-8]} rotation={[phase,.3,0]}><icosahedronGeometry args={[.43,1]} /><meshStandardMaterial color="#8290aa" roughness={.95} flatShading /></mesh>
    {streams.map((s,i)=>{const travel=(s.offset+frame/(20*fps))%1;return <mesh key={i} position={[Math.cos(s.angle)*s.radius,Math.sin(s.angle)*s.radius,-45+travel*48]}><boxGeometry args={[.012,.012,.6+travel*1.8]} /><meshBasicMaterial color={i%3?'#7aa8d8':'#baa1f6'} transparent opacity={Math.sin(travel*Math.PI)*.38} depthWrite={false} blending={AdditiveBlending} /></mesh>})}
  </>
}
export function KnowledgeGate(props:KnowledgeGateProps) {
  const {width,height}=useVideoConfig()
  return <AbsoluteFill style={{backgroundColor:'#040819'}}><ThreeCanvas width={width} height={height} dpr={1} camera={{position:[0,0,7],fov:51}} gl={{alpha:false,antialias:true}}><CosmicWorld {...props} /></ThreeCanvas></AbsoluteFill>
}