import { base, clamp, complete, effect, supply } from './types'
import type { BattleInput, BreakerState } from './types'
export function createBreaker(level:number):BreakerState {
  const rows=3+Math.ceil(level/2),bricks=[]
  for(let row=0;row<rows;row++)for(let col=0;col<7;col++){if(level%2===0&&row%2&&col===3)continue;const hp=1+Math.floor((row+level-1)/4);bricks.push({id:`brick-${row}-${col}`,x:11.5+col*12.8,y:25+row*8,hp,maxHp:hp,color:row%5})}
  return {...base('breaker',level),mode:'breaker',nextSupply:3.5,paddle:{x:50,width:17},balls:[{id:'ball-0',x:50,y:119,vx:0,vy:0,lastBrick:''}],bricks,serving:true,broken:0,brickTotal:bricks.length,actionHeld:false,combo:0}
}
export function launchBalls(state:BreakerState) {
  if(!state.serving)return
  const speed=49+state.level*2;state.balls=[{id:`ball-${++state.sequence}`,x:state.paddle.x,y:118,vx:speed*.3,vy:-speed*.954,lastBrick:''}];state.serving=false
  if(state.weapon>=3)state.balls.push({...state.balls[0],id:`ball-${++state.sequence}`,vx:-speed*.4})
}
/** Circle/AABB physics: no enemies, projectiles, aiming or flight controls. */
export function stepBreaker(state:BreakerState,dt:number,input:BattleInput) {
  const width=17+(state.weapon-1)*2.1;state.paddle.width=width;state.paddle.x=clamp(input.pointing?input.aimX:state.paddle.x+input.x*62*dt,width/2+1,99-width/2)
  if(input.action&&!state.actionHeld)launchBalls(state);state.actionHeld=input.action
  if(state.serving){for(const ball of state.balls){ball.x=state.paddle.x;ball.y=119}}
  else for(const ball of state.balls){
    const lastX=ball.x,lastY=ball.y;ball.x+=ball.vx*dt;ball.y+=ball.vy*dt
    if(ball.x<2||ball.x>98){ball.x=clamp(ball.x,2,98);ball.vx=-ball.vx;effect(state,ball.x,ball.y,'spark')}if(ball.y<11){ball.y=11;ball.vy=Math.abs(ball.vy)}
    if(ball.vy>0&&lastY<=121&&ball.y>=121&&Math.abs(ball.x-state.paddle.x)<width/2+1.8){const offset=clamp((ball.x-state.paddle.x)/(width/2),-.95,.95),speed=Math.min(77,Math.hypot(ball.vx,ball.vy)+.6);ball.vx=Math.sin(offset*1.12)*speed;if(Math.abs(ball.vx)<8)ball.vx=ball.vx<0?-8:8;ball.vy=-Math.cos(offset*1.12)*speed;ball.y=120;state.combo=0;effect(state,ball.x,123,'spark')}
    const brick=state.bricks.find(brick=>brick.hp>0&&Math.abs(ball.x-brick.x)<6.7&&Math.abs(ball.y-brick.y)<4.3)
    if(brick&&brick.id!==ball.lastBrick){brick.hp-=1+Math.floor((state.weapon-1)/3);ball.lastBrick=brick.id;effect(state,brick.x,brick.y,'spark');if(state.weapon<4){if(Math.abs(lastX-brick.x)>6.7)ball.vx=-ball.vx;else ball.vy=-ball.vy}if(brick.hp<=0){state.broken++;state.combo++;state.score+=50+Math.min(5,state.combo)*10;effect(state,brick.x,brick.y,'gold');if(state.broken%5===0)supply(state,brick.x,brick.y)}}else if(!brick)ball.lastBrick=''
  }
  state.bricks=state.bricks.filter(brick=>brick.hp>0);state.balls=state.balls.filter(ball=>ball.y<145)
  if(!state.balls.length){state.shield--;state.combo=0;state.serving=true;state.balls=[{id:`ball-${++state.sequence}`,x:state.paddle.x,y:119,vx:0,vy:0,lastBrick:''}];if(state.shield<=0)state.phase='lost'}
  for(const pickup of state.pickups)pickup.y+=21*dt;state.pickups=state.pickups.filter(pickup=>pickup.y<145)
  if(state.elapsed>=state.nextSupply){supply(state,state.paddle.x,91);state.nextSupply=state.elapsed+14}if(!state.bricks.length&&state.phase!=='lost')complete(state)
}
export function splitBall(state:BreakerState) {if(!state.serving&&state.weapon>=3&&state.balls.length<3){const source=state.balls[0];if(source)state.balls.push({...source,id:`ball-${++state.sequence}`,vx:-source.vx||20})}}