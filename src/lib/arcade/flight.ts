import { base, clamp, complete, effect, supply } from './types'
import type { BattleInput, EnemyPlane, FlightState, Projectile } from './types'
export const bossHealth=(level:number)=>45+level*12
export function createFlight(level:number):FlightState {
  return {...base('flight',level),mode:'flight',player:{x:50,y:122,bank:0},enemies:[],bullets:[],hostile:[],wave:0,kills:0,nextWave:.45,nextFire:0,bossSpawned:false,bossDefeated:false,invulnerableUntil:0,bombs:2,actionHeld:false,bombFlash:0}
}
export function fireFlight(state:FlightState) {
  if(state.elapsed<state.nextFire)return
  const count=[1,2,3,3,5,5][state.weapon-1]
  for(let i=0;i<count;i++){const offset=i-(count-1)/2;state.bullets.push({id:`shot-${++state.sequence}`,x:state.player.x+offset*2.7,y:state.player.y-7,vx:state.weapon>=3?offset*7:0,vy:-115,damage:state.weapon>=4?2:1})}
  if(state.weapon===6)for(const side of [-1,1])state.bullets.push({id:`wing-${++state.sequence}`,x:state.player.x+side*7,y:state.player.y,vx:side*22,vy:-82,damage:3})
  state.nextFire=state.elapsed+Math.max(.085,.18-state.weapon*.012);state.bullets=state.bullets.slice(-180)
}
function spawn(state:FlightState,x:number,kind:EnemyPlane['kind']) {
  const hp=kind==='boss'?bossHealth(state.level):kind==='bomber'?5+state.level:kind==='fighter'?2+Math.floor(state.level/3):1+Math.floor(state.level/4)
  state.enemies.push({id:`enemy-${++state.sequence}`,x,y:kind==='boss'?-15:-8,originX:x,hp,maxHp:hp,kind,age:0,nextShot:state.elapsed+1.7,hitUntil:0})
}
function shootEnemy(state:FlightState,enemy:EnemyPlane) {
  const boss=enemy.kind==='boss',count=boss?5+Math.floor(state.level/3)*2:1,target=Math.atan2(state.player.x-enemy.x,state.player.y-enemy.y)
  for(let i=0;i<count;i++){const angle=boss?(i-(count-1)/2)*.22+Math.sin(enemy.age)*.16:target,speed=boss?29+state.level:24+state.level;state.hostile.push({id:`danger-${++state.sequence}`,x:enemy.x,y:enemy.y+5,vx:Math.sin(angle)*speed,vy:Math.cos(angle)*speed,damage:1})}
  enemy.nextShot=state.elapsed+(boss?.85:2.6)
}
const radius=(enemy:EnemyPlane)=>enemy.kind==='boss'?13:enemy.kind==='bomber'?6.5:4.2
function hitPlayer(state:FlightState) {if(state.elapsed<state.invulnerableUntil)return;state.shield--;state.invulnerableUntil=state.elapsed+1.4;effect(state,state.player.x,state.player.y);if(state.shield<=0)state.phase='lost'}
function segmentHit(shot:Projectile,enemy:EnemyPlane,dt:number) {
  const dx=shot.vx*dt,dy=shot.vy*dt,t=clamp(((enemy.x-shot.x)*dx+(enemy.y-shot.y)*dy)/(dx*dx+dy*dy||1),0,1)
  return Math.hypot(shot.x+dx*t-enemy.x,shot.y+dy*t-enemy.y)<radius(enemy)+.7
}
/** Vertical shooter: automatic linear salvos, aimed hostile bullets and a mandatory boss. */
export function stepFlight(state:FlightState,dt:number,input:BattleInput) {
  const oldX=state.player.x
  if(input.pointing){state.player.x+=clamp(input.aimX-state.player.x,-95*dt,95*dt);state.player.y+=clamp(input.aimY-state.player.y,-95*dt,95*dt)}else{state.player.x+=input.x*54*dt;state.player.y+=input.y*48*dt}
  state.player.x=clamp(state.player.x,7,93);state.player.y=clamp(state.player.y,48,131);state.player.bank=clamp((state.player.x-oldX)/(dt||1)*.008,-.4,.4)
  fireFlight(state)
  if(input.action&&!state.actionHeld&&state.bombs>0){state.bombs--;state.hostile=[];state.bombFlash=state.elapsed+.4;for(const enemy of state.enemies)enemy.hp-=enemy.kind==='boss'?22:999;effect(state,50,65)}state.actionHeld=input.action
  if(!state.bossSpawned&&(state.elapsed>=20+state.level*2||state.kills>=10+state.level*2)){state.bossSpawned=true;spawn(state,50,'boss');state.lastReward='警报：关底旗舰进入战区！击败它才能过关。'}
  if(!state.bossSpawned&&state.elapsed>=state.nextWave&&state.enemies.length<20){const pattern=state.wave++%4,positions=pattern===0?[24,50,76]:pattern===1?[15,32,68,85]:pattern===2?[35,50,65]:[50];for(const x of positions)spawn(state,x,pattern===3?'bomber':pattern===2?'fighter':'scout');state.nextWave=state.elapsed+Math.max(.9,2.1-state.level*.1)}
  for(const enemy of state.enemies){
    enemy.age+=dt
    if(enemy.kind==='boss'){enemy.y=Math.min(25,enemy.y+13*dt);enemy.x=50+Math.sin(enemy.age*.7)*25}else{enemy.y+=(enemy.kind==='scout'?23:enemy.kind==='bomber'?10:16)*dt;enemy.x=clamp(enemy.originX+Math.sin(enemy.age*1.9+enemy.originX)*7,7,93)}
    if(enemy.y>8&&enemy.y<105&&state.elapsed>=enemy.nextShot)shootEnemy(state,enemy)
  }
  state.bullets=state.bullets.filter(shot=>{const target=state.enemies.find(enemy=>enemy.hp>0&&segmentHit(shot,enemy,dt));if(target){target.hp-=shot.damage;target.hitUntil=state.elapsed+.07;effect(state,shot.x,shot.y,'spark');return false}shot.x+=shot.vx*dt;shot.y+=shot.vy*dt;return shot.y>-12&&shot.x>-5&&shot.x<105})
  state.enemies=state.enemies.filter(enemy=>{
    if(enemy.hp<=0){state.kills++;state.score+=enemy.kind==='boss'?1500:enemy.kind==='bomber'?180:80;effect(state,enemy.x,enemy.y);if(enemy.kind==='boss'){state.bossDefeated=true;complete(state)}else if(state.kills%4===0)supply(state,enemy.x,enemy.y);return false}
    if(Math.hypot(enemy.x-state.player.x,enemy.y-state.player.y)<radius(enemy)+3){hitPlayer(state);if(enemy.kind!=='boss'){effect(state,enemy.x,enemy.y);return false}}return enemy.kind==='boss'||enemy.y<151
  })
  state.hostile=state.hostile.filter(shot=>{shot.x+=shot.vx*dt;shot.y+=shot.vy*dt;if(Math.hypot(shot.x-state.player.x,shot.y-state.player.y)<3.5){hitPlayer(state);return false}return shot.y<147&&shot.x>-5&&shot.x<105}).slice(-220)
  for(const pickup of state.pickups)pickup.y+=12*dt;state.pickups=state.pickups.filter(pickup=>pickup.y<148)
  if(state.elapsed>=state.nextSupply){supply(state,state.player.x,86);state.nextSupply=state.elapsed+12}
  if(state.shield<=0)state.phase='lost'
}