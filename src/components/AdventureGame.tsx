import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { App as CapacitorApp } from '@capacitor/app'
import type { AppData, Attempt, Question } from '../lib/model'
import { getQuestionType, gradeLabel, questionLocation, questionTypeLabels } from '../lib/model'
import { advanceAdventure, adventureModes, adventurePool, answerAdventure, createAdventure, nextAdventureLevel, playerPosition, progressLabel, weaponName } from '../lib/adventure'
import type { AdventureMode } from '../lib/adventure'
import { createArcadeControls } from '../lib/arcade/controls'
import { isNative } from '../lib/native'
import { stopEnglishSpeech } from '../lib/speech'
import { shuffle } from '../lib/session'
import { Dialog } from './Dialog'
import { SpeechButton } from './SpeechButton'
import { AdventureScene } from './AdventureScene'
import { GameControls } from './GameControls'
import { Pause, Play, Sparkles, Trophy } from '../ui/icons'
import '../ui/adventure.css'

export function AdventureGame({data,mode,suspended,onAttempt,onExit}:{data:AppData;mode:AdventureMode;suspended:boolean;onAttempt:(attempt:Attempt)=>void;onExit:()=>void}) {
  const [battle,setBattle]=useState(()=>createAdventure(mode)),engine=useRef(battle),controls=useMemo(()=>createArcadeControls(mode),[mode])
  const pool=useMemo(()=>adventurePool(data.questions,data.settings),[data.questions,data.settings]),runtime=useRef({pool,history:data.attempts})
  const [paused,setPaused]=useState(false),[hidden,setHidden]=useState(document.hidden),[menu,setMenu]=useState(true)
  const stopped=paused||hidden||suspended||menu||battle.phase!=='playing',stoppedRef=useRef(stopped),game=adventureModes[mode]
  useLayoutEffect(()=>{runtime.current={pool,history:data.attempts};stoppedRef.current=stopped},[pool,data.attempts,stopped])
  useEffect(()=>{
    const release=()=>controls.reset(),visibility=()=>{setHidden(document.hidden);release()}
    const releasePointer=(event:PointerEvent)=>controls.release(event.pointerId,performance.now(),event.type==='pointercancel')
    const key=(event:KeyboardEvent)=>{
      const k=event.key.toLowerCase(),target=event.target as HTMLElement
      if(!['a','d','w','s','arrowleft','arrowright','arrowup','arrowdown',' '].includes(k))return
      if(event.type==='keyup'){controls.key(k,false);return}
      if(stoppedRef.current||target?.closest('input,textarea,select')||k===' '&&target?.closest('button'))return
      event.preventDefault();controls.key(k,true)
    }
    document.addEventListener('visibilitychange',visibility);window.addEventListener('blur',release);window.addEventListener('keydown',key);window.addEventListener('keyup',key);window.addEventListener('pointerup',releasePointer);window.addEventListener('pointercancel',releasePointer)
    const listener=isNative?CapacitorApp.addListener('appStateChange',state=>{setHidden(!state.isActive||document.hidden);release()}):null
    return()=>{document.removeEventListener('visibilitychange',visibility);window.removeEventListener('blur',release);window.removeEventListener('keydown',key);window.removeEventListener('keyup',key);window.removeEventListener('pointerup',releasePointer);window.removeEventListener('pointercancel',releasePointer);void listener?.then(handle=>handle.remove());stopEnglishSpeech()}
  },[controls])
  useEffect(()=>{
    if(stopped){controls.reset();if(battle.phase!=='question')stopEnglishSpeech();return}
    const clock={frame:0,last:0};const tick=(timestamp:number)=>{const dt=clock.last?(timestamp-clock.last)/1000:0;clock.last=timestamp;const next=advanceAdventure(engine.current,dt,controls.read(timestamp),runtime.current.pool,runtime.current.history,Date.now());engine.current=next;setBattle(next);clock.frame=requestAnimationFrame(tick)}
    clock.frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(clock.frame)
  },[stopped,battle.phase,controls])
  useEffect(()=>{if(hidden||suspended||paused)stopEnglishSpeech()},[hidden,suspended,paused])
  const start=(level:number)=>{controls.reset();engine.current=createAdventure(mode,level);setBattle(engine.current);setMenu(false);setPaused(false)}
  const point=(id:number,x:number,y:number)=>{if(stoppedRef.current)return;if(mode==='platform')controls.press(id,{jump:true},performance.now());else controls.point(id,x,y)}
  const position=playerPosition(battle),boss=battle.mode==='flight'?battle.enemies.find(enemy=>enemy.kind==='boss'):null
  const actionLabel=mode==='flight'?`清屏炸弹 ×${battle.mode==='flight'?battle.bombs:0}`:mode==='breaker'?battle.mode==='breaker'&&battle.serving?'发球':'弹珠飞行中':'跳跃 / 二段跳'
  return <section className={`adventure-game arcade-${mode}`} role="dialog" aria-modal="true" aria-label={game.name} inert={suspended?true:undefined} data-mode={mode} data-phase={battle.phase} data-elapsed={battle.elapsed.toFixed(2)} data-player-x={position.x.toFixed(2)} data-player-y={position.y.toFixed(2)} data-projectiles={battle.mode==='flight'?battle.bullets.length:0} data-enemies={battle.mode==='flight'?battle.enemies.length:0} data-balls={battle.mode==='breaker'?battle.balls.length:0} data-bricks={battle.mode==='breaker'?battle.bricks.length:0} data-vy={battle.mode==='platform'?battle.hero.vy.toFixed(2):0}>
    <header className="battle-header" inert={menu||battle.phase==='question'?true:undefined}><div><span className="battle-kicker">{game.genre} · ORIGINAL ARCADE</span><h2>{game.name}<small>{game.subtitle}</small></h2></div><div className="battle-header-actions"><button className="button secondary" onClick={()=>setMenu(true)}>选择关卡</button><button className="button secondary" disabled={battle.phase!=='playing'} onClick={()=>setPaused(!paused)}>{paused?<Play size={16}/>:<Pause size={16}/>} {paused?'继续游戏':'暂停游戏'}</button><button className="button secondary" onClick={onExit}>返回游戏大厅</button></div></header>
    <div className="battle-hud"><span>STAGE <strong data-testid="battle-level">{battle.level}</strong> / 8</span><span className="arcade-health">生命 <strong data-testid="battle-shield">{'♥'.repeat(Math.max(0,battle.shield))}</strong></span><span>Lv.<strong data-testid="battle-weapon">{battle.weapon}</strong> {weaponName(battle.weapon,mode)}</span><span data-testid="arcade-progress">{progressLabel(battle)}</span><span>SCORE <strong>{String(battle.score).padStart(6,'0')}</strong></span></div>
    <div className="arcade-layout"><aside className="arcade-guide"><span className="battle-kicker">HOW TO PLAY</span><h3>{game.objective}</h3><p>{game.controls}</p><div className="arcade-scope"><strong>{gradeLabel(data.settings.grade)}</strong><p>{data.settings.subjects.join(' / ')}</p><small>仅当前范围 {pool.length} 道启用题</small></div><p>拾取「?」知识补给 → 暂停答题 → 答对升级。答错不会发放奖励。</p></aside>
      <div className="arcade-board"><AdventureScene state={battle} paused={stopped} onPoint={point} onRelease={(id,cancelled)=>controls.release(id,performance.now(),cancelled)}/>{mode==='flight'&&<div className="arcade-auto-badge">AUTO FIRE · 自动连发</div>}{boss&&<div className="arcade-boss"><span>关底旗舰 {Math.max(0,Math.ceil(boss.hp))}/{boss.maxHp}</span><progress max={boss.maxHp} value={Math.max(0,boss.hp)}/></div>}{paused&&<div className="battle-banner">已暂停<br/><small>场景、弹道与进度保留</small></div>}</div>
      <aside className="arcade-guide arcade-reward-guide"><span className="battle-kicker">NEXT UPGRADE</span><h3>{weaponName(Math.min(6,battle.weapon+1),mode)}</h3><p>{mode==='flight'?'机炮自动连发，移动专心躲避弹幕。炸弹只清屏、不直接通关。':mode==='breaker'?'球碰到砖块才计分。移动挡板改变反弹角度，连续消砖加分。':'跳跃有真实重力与落点。注意沟壑，升级后可二段跳、滑翔和吸星。'}</p><span className="arcade-game-number">0{mode==='flight'?1:mode==='breaker'?2:3}</span></aside>
    </div>
    <GameControls mode={mode} controls={controls} stopped={stopped} actionLabel={actionLabel} actionDisabled={battle.mode==='breaker'&&!battle.serving||battle.mode==='flight'&&!battle.bombs}/>
    {battle.lastReward&&!menu&&<div className="battle-reward" role="status"><Sparkles size={16}/>{battle.lastReward}</div>}
    {menu&&<div className="battle-menu"><div className="battle-menu-card"><span className="battle-kicker">{game.genre}</span><h3>{game.name}<small>选择挑战关卡</small></h3><p>{game.description}</p><div className="battle-level-grid">{game.stages.map((name,i)=><button key={name} disabled={!pool.length} onClick={()=>start(i+1)}><strong>{String(i+1).padStart(2,'0')}</strong><span>{name}</span></button>)}</div><p>{game.controls}</p><p>{gradeLabel(data.settings.grade)} · {data.settings.subjects.join(' / ')} · {pool.length} 道题。选关/重试会重新开始本局，已作答记录保留。</p><button className="button secondary" onClick={onExit}>返回游戏大厅</button></div></div>}
    {battle.phase==='question'&&battle.question&&<Dialog title="知识道具 · 答对升级能力" wide><PickupQuestion key={battle.pendingPickup} question={battle.question} reward={weaponName(Math.min(6,battle.weapon+1),mode)} onExit={onExit} onAnswer={answer=>{try{const result=answerAdventure(engine.current,battle.question!.id,answer,Date.now(),battle.pendingPickup);engine.current=result.state;setBattle(result.state);onAttempt(result.attempt);return result.attempt.correct}catch{return false}}}/></Dialog>}
    {['cleared','lost','won'].includes(battle.phase)&&!menu&&<div className="battle-menu"><div className="battle-menu-card"><Trophy size={48}/><h3>{battle.phase==='lost'?'再试一次，继续挑战':battle.phase==='won'?'8关挑战完成！':'本关完成！'}</h3><p>得分 {battle.score} · 道具题答对 {battle.solved} 次 · {weaponName(battle.weapon,mode)}</p><div className="battle-header-actions">{battle.phase==='cleared'&&<button className="button primary" onClick={()=>{engine.current=nextAdventureLevel(engine.current);setBattle(engine.current)}}>进入下一关</button>}<button className="button secondary" onClick={()=>start(battle.level)}>重试本关</button><button className="button secondary" onClick={onExit}>返回游戏大厅</button></div></div></div>}
  </section>
}
function PickupQuestion({question,reward,onAnswer,onExit}:{question:Question;reward:string;onAnswer:(answer:string)=>boolean;onExit:()=>void}) {
  const [answer,setAnswer]=useState(''),[wrong,setWrong]=useState(false),type=getQuestionType(question),[options]=useState(()=>type==='boolean'?['正确','错误']:shuffle(question.options))
  return <div className="pickup-question"><span className="tag">{gradeLabel(question.grade)} · {question.subject} · {questionTypeLabels[type]}</span><p className="small muted">{questionLocation(question)}</p><p className="notice">已拾取知识补给，游戏暂停。答对获得：{reward}。</p><h3>{question.prompt}</h3><SpeechButton question={question}/><form onSubmit={event=>{event.preventDefault();if(!onAnswer(answer))setWrong(true)}}>{options.length?<div className="answer-grid">{options.map(option=><button type="button" className={`answer-option ${answer===option?'selected':''}`} aria-pressed={answer===option} key={option} onClick={()=>{setAnswer(option);setWrong(false)}}>{option}</button>)}</div>:<label className="field" htmlFor="pickup-answer">道具题答案<input id="pickup-answer" maxLength={160} autoComplete="off" value={answer} onChange={event=>{setAnswer(event.target.value);setWrong(false)}}/></label>}{wrong&&<p role="alert" className="form-error">还不正确，请继续思考。未升级能力，游戏仍暂停。</p>}<button className="button primary full" disabled={!answer.trim()}>确认答案并领取升级</button></form><button className="text-button" onClick={onExit}>结束本局，返回游戏大厅</button></div>
}