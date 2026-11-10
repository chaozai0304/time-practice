import { base, clamp, complete, effect } from './types'
import type { BattleInput, PlatformState } from './types'
export function createPlatform(level:number):PlatformState {
  const platforms=[{x:0,y:117,w:100}],stars=[],hazards=[],pickups=[]
  for(let i=1;i<8+level;i++)platforms.push({x:100+(i-1)*88+18,y:117-(i%3)*8,w:70})
  for(const [i,p] of platforms.entries()){for(let j=0;j<3;j++)stars.push({id:`star-${i}-${j}`,x:p.x+18+j*15,y:p.y-13});if(i>1&&i%2===0)hazards.push({x:p.x+40,y:p.y-4});if(i%2===0)pickups.push({id:`crystal-${i}`,x:p.x+(i===0?62:30),y:p.y-9})}
  const last=platforms.at(-1)!
  return {...base('platform',level),mode:'platform',hero:{x:20,y:111,vx:0,vy:0,grounded:true,jumps:0},platforms,stars,hazards,pickups,goalX:last.x+50,cameraX:0,checkpoint:{x:20,y:111},jumpHeld:false,invulnerableUntil:0,collected:0}
}
/** Side-scrolling gravity/landing physics with gaps, double jumps and a destination. */
export function stepPlatform(state:PlatformState,dt:number,input:BattleInput) {
  const hero=state.hero,lastFeet=hero.y+6
  if(input.jump&&!state.jumpHeld&&(hero.grounded||state.weapon>=2&&hero.jumps<2)){hero.vy=-67;hero.grounded=false;hero.jumps++;effect(state,hero.x,hero.y+5,'spark')}state.jumpHeld=input.jump
  hero.vx=input.x*(33+(state.weapon>=5?4:0));hero.x=clamp(hero.x+hero.vx*dt,6,state.goalX+5);hero.vy+=132*dt;if(input.jump&&state.weapon>=3&&hero.vy>15)hero.vy=15;hero.y+=hero.vy*dt;hero.grounded=false
  if(hero.vy>=0)for(const p of state.platforms){if(hero.x>p.x-1&&hero.x<p.x+p.w+1&&lastFeet<=p.y+.6&&hero.y+6>=p.y){hero.y=p.y-6;hero.vy=0;hero.grounded=true;hero.jumps=0;state.checkpoint={x:clamp(hero.x,p.x+8,p.x+p.w-8),y:hero.y};break}}
  const reach=state.weapon>=4?16:6;state.stars=state.stars.filter(star=>{if(Math.hypot(hero.x-star.x,hero.y-star.y)<reach){state.collected++;state.score+=20;effect(state,star.x,star.y,'gold');return false}return true})
  const hazard=state.hazards.find(h=>Math.hypot(hero.x-h.x,hero.y-h.y)<7)
  if(hazard&&state.elapsed>=state.invulnerableUntil){state.shield--;state.invulnerableUntil=state.elapsed+1.5;hero.x=Math.max(6,hero.x-8);hero.vy=-32;effect(state,hero.x,hero.y)}
  if(hero.y>158){state.shield--;hero.x=state.checkpoint.x;hero.y=state.checkpoint.y;hero.vy=0;hero.jumps=0;state.invulnerableUntil=state.elapsed+1.5;effect(state,hero.x,hero.y,'gold')}
  state.cameraX=Math.max(0,hero.x-32);if(state.shield<=0)state.phase='lost';else if(hero.x>=state.goalX)complete(state)
}