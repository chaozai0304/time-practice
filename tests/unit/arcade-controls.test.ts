import { describe, expect, it } from 'vitest'
import { createArcadeControls, directionVector, stickVector } from '../../src/lib/arcade/controls'
import { arcadePoint, arcadeViewport } from '../../src/lib/arcade/viewport'
import { advanceAdventure, createAdventure } from '../../src/lib/adventure'
describe('拇指触控输入',()=>{
  it('短点维持可见位移窗口，长按连续、松开即停，不推进额外物理帧',()=>{
    const c=createArcadeControls('flight');c.press(1,{x:1},0);c.release(1,20);expect(c.read(80).x).toBe(1);expect(c.read(150).x).toBe(0)
    c.press(2,{y:-1},200);expect(c.read(1500).y).toBe(-1);c.release(2,1500);expect(c.read(1501).y).toBe(0)
  })
  it('两根手指独立，跳跃释放不清掉方向，滑动换向不需要重按',()=>{
    const c=createArcadeControls('platform');c.press(1,{x:1},0);c.press(2,{jump:true},10);expect(c.read(20)).toMatchObject({x:1,jump:true});c.release(2,100);expect(c.read(101)).toMatchObject({x:1,jump:false});c.press(1,{x:-1},200);expect(c.read(201).x).toBe(-1);c.release(1,300);expect(c.read(301).x).toBe(0)
  })
  it('键盘与触控合并，不因抬起无关手指而丢失上下方向，不超速',()=>{
    const c=createArcadeControls('flight');c.key('w',true);c.release(999,100);expect(c.read(101).y).toBe(-1);c.press(1,{x:1},120);c.key('d',true);const v=c.read(130);expect(Math.hypot(v.x,v.y)).toBeCloseTo(1);c.key('d',false);expect(c.read(140).x).toBeGreaterThan(0)
  })
  it('取消、后台/暂停复位清空所有输入和短点，不留下幽灵长按',()=>{
    const c=createArcadeControls('flight');c.press(1,{x:1},0);c.release(1,10,true);expect(c.read(11).x).toBe(0);c.key('w',true);c.press(2,{action:true},20);c.point(3,60,90);c.tap({x:1},30);c.reset();expect(c.read(31)).toMatchObject({x:0,y:0,jump:false,action:false,pointing:false})
  })
  it('拖动没有物理副作用，松手停止；方向覆盖拖动且不会被动作指覆盖',()=>{
    const c=createArcadeControls('flight');c.point(1,70,100);expect(c.read(0)).toMatchObject({pointing:true,aimX:70,aimY:100});c.press(2,{action:true},1);expect(c.read(2).pointing).toBe(true);c.release(1,30);expect(c.read(31).pointing).toBe(false);c.point(3,80,100);c.press(4,{x:-1},40);expect(c.read(41)).toMatchObject({x:-1,pointing:false})
  })
  it('中心死区、斜向归一化、横向限制与非法坐标安全处理',()=>{
    expect(stickVector(.1,.1)).toEqual({x:0,y:0});expect(stickVector(1,-1)).toEqual(directionVector(1,-1));expect(stickVector(1,1,true)).toEqual({x:1,y:0});expect(directionVector(NaN,Infinity)).toEqual({x:0,y:0})
  })
  it('坐标换算与实际渲染共享，横竖屏和留黑区不偏移',()=>{
    for(const [w,h] of [[420,600],[480,350],[300,700]]){const view=arcadeViewport(w,h,'flight'),point=arcadePoint(view.offsetX+50*view.scale,122*view.scale,w,h,'flight');expect(point.x).toBeCloseTo(50,12);expect(point.y).toBeCloseTo(122,12)}
    expect(arcadeViewport(900,400,'platform').offsetX).toBe(0)
  })
  it('短点实际移动超过单帧，松开后实际坐标保持；斜向不比直行更快',()=>{
    const c=createArcadeControls('flight');c.press(1,{x:1},0);c.release(1,10);let state=createAdventure('flight');for(let t=0;t<160;t+=16){const next=advanceAdventure(state,.016,c.read(t),[],[],0);if(next.mode==='flight')state=next}expect(state.player.x).toBeGreaterThan(55);const x=state.player.x;const next=advanceAdventure(state,.08,c.read(300),[],[],0);if(next.mode==='flight')expect(next.player.x).toBe(x)
  })
})