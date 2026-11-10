import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { drawArcade } from '../lib/arcade/draw'
import { arcadePoint } from '../lib/arcade/viewport'
import { playerPosition } from '../lib/adventure'
import type { AdventureState } from '../lib/adventure'

/** Classic arcade canvas: original vectors, no remote textures and no tiny distant 3D models. */
export function AdventureScene({state,paused,onPoint,onRelease}:{state:AdventureState;paused:boolean;onPoint:(id:number,x:number,y:number)=>void;onRelease:(id:number,cancelled:boolean)=>void}) {
  const canvas=useRef<HTMLCanvasElement>(null),live=useRef(state),render=useRef(()=>{}),[ready,setReady]=useState(false),[unavailable,setUnavailable]=useState(false)
  const drag=useRef<{id:number;x:number;y:number;playerX:number;playerY:number}|null>(null)
  useLayoutEffect(()=>{live.current=state;render.current()},[state,paused])
  useEffect(()=>{
    const node=canvas.current;if(!node)return;const context=node.getContext('2d',{alpha:false})
    if(!context){queueMicrotask(()=>setUnavailable(true));return}
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches
    render.current=()=>{const rect=node.getBoundingClientRect();if(!rect.width||!rect.height)return;const dpr=Math.min(devicePixelRatio||1,2),w=Math.round(rect.width*dpr),h=Math.round(rect.height*dpr);if(node.width!==w||node.height!==h){node.width=w;node.height=h}context.setTransform(dpr,0,0,dpr,0,0);drawArcade(context,live.current,rect.width,rect.height,reduced);setReady(true)}
    const observer=new ResizeObserver(()=>render.current());observer.observe(node);render.current();return()=>{observer.disconnect();render.current=()=>{}}
  },[])
  useEffect(()=>{if(paused)drag.current=null},[paused])
  const point=(event:React.PointerEvent<HTMLCanvasElement>)=>{
    if(paused)return
    const rect=event.currentTarget.getBoundingClientRect(),p=arcadePoint(event.clientX-rect.left,event.clientY-rect.top,rect.width,rect.height,state.mode)
    if(event.type==='pointerdown'){
      if(drag.current)return
      event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId)
      const player=playerPosition(live.current);drag.current={id:event.pointerId,...p,playerX:player.x,playerY:player.y}
    }
    if(drag.current?.id!==event.pointerId)return
    if(state.mode==='flight')onPoint(event.pointerId,drag.current.playerX+p.x-drag.current.x,drag.current.playerY+p.y-drag.current.y)
    else if(state.mode==='breaker')onPoint(event.pointerId,p.x,124)
    else if(event.type==='pointerdown')onPoint(event.pointerId,p.x,p.y)
  }
  const release=(event:React.PointerEvent<HTMLCanvasElement>)=>{if(drag.current?.id!==event.pointerId)return;drag.current=null;onRelease(event.pointerId,event.type!=='pointerup')}
  return <div className="adventure-scene" data-renderer={unavailable?'unavailable':'arcade-2d'} data-rendered={ready?'true':'false'}>
    <canvas ref={canvas} aria-label={state.mode==='flight'?'纵版飞机大战战区':state.mode==='breaker'?'弹珠反弹球台':'横向平台探险地图'} onPointerDown={point} onPointerMove={point} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release}/>
    {unavailable&&<div className="arcade-unavailable">当前浏览器无法创建游戏画布，请更换支持Canvas的浏览器。不会伪装成已渲染。</div>}
  </div>
}