import type { AdventureState, BreakerState, FlightState, PlatformState } from './types'
import { arcadeViewport } from './viewport'
type C = CanvasRenderingContext2D
function polygon(c:C,points:number[],fill:string|CanvasGradient,stroke?:string) {c.beginPath();for(let i=0;i<points.length;i+=2){if(i===0)c.moveTo(points[i],points[i+1]);else c.lineTo(points[i],points[i+1])}c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=.25;c.stroke()}}
function rounded(c:C,x:number,y:number,w:number,h:number,r:number,fill:string|CanvasGradient) {c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=fill;c.fill()}
function gradient(c:C,top:string,bottom:string,y=142) {const g=c.createLinearGradient(0,0,0,y);g.addColorStop(0,top);g.addColorStop(1,bottom);return g}
function disc(c:C,x:number,y:number,r:number,color:string,glow=0) {c.save();c.shadowColor=color;c.shadowBlur=glow;c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();c.restore()}

/** Original vector aircraft: shaded fuselage, swept wings, canopy and two engine nacelles. */
export function aircraft(c:C,x:number,y:number,size:number,enemy=false,kind='scout',bank=0,time=0) {
  c.save();c.translate(x,y);if(enemy)c.rotate(Math.PI);c.rotate(bank);c.scale(size/5,size/5)
  c.save();c.translate(.8,1.3);c.globalAlpha=.22;polygon(c,[-.8,-6,-2,-1,-5.7,2,-5.7,4,-1.7,2.7,-1.5,5,1.5,5,1.7,2.7,5.7,4,5.7,2,2,-1,.8,-6],'#000');c.restore()
  const body=c.createLinearGradient(-3,0,3,0);body.addColorStop(0,enemy?'#442e56':'#136281');body.addColorStop(.45,enemy?'#f4b888':'#d7f9ff');body.addColorStop(.6,enemy?'#cf657c':'#67cee8');body.addColorStop(1,enemy?'#492854':'#14344f')
  const wing=c.createLinearGradient(0,-2,0,5);wing.addColorStop(0,enemy?'#f38f78':'#c7eeff');wing.addColorStop(.5,enemy?'#9e486e':'#3e94bd');wing.addColorStop(1,enemy?'#332f51':'#0a334e')
  c.shadowColor=enemy?'#fd6b7b':'#5bdfff';c.shadowBlur=enemy?5:12
  polygon(c,[-1.2,-2,-5.8,1.5,-5.8,3.8,-1.5,2.5,-1.3,4.7,1.3,4.7,1.5,2.5,5.8,3.8,5.8,1.5,1.2,-2],wing,enemy?'#fca8a1':'#9ae8ff');c.shadowBlur=0
  for(const side of [-1,1]){
    rounded(c,side*3.1-.55,.1,1.1,4.3,.4,body);rounded(c,side*3.1-.35,.4,.7,1.4,.15,enemy?'#ffc49a':'#d4f7ff')
    const flame=1.6+Math.sin(time*32+side)*.5;polygon(c,[side*3.1-.45,4.1,side*3.1,4.1+flame,side*3.1+.45,4.1],enemy?'#ff8b67':'#5bedff');disc(c,side*3.1,4.2,.35,'#f3ffff',8)
  }
  polygon(c,[0,-6.8,-1.3,-2,-1.3,4.2,0,5.2,1.3,4.2,1.3,-2],body,'#c7edff')
  polygon(c,[0,-4.2,-.75,-1.5,-.6,.6,.6,.6,.75,-1.5],enemy?'#ffe9a8':'#093a5b','#9cffff');polygon(c,[-.25,-3.4,-.5,-1.5,-.3,-.4,.15,-.6],'#d2ffff')
  polygon(c,[-1.2,2.6,-2.8,4.2,-2.7,5.5,0,4.4,2.7,5.5,2.8,4.2,1.2,2.6],wing)
  c.strokeStyle=enemy?'#ffdda0':'#f6d582';c.lineWidth=.45;c.beginPath();c.moveTo(-4.3,1.7);c.lineTo(-2.2,1);c.moveTo(4.3,1.7);c.lineTo(2.2,1);c.stroke()
  if(kind==='boss')for(const side of [-1,1]){rounded(c,side*4.2-.65,-1.5,1.3,5.5,.4,'#34283f');disc(c,side*4.2,-1.1,.5,'#ffb95e',10)}
  c.restore()
}
function flight(c:C,s:FlightState) {
  c.fillStyle=gradient(c,['#123b53','#20354c','#29294a','#153e48'][(s.level-1)%4],'#071a2c');c.fillRect(0,0,100,142)
  // Scrolling sea/land, cloud layers and speed streaks are all deterministic local vectors.
  const scroll=s.elapsed*7
  for(let i=0;i<28;i++){const y=(i*8.9+scroll)%160-9;c.strokeStyle=i%3?'#7ec8dc0c':'#9ce0ed20';c.lineWidth=.25;c.beginPath();c.moveTo(0,y);c.bezierCurveTo(25,y-3,60,y+3,100,y-1);c.stroke()}
  for(let i=0;i<5;i++){const y=(i*42+scroll*.8)%210-40,x=i%2?96:3;c.save();c.translate(x,y);c.rotate(i*.5);c.fillStyle='#153e45';c.beginPath();c.ellipse(0,0,14+i%3*3,22,0,0,Math.PI*2);c.fill();c.strokeStyle='#7fa78a45';c.lineWidth=.9;c.stroke();c.restore()}
  for(let i=0;i<12;i++){const x=((i*41)%117)-8,y=(i*23+scroll*1.35)%180-25;c.save();c.globalAlpha=.07+(i%3)*.035;c.fillStyle='#e2f6ff';for(let j=0;j<3;j++){c.beginPath();c.ellipse(x+j*5,y+Math.sin(i+j)*2,9+j,3.2,0,0,Math.PI*2);c.fill()}c.restore()}
  c.strokeStyle='#d5efff12';c.setLineDash([1,4]);c.lineWidth=.2;for(const x of [25,50,75]){c.beginPath();c.moveTo(x,0);c.lineTo(x,142);c.stroke()}c.setLineDash([])
  for(const shot of s.bullets){c.save();c.shadowColor='#69eaff';c.shadowBlur=10;rounded(c,shot.x-.4,shot.y-2,.8,4,.4,gradient(c,'#f6ffff','#35c9ff',5));c.globalAlpha=.25;rounded(c,shot.x-.65,shot.y+2,1.3,5,.5,'#72e9ff');c.restore()}
  for(const enemy of s.enemies){aircraft(c,enemy.x,enemy.y,enemy.kind==='boss'?12:enemy.kind==='bomber'?6.5:4,true,enemy.kind,0,s.elapsed);if(enemy.hitUntil>s.elapsed)disc(c,enemy.x,enemy.y,1.7,'#fff1c8',8);if(enemy.hp<enemy.maxHp&&enemy.kind!=='boss'){rounded(c,enemy.x-4,enemy.y-7,8,.7,.3,'#211d36');rounded(c,enemy.x-4,enemy.y-7,8*enemy.hp/enemy.maxHp,.7,.3,'#ff9b88')}}
  for(const shot of s.hostile){disc(c,shot.x,shot.y,1,'#ff6e90',9);disc(c,shot.x,shot.y,.45,'#ffe7b0')}
  c.save();if(s.elapsed<s.invulnerableUntil)c.globalAlpha=.55;aircraft(c,s.player.x,s.player.y,5.2,false,'hero',s.player.bank,s.elapsed);c.restore()
  if(s.weapon===6)for(const side of [-1,1])aircraft(c,s.player.x+side*9,s.player.y+2,2.2,false,'wing',0,s.elapsed)
  if(s.bombFlash>s.elapsed){c.strokeStyle='#baf9ff';c.lineWidth=1.4;c.globalAlpha=(s.bombFlash-s.elapsed)*2;c.beginPath();c.arc(50,90,(.4-(s.bombFlash-s.elapsed))*250,0,Math.PI*2);c.stroke();c.globalAlpha=1}
}
const brickColors=['#78def5','#aa9cff','#f19dca','#ffca78','#94e3bb']
function breaker(c:C,s:BreakerState) {
  c.fillStyle=gradient(c,'#171438','#090e24');c.fillRect(0,0,100,142)
  c.strokeStyle='#8c84df13';c.lineWidth=.2;for(let i=0;i<16;i++){c.beginPath();c.moveTo(0,i*10);c.lineTo(100,i*10);c.moveTo(i*8,0);c.lineTo(i*8,142);c.stroke()}
  c.strokeStyle='#a5a1ff50';c.lineWidth=.55;c.beginPath();c.moveTo(1,132);c.lineTo(1,9);c.quadraticCurveTo(1,6,5,6);c.lineTo(95,6);c.quadraticCurveTo(99,6,99,10);c.lineTo(99,132);c.stroke()
  for(const brick of s.bricks){const color=brickColors[brick.color];c.save();c.shadowColor=color;c.shadowBlur=10;rounded(c,brick.x-5.8,brick.y-3,11.6,6,1,color);c.shadowBlur=0;rounded(c,brick.x-5.3,brick.y-2.6,10.6,1.4,.5,'#ffffff60');rounded(c,brick.x-5.3,brick.y+1.5,10.6,1,.4,'#00000030');if(brick.hp>1){c.fillStyle='#292645';c.font='bold 2.8px sans-serif';c.textAlign='center';c.fillText(String(brick.hp),brick.x,brick.y+1)}c.restore()}
  for(const ball of s.balls){c.save();c.globalAlpha=.25;disc(c,ball.x-ball.vx*.028,ball.y-ball.vy*.028,1.5,'#b4eaff');c.globalAlpha=1;disc(c,ball.x,ball.y,1.65,s.weapon>=4?'#ffeaa7':'#efffff',16);disc(c,ball.x-.4,ball.y-.5,.55,'white');c.restore()}
  const x=s.paddle.x,w=s.paddle.width;c.save();c.shadowColor='#a19bff';c.shadowBlur=22;rounded(c,x-w/2,122,w,3.8,1.7,gradient(c,'#ecdcff','#8072df',126));c.shadowBlur=0;rounded(c,x-w/2+1,122.4,w-2,.65,.3,'#ffffffb0');rounded(c,x-w/2+.5,123.4,2.7,1.7,.6,'#61d6f5');rounded(c,x+w/2-3.2,123.4,2.7,1.7,.6,'#61d6f5');c.restore()
  c.fillStyle='#a6aac7';c.font='2.2px sans-serif';c.textAlign='center';c.fillText(s.serving?'点击「发球」开始反弹挑战':'接住弹珠 · 胶囊答题升级',50,136)
}
function star(c:C,x:number,y:number,r:number,color='#ffe6a1') {const points=[];for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,d=i%2?r*.46:r;points.push(x+Math.cos(a)*d,y+Math.sin(a)*d)}polygon(c,points,color,'#fff3c8')}
function platform(c:C,s:PlatformState,width:number) {
  c.fillStyle=gradient(c,'#183c53','#7bad9c');c.fillRect(0,0,width,142)
  disc(c,width*.75,27,13,'#fff1c6');disc(c,width*.75,27,19,'#fff0c51a')
  for(let layer=0;layer<3;layer++){
    const offset=s.cameraX*(.12+layer*.15),color=['#467a82','#366f74','#235e60'][layer];c.fillStyle=color;c.beginPath();c.moveTo(0,142)
    for(let x=-15;x<=width+15;x+=7)c.lineTo(x,70+layer*14+Math.sin((x+offset)*.04+layer)*12+Math.sin((x+offset)*.1)*5);c.lineTo(width,142);c.closePath();c.fill()
    if(layer===2)for(let i=0;i<Math.ceil(width/30)+3;i++){const x=i*31-offset%31;c.fillStyle='#1d5356';rounded(c,x,58,2,65,.4,'#1d5356');for(let j=0;j<3;j++){c.beginPath();c.ellipse(x+1,56+j*7,8+j*2,7,0,0,Math.PI*2);c.fill()}}
  }
  c.save();c.translate(-s.cameraX,0)
  for(const p of s.platforms){if(p.x+p.w<s.cameraX-5||p.x>s.cameraX+width+5)continue;polygon(c,[p.x,p.y,p.x+p.w,p.y,p.x+p.w-5,p.y+18,p.x+p.w*.7,p.y+24,p.x+7,p.y+19],'#3b5f59');polygon(c,[p.x+7,p.y+3,p.x+p.w-6,p.y+3,p.x+p.w-14,p.y+17,p.x+14,p.y+13],'#647868');rounded(c,p.x,p.y-1,p.w,3.8,1.5,'#9bce83');rounded(c,p.x+1,p.y-1,p.w-2,1,.4,'#e1e9aa');for(let j=0;j<Math.floor(p.w/8);j++){c.fillStyle='#b4d591';c.fillRect(p.x+3+j*8,p.y-3,.6,2.5)}for(let j=0;j<3;j++){disc(c,p.x+15+j*19,p.y-3,1.5,['#f5cb91','#eaa6b8','#d0baf4'][j]);disc(c,p.x+15+j*19,p.y-3,.5,'#fff4c2')}}
  for(const coin of s.stars){if(coin.x>s.cameraX-5&&coin.x<s.cameraX+width+5)star(c,coin.x,coin.y,2.5)}
  for(const h of s.hazards){rounded(c,h.x-3,h.y-2,6,5,2,'#b578aa');disc(c,h.x-1.1,h.y-.7,.45,'#f5ffff');disc(c,h.x+1.1,h.y-.7,.45,'#f5ffff');polygon(c,[h.x-2,h.y-2,h.x-2.7,h.y-4,h.x-.7,h.y-2],'#e1b4d5')}
  c.strokeStyle='#ece7c5';c.lineWidth=.7;c.beginPath();c.moveTo(s.goalX,117);c.lineTo(s.goalX,83);c.stroke();polygon(c,[s.goalX,83,s.goalX+13,87,s.goalX,92],'#ffcd85');star(c,s.goalX+4,87,1.6,'#fff3cf')
  const h=s.hero;c.save();c.translate(h.x,h.y);if(s.elapsed<s.invulnerableUntil)c.globalAlpha=.6;if(h.vx<0)c.scale(-1,1)
  const step=h.grounded?Math.sin(s.elapsed*16)*1.3:1.2
  rounded(c,-2,2.4,1.7,3.5+step,.6,'#314760');rounded(c,.7,2.4,1.7,3.5-step,.6,'#314760');rounded(c,-2.6,4.8+step,2.8,1.2,.5,'#f9d290');rounded(c,.6,4.8-step,2.8,1.2,.5,'#f9d290')
  rounded(c,-3.2,-2.2,2.8,5.5,1,'#b77f62');rounded(c,-2,-2.2,4.7,6,1.3,'#f3c367');rounded(c,-.7,-1.6,2.7,3.7,.7,'#ffe2a0');rounded(c,2,-1.3,1.4,3.8,.7,'#f6c6a6');disc(c,.1,-4,2.6,'#f6caa7');rounded(c,-2.8,-7,5.7,2.2,.9,'#66c4b0');rounded(c,-3.8,-5.4,7.3,.8,.4,'#9adebc');disc(c,1.25,-4,.3,'#2c4151')
  if(s.weapon>=3&&!h.grounded){polygon(c,[-8,-9,0,-13,8,-9,3,-7,-3,-7],'#ffe4a1');c.strokeStyle='#f0d7a4';c.lineWidth=.2;c.beginPath();c.moveTo(-6,-9);c.lineTo(-2,-2);c.moveTo(6,-9);c.lineTo(2,-2);c.stroke()}
  if(s.weapon>=4){c.strokeStyle='#e8f4b550';c.lineWidth=.3;c.beginPath();c.arc(0,0,13,0,Math.PI*2);c.stroke()}c.restore();c.restore()
}
export function drawArcade(c:C,state:AdventureState,width:number,height:number,reduced=false) {
  c.clearRect(0,0,width,height);c.fillStyle='#07101c';c.fillRect(0,0,width,height)
  const {scale,offsetX,viewWidth}=arcadeViewport(width,height,state.mode)
  c.save();c.translate(offsetX,0);c.scale(scale,scale)
  if(state.mode==='flight')flight(c,state);else if(state.mode==='breaker')breaker(c,state);else platform(c,state,viewWidth)
  const camera=state.mode==='platform'?state.cameraX:0
  for(const p of state.pickups){const x=p.x-camera;c.save();c.translate(x,p.y);if(!reduced)c.rotate(Math.sin(state.elapsed*3)*.13);c.shadowColor='#ffd670';c.shadowBlur=18;rounded(c,-3.2,-3.6,6.4,7.2,1.2,'#e2a840');c.shadowBlur=0;rounded(c,-2.6,-3,5.2,5.8,.8,'#ffe8a6');c.fillStyle='#735522';c.font='bold 3.8px sans-serif';c.textAlign='center';c.fillText('?',0,1.2);c.restore()}
  for(const f of state.effects){const x=f.x-camera,life=1-f.age/.8;c.save();c.globalAlpha=life;const color=f.kind==='gold'?'#ffde87':f.kind==='spark'?'#b8f5ff':'#ffb46f';if(f.kind==='blast'){c.strokeStyle=color;c.lineWidth=.6;c.beginPath();c.arc(x,f.y,1+f.age*18,0,Math.PI*2);c.stroke();disc(c,x,f.y,Math.max(.1,5*(1-f.age/.8)),color,16)}for(let i=0;i<(f.kind==='blast'?12:5);i++){const angle=i*2.399,travel=f.age*(f.kind==='blast'?17:9),size=Math.max(.15,life*.7);disc(c,x+Math.cos(angle)*travel,f.y+Math.sin(angle)*travel,size,color)}c.restore()}
  c.restore()
}