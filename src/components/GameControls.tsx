import { useEffect, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import { stickVector } from '../lib/arcade/controls'
import type { ArcadeControls } from '../lib/arcade/controls'
import type { AdventureMode } from '../lib/adventure'

export function GameControls({mode,controls,stopped,actionLabel,actionDisabled}:{mode:AdventureMode;controls:ArcadeControls;stopped:boolean;actionLabel:string;actionDisabled:boolean}) {
  const [stick,setStick]=useState({x:0,y:0}),[acting,setActing]=useState(false),[slider,setSlider]=useState(50),pointer=useRef<number|null>(null)
  useEffect(()=>{if(stopped){pointer.current=null;queueMicrotask(()=>{setStick({x:0,y:0});setActing(false)})}},[stopped])
  useEffect(()=>{const reset=()=>{pointer.current=null;controls.reset();setStick({x:0,y:0});setActing(false)};window.addEventListener('resize',reset);window.addEventListener('blur',reset);return()=>{window.removeEventListener('resize',reset);window.removeEventListener('blur',reset)}},[controls])
  const padPoint=(event:PointerEvent<HTMLDivElement>)=>{
    if(stopped)return
    if(event.type==='pointerdown'){if(pointer.current!==null)return;pointer.current=event.pointerId;event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId)}
    if(pointer.current!==event.pointerId)return
    const rect=event.currentTarget.getBoundingClientRect(),horizontal=mode!=='flight'
    const axis=stickVector((event.clientX-rect.left-rect.width/2)/(rect.width*.36),(event.clientY-rect.top-rect.height/2)/(rect.height*.36),horizontal)
    const value=horizontal?{x:Math.abs(axis.x)<.18?0:Math.sign(axis.x),y:0}:axis
    setStick(value);controls.press(event.pointerId,value,performance.now())
  }
  const releasePad=(event:PointerEvent<HTMLDivElement>)=>{if(pointer.current!==event.pointerId)return;pointer.current=null;setStick({x:0,y:0});controls.release(event.pointerId,performance.now(),event.type!=='pointerup')}
  const action=mode==='platform'?{jump:true}:{action:true}
  const direction=(x:number,y:number,label:string,symbol:string)=><button type="button" className={`pad-${label} ${x&&Math.sign(stick.x)===x||y&&Math.sign(stick.y)===y?'pressed':''}`} aria-label={label==='up'?'向上移动':label==='down'?'向下移动':label==='left'?'向左移动':'向右移动'} onClick={event=>{if(!stopped&&event.detail===0)controls.tap({x,y},performance.now())}}>{symbol}</button>
  const slide=(event:PointerEvent<HTMLDivElement>)=>{if(stopped||event.type==='pointermove'&&!event.currentTarget.hasPointerCapture(event.pointerId))return;event.preventDefault();if(event.type==='pointerdown')event.currentTarget.setPointerCapture(event.pointerId);const r=event.currentTarget.getBoundingClientRect(),x=Math.max(0,Math.min(100,(event.clientX-r.left)/r.width*100));setSlider(x);controls.point(event.pointerId,x,124)}
  return <footer className={`battle-controls touch-controls-${mode}`} inert={stopped?true:undefined} aria-label="游戏触屏手柄">
    <div className="touch-movement"><div className={`battle-pad ${mode==='flight'?'pad-cross':'pad-horizontal'}`} aria-label={mode==='flight'?'八方向触控摇杆':'左右触控方向盘'} onPointerDown={padPoint} onPointerMove={padPoint} onPointerUp={releasePad} onPointerCancel={releasePad} onLostPointerCapture={releasePad}>
      {mode==='flight'&&direction(0,-1,'up','▲')}{direction(-1,0,'left','◀')}<span className="pad-center" aria-hidden="true"><i style={{transform:`translate(${stick.x*12}px,${stick.y*12}px)`}}/></span>{direction(1,0,'right','▶')}{mode==='flight'&&direction(0,1,'down','▼')}
    </div><small>{mode==='flight'?'滑动方向盘 · 可斜向飞行':'左右长按 / 滑动换向'}</small></div>
    {mode==='breaker'?<div className="paddle-touch-zone" role="group" aria-label="挡板拖动区" onPointerDown={slide} onPointerMove={slide} onPointerUp={event=>controls.release(event.pointerId,performance.now())} onPointerCancel={event=>controls.release(event.pointerId,performance.now(),true)} onLostPointerCapture={event=>controls.release(event.pointerId,performance.now(),true)}><span>左右滑动控制挡板</span><i style={{left:`${Math.max(7,Math.min(93,slider))}%`}}/></div>:<span className="arcade-control-hint">{mode==='flight'?'战区任意位置拖动 · 自动开火':'左手移动，右手跳跃 · 可同时按住'}</span>}
    <div className="touch-action-zone"><button type="button" className={`battle-action ${acting?'pressed':''}`} disabled={actionDisabled} onPointerDown={event=>{if(stopped)return;event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);setActing(true);controls.press(event.pointerId,action,performance.now())}} onPointerUp={event=>{setActing(false);controls.release(event.pointerId,performance.now())}} onPointerCancel={event=>{setActing(false);controls.release(event.pointerId,performance.now(),true)}} onLostPointerCapture={event=>{setActing(false);controls.release(event.pointerId,performance.now(),true)}} onClick={event=>{if(!stopped&&event.detail===0)controls.tap(action,performance.now())}}>{actionLabel}</button><small>{mode==='platform'?'点击跳跃 · 长按滑翔（需解锁）':mode==='flight'?'大招清屏 · 不需要按键射击':'点击发球 · 滑动接球'}</small></div>
  </footer>
}