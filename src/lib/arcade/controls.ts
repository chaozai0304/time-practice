import { clamp, idleBattleInput } from './types'
import type { AdventureMode, BattleInput } from './types'

type Press = { since:number; values:Partial<BattleInput> }
type Tap = { until:number; values:Partial<BattleInput> }
export const directionTapMs = 140
export function directionVector(x:number,y:number,horizontal=false) {
  x=Number.isFinite(x)?clamp(x,-1,1):0;y=horizontal?0:Number.isFinite(y)?clamp(y,-1,1):0
  const length=Math.max(1,Math.hypot(x,y));return {x:x/length,y:y/length}
}
export function stickVector(x:number,y:number,horizontal=false) {
  const length=horizontal?Math.abs(x):Math.hypot(x,y)
  if(length<.18)return {x:0,y:0}
  return directionVector(x,y,horizontal)
}

/** Input only: no timers, no physics stepping, and each finger owns its own press. */
export function createArcadeControls(mode:AdventureMode) {
  const keys=new Set<string>(),pointers=new Map<number,Press>()
  let taps:Tap[]=[],point:{id:number;x:number;y:number}|null=null
  const reset=()=>{keys.clear();pointers.clear();taps=[];point=null}
  const release=(id:number,now:number,cancelled=false)=>{
    const press=pointers.get(id);pointers.delete(id);if(point?.id===id)point=null
    if(!press||cancelled)return
    const duration=press.values.jump||press.values.action?55:directionTapMs
    if(now-press.since<duration)taps.push({until:press.since+duration,values:press.values})
  }
  return {
    reset,
    key(key:string,down:boolean){key=key.toLowerCase();if(down){keys.add(key);point=null}else keys.delete(key)},
    press(id:number,values:Partial<BattleInput>,now:number){pointers.set(id,{since:pointers.get(id)?.since??now,values});if(values.x!==undefined||values.y!==undefined)point=null},
    release,
    tap(values:Partial<BattleInput>,now:number){taps.push({until:now+(values.jump||values.action?55:directionTapMs),values});if(values.x||values.y)point=null},
    point(id:number,x:number,y:number){if(!Number.isFinite(x)||!Number.isFinite(y))return;point={id,x,y};taps=taps.filter(t=>!t.values.x&&!t.values.y)},
    read(now:number):BattleInput {
      taps=taps.filter(t=>t.until>now)
      const held=[...pointers.values()].map(p=>p.values),values=[...held,...taps.map(t=>t.values)]
      const x=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'))+values.reduce((n,v)=>n+(v.x??0),0)
      const y=Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'))+values.reduce((n,v)=>n+(v.y??0),0)
      const axis=directionVector(x,y,mode!=='flight')
      return {...idleBattleInput,...axis,jump:values.some(v=>v.jump)||keys.has('w')||keys.has('arrowup')||mode==='platform'&&keys.has(' '),action:values.some(v=>v.action)||mode!=='platform'&&keys.has(' '),pointing:!!point&&!axis.x&&!axis.y,aimX:point?.x??50,aimY:point?.y??122}
    },
  }
}
export type ArcadeControls = ReturnType<typeof createArcadeControls>