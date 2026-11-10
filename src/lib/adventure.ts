import type { Attempt, Question, Settings } from './model'
import { getQuestionType } from './model'
import { booleanAnswer } from './questions'
import { eligibleQuestions, normalizeAnswer, prioritizeQuestions } from './session'
import { createFlight, stepFlight } from './arcade/flight'
import { createBreaker, splitBall, stepBreaker } from './arcade/breaker'
import { createPlatform, stepPlatform } from './arcade/platform'
import { effect, idleBattleInput } from './arcade/types'
import type { AdventureMode, AdventureState, BattleInput } from './arcade/types'
export type { AdventureMode, AdventureState, BattleInput } from './arcade/types'
export { idleBattleInput }

export const adventureModes = {
  flight:{name:'雷霆空战',subtitle:'纵版街机 · 自动连发',description:'拖动战机穿越敌机编队和弹幕，自动连发一路突破；知识补给解锁双发、散射和僚机，击败关底旗舰。',color:'#67e8f9',controls:'左手方向盘上下左右/斜向移动，或在战区任意位置拖动；自动射击，右手大招键清屏。键盘WASD/方向键、空格也可用。',genre:'SHOOT ’EM UP',objective:'击败关底旗舰',stages:['海岸起飞','云海突击','钢铁编队','暮色航道','极地风暴','深空防线','旗舰包围','终极空域']},
  breaker:{name:'弹珠破阵',subtitle:'反弹物理 · 连击消砖',description:'移动挡板接住弹珠，让反弹轨迹击碎彩色砖阵。知识胶囊升级宽挡板、多球和穿透弹珠；清空砖阵过关。',color:'#c4b5fd',controls:'左右滑动底部大滑条或球台移动挡板，也可长按左右方向键；右手发球键/空格开始。',genre:'BRICK BREAKER',objective:'清空全部砖块',stages:['初见光谱','彩虹阶梯','水晶矩阵','双翼回廊','霓虹蜂巢','多重壁垒','星光迷阵','最终破阵']},
  platform:{name:'秘境跳跃',subtitle:'横版探险 · 跳跃闯关',description:'操控小小探险家跳过沟壑、避开守卫，穿越浮岛到达旗帜。知识水晶解锁二段跳、滑翔和星星磁吸。',color:'#9befbc',controls:'左手长按左右，右手点击跳跃，可双指同时操作；解锁后二次按为二段跳、按住为滑翔。A/D、空格/W/上键也可用。',genre:'PLATFORM ADVENTURE',objective:'抵达终点旗帜',stages:['晨光草甸','林间浮岛','蘑菇山谷','瀑布断桥','云上阶梯','水晶峡谷','薄暮遗迹','星光之巅']},
} as const
const upgrades={flight:['单发机炮','双联机炮','三向散射','重型机炮','五向弹幕','雷霆僚机'],breaker:['标准弹珠','加宽挡板','分裂多球','穿透弹珠','超宽接球','满阶破阵'],platform:['轻盈跳跃','二段跳','浮空滑翔','星星磁吸','疾风步伐','全能探险']} as const
export const weaponName=(weapon:number,mode:AdventureMode='flight')=>upgrades[mode][Math.max(0,Math.min(5,weapon-1))]
export const adventurePool=(questions:Question[],settings:Settings)=>eligibleQuestions(questions,settings)
export function createAdventure(mode:'flight',level?:number):ReturnType<typeof createFlight>
export function createAdventure(mode:'breaker',level?:number):ReturnType<typeof createBreaker>
export function createAdventure(mode:'platform',level?:number):ReturnType<typeof createPlatform>
export function createAdventure(mode:AdventureMode,level?:number):AdventureState
export function createAdventure(mode:AdventureMode,level=1):AdventureState {
  if(!Number.isInteger(level)||level<1||level>8)throw new Error('请选择1至8关')
  return mode==='flight'?createFlight(level):mode==='breaker'?createBreaker(level):createPlatform(level)
}
function copy(state:AdventureState):AdventureState {
  const common={pickups:state.pickups.map(p=>({...p})),effects:state.effects.map(f=>({...f}))}
  if(state.mode==='flight')return {...state,...common,player:{...state.player},enemies:state.enemies.map(e=>({...e})),bullets:state.bullets.map(b=>({...b})),hostile:state.hostile.map(b=>({...b}))}
  if(state.mode==='breaker')return {...state,...common,paddle:{...state.paddle},balls:state.balls.map(b=>({...b})),bricks:state.bricks.map(b=>({...b}))}
  return {...state,...common,hero:{...state.hero},checkpoint:{...state.checkpoint},stars:[...state.stars]}
}
export function playerPosition(state:AdventureState) {return state.mode==='flight'?state.player:state.mode==='breaker'?{x:state.paddle.x,y:124}:state.hero}
export function progressLabel(state:AdventureState) {return state.mode==='flight'?state.bossSpawned?'BOSS决战':`第 ${state.wave} 波编队`:state.mode==='breaker'?`砖块 ${state.broken}/${state.brickTotal}`:`旅程 ${Math.min(100,Math.floor(state.hero.x/state.goalX*100))}%`}
export function collectAdventurePickup(state:AdventureState,pool:Question[],attempts:Attempt[],now:number,random=Math.random):AdventureState {
  if(state.phase!=='playing'||!pool.length)return state
  const player=playerPosition(state),pickup=state.pickups.find(p=>state.mode==='breaker'?Math.abs(p.x-player.x)<state.paddle.width/2+3&&Math.abs(p.y-player.y)<5:Math.hypot(p.x-player.x,p.y-player.y)<7)
  if(!pickup)return state
  const subjects=[...new Set(pool.map(q=>q.subject))],subject=subjects[state.solved%subjects.length],question=prioritizeQuestions(pool.filter(q=>q.subject===subject),attempts,now,state.recentQuestions,random)[0]
  if(!question)return state
  return {...state,phase:'question',question,pendingPickup:pickup.id,pickups:state.pickups.filter(p=>p.id!==pickup.id),lastReward:''}
}
export function answerAdventure(state:AdventureState,questionId:string,answer:string,now:number,pickupId=state.pendingPickup):{state:AdventureState;attempt:Attempt} {
  if(state.phase!=='question'||!state.question||!state.pendingPickup||state.question.id!==questionId||state.pendingPickup!==pickupId)throw new Error('题目或道具会话已过期')
  if(!answer.trim())throw new Error('请先选择或填写答案')
  const q=state.question,correct=getQuestionType(q)==='boolean'?booleanAnswer(answer)===booleanAnswer(q.answer):normalizeAnswer(answer)===normalizeAnswer(q.answer)
  const attempt:Attempt={id:crypto.randomUUID(),questionId:q.id,prompt:q.prompt,subject:q.subject,answer:answer.trim(),correct,at:now}
  if(!correct)return {state,attempt}
  const next=copy(state);next.weapon=Math.min(6,state.weapon+1);next.shield=Math.min(5,state.shield+1);next.phase='playing';next.question=null;next.pendingPickup='';next.solved++;next.score+=100;next.recentQuestions=[...state.recentQuestions,q.id].slice(-5)
  next.lastReward=next.weapon>state.weapon?`答对啦！${weaponName(next.weapon,next.mode)}已解锁`:'已满级！恢复1点生命，获得100分补给'
  if(next.mode==='flight'&&next.solved%2===0)next.bombs=Math.min(3,next.bombs+1)
  if(next.mode==='breaker'){next.paddle.width=17+(next.weapon-1)*2.1;splitBall(next)}
  const player=playerPosition(next);effect(next,player.x,player.y,'gold');return {state:next,attempt}
}
export function nextAdventureLevel(state:AdventureState):AdventureState {
  if(state.phase!=='cleared'||state.level>=8)return state
  const next=createAdventure(state.mode,state.level+1);next.weapon=state.weapon;next.shield=Math.min(5,state.shield+1);next.score=state.score;next.solved=state.solved;next.recentQuestions=state.recentQuestions;next.lastReward=`进入第${next.level}关，能力保留！`
  if(next.mode==='breaker')next.paddle.width=17+(next.weapon-1)*2.1
  return next
}
export function advanceAdventure(previous:AdventureState,seconds:number,input:BattleInput,pool:Question[],attempts:Attempt[],now:number,random=Math.random):AdventureState {
  if(previous.phase!=='playing'||!Number.isFinite(seconds)||seconds<=0)return previous
  let state=copy(previous),remaining=Math.min(.08,seconds)
  while(remaining>1e-6&&state.phase==='playing'){
    const dt=Math.min(.008,remaining);remaining-=dt;state.elapsed+=dt;for(const f of state.effects)f.age+=dt;state.effects=state.effects.filter(f=>f.age<.8)
    if(state.mode==='flight')stepFlight(state,dt,input);else if(state.mode==='breaker')stepBreaker(state,dt,input);else stepPlatform(state,dt,input)
    state=collectAdventurePickup(state,pool,attempts,now,random)
  }
  return state
}