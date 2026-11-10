import { describe, expect, it } from 'vitest'
import { advanceAdventure, adventurePool, answerAdventure, collectAdventurePickup, createAdventure, idleBattleInput, nextAdventureLevel, playerPosition } from '../../src/lib/adventure'
import type { AdventureMode, AdventureState, BattleInput } from '../../src/lib/adventure'
import { defaultSettings } from '../../src/lib/model'
import type { Question } from '../../src/lib/model'
import { bossHealth } from '../../src/lib/arcade/flight'
const pool:Question[]=[
  {id:'math',grade:3,subject:'数学',type:'choice',prompt:'3 × 4 = ?',options:['12','7','9'],answer:'12',explanation:''},
  {id:'chinese',grade:3,subject:'语文',type:'boolean',prompt:'“日”共4画。',options:[],answer:'正确',explanation:''},
  {id:'english',grade:3,subject:'英语',type:'fill',prompt:'苹果的英文',options:[],answer:'apple',explanation:''},
]
const tick=<T extends AdventureState>(state:T,seconds=.08,input:BattleInput=idleBattleInput)=>advanceAdventure(state,seconds,input,pool,[],1000,()=>.5) as T
const contact=(state:AdventureState=createAdventure('flight'),questions=pool)=>{const p=playerPosition(state);return collectAdventurePickup({...state,pickups:[{id:`p-${state.solved}`,x:p.x,y:p.y}]},questions,[],1000,()=>.5)}
describe('三种独立街机与知识补给',()=>{
  it('范围严格为当前年级/科目/启用；空池不借题、不领奖',()=>{
    expect(adventurePool([...pool,{...pool[0],id:'disabled',enabled:false},{...pool[0],id:'other',grade:4}],defaultSettings).map(q=>q.id)).toEqual(['math'])
    expect(adventurePool(pool,{...defaultSettings,subjects:['科学']})).toEqual([]);expect(contact(createAdventure('flight'),[]).phase).toBe('playing')
  })
  it.each(['flight','breaker','platform'] as AdventureMode[])('%s实际接触补给才出题，非运行阶段全部冻结',mode=>{
    const state=createAdventure(mode),far={...state,pickups:[{id:'far',x:0,y:0}]};expect(collectAdventurePickup(far,pool,[],0)).toBe(far)
    const q=contact(state);expect(q.phase).toBe('question');expect(q.pickups).toHaveLength(0)
    for(const phase of ['question','cleared','lost','won'] as const){const frozen={...q,phase};expect(tick(frozen)).toBe(frozen)}
  })
  it('数学/语文/英语三型轮换，错答冻结且无升级，正确一次升级记录真实科目',()=>{
    let state:AdventureState=createAdventure('flight')
    for(const [i,answer] of ['12','true',' ＡＰＰＬＥ '].entries()){state=contact(state);expect(state.question?.id).toBe(pool[i].id);const bad=answerAdventure(state,pool[i].id,i===1?'错误':'wrong',1);expect(bad.state).toBe(state);expect(bad.attempt.correct).toBe(false);const good=answerAdventure(state,pool[i].id,answer,2);expect(good.attempt.correct).toBe(true);expect(good.attempt.subject).toBe(pool[i].subject);state=good.state;expect(state.weapon).toBe(i+2)}
    expect(state.solved).toBe(3);expect(state.score).toBe(300)
  })
  it('拒绝空答、错题、旧道具和重复奖励；保留新题近期加权和满级上限',()=>{
    const state=contact();expect(()=>answerAdventure(state,'math',' ',0)).toThrow();expect(()=>answerAdventure(state,'other','12',0)).toThrow('过期');expect(()=>answerAdventure(state,'math','12',0,'old')).toThrow('过期')
    const correct=answerAdventure(state,'math','12',0).state;expect(()=>answerAdventure(correct,'math','12',1)).toThrow('过期');expect(answerAdventure({...state,weapon:6},'math','12',0).state.weapon).toBe(6)
    const p=playerPosition(state),recent=collectAdventurePickup({...createAdventure('flight'),recentQuestions:['math'],pickups:[{id:'p',...p}]},[pool[0],{...pool[0],id:'fresh'}],[],0,()=>.5);expect(recent.question?.id).toBe('fresh')
  })
  it('空战没有敌人/未按发射也自动连续发弹，直线弹不追踪目标',()=>{
    let state={...createAdventure('flight'),nextWave:999,nextSupply:999};for(let i=0;i<6;i++)state=tick(state)
    expect(state.bullets.length).toBeGreaterThan(2);expect(state.bullets.every(b=>b.vx===0&&b.vy<0)).toBe(true);expect(state.bullets[0].y).toBeLessThan(state.player.y-20)
    const twin=tick({...createAdventure('flight'),weapon:2}),spread=tick({...createAdventure('flight'),weapon:5});expect(twin.bullets).toHaveLength(2);expect(spread.bullets).toHaveLength(5);expect(spread.bullets.some(b=>b.vx<0)).toBe(true)
  })
  it('空战编队、敌方弹幕、真实碰撞/爆炸计分，迟到帧不会穿过目标',()=>{
    let state=createAdventure('flight');for(let i=0;i<40;i++)state=tick(state);expect(state.wave).toBeGreaterThan(1);expect(state.hostile.length).toBeGreaterThan(0)
    const original={...createAdventure('flight'),nextWave:999,nextSupply:999,enemies:[{id:'target',x:50,y:90,originX:50,hp:1,maxHp:1,kind:'scout' as const,age:0,nextShot:999,hitUntil:0}],bullets:[{id:'s',x:50,y:96,vx:0,vy:-115,damage:1}]},snapshot=structuredClone(original)
    const hit=tick(original);expect(hit.kills).toBe(1);expect(hit.score).toBe(80);expect(hit.effects.some(f=>f.kind==='blast')).toBe(true);expect(original).toEqual(snapshot)
  })
  it('空战必须击败Boss，击破数量不能直接通关；弹幕受击有无敌期，炸弹有限',()=>{
    const boss=tick({...createAdventure('flight'),kills:999});expect(boss.bossSpawned).toBe(true);expect(boss.phase).toBe('playing');expect(boss.enemies.some(e=>e.kind==='boss')).toBe(true);expect(bossHealth(8)).toBeGreaterThan(bossHealth(1))
    const finish=tick({...boss,enemies:boss.enemies.map(e=>({...e,hp:0}))});expect(finish.bossDefeated).toBe(true);expect(finish.phase).toBe('cleared')
    const damage=tick({...createAdventure('flight'),hostile:[{id:'h',x:50,y:121,vx:0,vy:1,damage:1}]});expect(damage.shield).toBe(4)
    const inv=tick({...damage,hostile:[{id:'h2',x:50,y:121,vx:0,vy:1,damage:1}]});expect(inv.shield).toBe(4)
    const bomb=tick({...boss,hostile:[{id:'h',x:10,y:30,vx:0,vy:1,damage:1}]},.08,{...idleBattleInput,action:true});expect(bomb.bombs).toBe(1);expect(bomb.hostile).toHaveLength(0);expect(tick(bomb,.08,{...idleBattleInput,action:true}).bombs).toBe(1)
  })
  it('弹珠等待发球，墙/挡板真实反弹，碰砖才消除得分，不产生子弹',()=>{
    const start=createAdventure('breaker'),served=tick(start,.08,{...idleBattleInput,action:true});expect(start.serving).toBe(true);expect(served.serving).toBe(false);expect(served.balls[0].vy).toBeLessThan(0);expect('bullets' in served).toBe(false)
    const wall=tick({...served,balls:[{id:'b',x:97.8,y:75,vx:45,vy:-20,lastBrick:''}]});expect(wall.balls[0].vx).toBeLessThan(0)
    const paddle=tick({...served,balls:[{id:'b',x:50,y:120.8,vx:0,vy:50,lastBrick:''}]});expect(paddle.balls[0].vy).toBeLessThan(0)
    const brick=start.bricks[0],hit=tick({...served,balls:[{id:'b',x:brick.x,y:brick.y+5,vx:0,vy:-50,lastBrick:''}]});expect(hit.broken).toBe(1);expect(hit.score).toBeGreaterThan(0);expect(hit.bricks).toHaveLength(start.bricks.length-1)
  })
  it('弹珠全掉扣生命并回到发球；必须清砖通关，答题真实加宽/分裂',()=>{
    const state=createAdventure('breaker'),drop=tick({...state,serving:false,balls:[{id:'b',x:90,y:146,vx:0,vy:20,lastBrick:''}]});expect(drop.shield).toBe(4);expect(drop.serving).toBe(true)
    expect(tick({...state,bricks:[]}).phase).toBe('cleared');expect(tick({...createAdventure('breaker',8),bricks:[]}).phase).toBe('won')
    const q=contact(state),wide=answerAdventure(q,'math','12',0).state;expect(wide.mode).toBe('breaker');if(wide.mode==='breaker')expect(wide.paddle.width).toBeGreaterThan(state.paddle.width)
    const multi=answerAdventure(contact({...state,weapon:2,serving:false,balls:[{id:'b',x:40,y:70,vx:20,vy:-40,lastBrick:''}]}),'math','12',0).state;if(multi.mode==='breaker')expect(multi.balls).toHaveLength(2)
  })
  it('平台左右移动、重力跳跃/落地；一级不能空中再跳，升级才二段跳',()=>{
    const start=createAdventure('platform'),jump=tick(start,.08,{...idleBattleInput,jump:true});expect(jump.hero.y).toBeLessThan(start.hero.y);expect(jump.hero.grounded).toBe(false)
    const released=tick(jump),noDouble=tick(released,.08,{...idleBattleInput,jump:true}),double=tick({...released,weapon:2},.08,{...idleBattleInput,jump:true});expect(double.hero.vy).toBeLessThan(noDouble.hero.vy);expect(double.hero.jumps).toBe(2)
    let land=jump;for(let i=0;i<20;i++)land=tick(land);expect(land.hero.grounded).toBe(true);expect(land.hero.y).toBe(111);expect('bullets' in land).toBe(false)
    const right=tick(start,.08,{...idleBattleInput,x:1});expect(right.hero.x).toBeGreaterThan(start.hero.x)
  })
  it('平台掉落扣生命回检查点；终点而非击杀过关，滑翔与磁吸真实改变物理',()=>{
    const state=createAdventure('platform'),fall=tick({...state,hero:{...state.hero,y:159,grounded:false}});expect(fall.shield).toBe(4);expect(fall.hero.y).toBeLessThan(140)
    expect(tick({...state,hero:{...state.hero,x:state.goalX}}).phase).toBe('cleared')
    const air={...state,hero:{...state.hero,y:60,vy:30,grounded:false,jumps:2}},normal=tick(air,.08,{...idleBattleInput,jump:true}),glide=tick({...air,weapon:3},.08,{...idleBattleInput,jump:true});expect(glide.hero.y).toBeLessThan(normal.hero.y)
    const magnet=tick({...state,weapon:4,stars:[{id:'star',x:30,y:110}]});expect(magnet.collected).toBe(1)
  })
  it('八关范围校验、过关保留能力/记录、非运行/非法dt不推进',()=>{
    expect(()=>createAdventure('flight',9)).toThrow();expect(()=>createAdventure('breaker',NaN)).toThrow();const state=createAdventure('flight');expect(tick(state,NaN)).toBe(state);expect(tick(state,-1)).toBe(state);expect(tick(state,999).elapsed).toBeCloseTo(.08)
    const next=nextAdventureLevel({...state,phase:'cleared',weapon:4,score:400});expect(next.level).toBe(2);expect(next.weapon).toBe(4);expect(next.score).toBe(400);expect(nextAdventureLevel(state)).toBe(state)
  })
  it.each([1,4,8])('平台第%s关可通过真实移动/跳跃/答题抵达终点，不靠改坐标通关',level=>{
    let state=createAdventure('platform',level)
    for(let i=0;i<1800&&state.phase!=='cleared'&&state.phase!=='won'&&state.phase!=='lost';i++){
      if(state.phase==='question'){const answered=answerAdventure(state,state.question!.id,state.question!.answer,1000).state;if(answered.mode==='platform')state=answered;continue}
      const h=state.hero,p=state.platforms.find(p=>h.x>=p.x&&h.x<=p.x+p.w),edge=!!p&&p.x+p.w-h.x<8,obstacle=state.hazards.some(o=>o.x>h.x&&o.x-h.x<12&&Math.abs(o.y-h.y)<14)
      const jump=h.grounded&&(edge||obstacle)
      state=tick(state,.04,{...idleBattleInput,x:1,jump})
    }
    expect(state.phase).toBe(level===8?'won':'cleared');expect(state.solved).toBeGreaterThan(0)
  })
})