import type { Question } from '../model'
export type AdventureMode = 'flight' | 'breaker' | 'platform'
export interface BattleInput { x:number; y:number; jump:boolean; action:boolean; pointing:boolean; aimX:number; aimY:number }
export const idleBattleInput:BattleInput = {x:0,y:0,jump:false,action:false,pointing:false,aimX:50,aimY:122}
export interface Pickup { id:string; x:number; y:number }
export interface Effect { id:string; x:number; y:number; age:number; kind:'blast'|'spark'|'gold' }
export interface BaseState {
  mode:AdventureMode; phase:'playing'|'question'|'cleared'|'won'|'lost'; level:number; elapsed:number
  weapon:number; shield:number; score:number; sequence:number; solved:number; recentQuestions:string[]
  question:Question|null; pendingPickup:string; pickups:Pickup[]; effects:Effect[]; lastReward:string; nextSupply:number
}
export interface Projectile { id:string; x:number; y:number; vx:number; vy:number; damage:number }
export interface EnemyPlane { id:string; x:number; y:number; originX:number; hp:number; maxHp:number; kind:'scout'|'fighter'|'bomber'|'boss'; age:number; nextShot:number; hitUntil:number }
export interface FlightState extends BaseState {
  mode:'flight'; player:{x:number;y:number;bank:number}; enemies:EnemyPlane[]; bullets:Projectile[]; hostile:Projectile[]
  wave:number; kills:number; nextWave:number; nextFire:number; bossSpawned:boolean; bossDefeated:boolean; invulnerableUntil:number
  bombs:number; actionHeld:boolean; bombFlash:number
}
export interface Brick { id:string; x:number; y:number; hp:number; maxHp:number; color:number }
export interface Ball { id:string; x:number; y:number; vx:number; vy:number; lastBrick:string }
export interface BreakerState extends BaseState {
  mode:'breaker'; paddle:{x:number;width:number}; balls:Ball[]; bricks:Brick[]; serving:boolean; broken:number; brickTotal:number; actionHeld:boolean; combo:number
}
export interface Platform { x:number; y:number; w:number }
export interface PlatformState extends BaseState {
  mode:'platform'; hero:{x:number;y:number;vx:number;vy:number;grounded:boolean;jumps:number}; platforms:Platform[]
  stars:{id:string;x:number;y:number}[]; hazards:{x:number;y:number}[]; goalX:number; cameraX:number; checkpoint:{x:number;y:number}
  jumpHeld:boolean; invulnerableUntil:number; collected:number
}
export type AdventureState = FlightState | BreakerState | PlatformState
export const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n))
export function effect(state:BaseState,x:number,y:number,kind:Effect['kind']='blast') {state.effects.push({id:`fx-${++state.sequence}`,x,y,age:0,kind});state.effects=state.effects.slice(-36)}
export function supply(state:BaseState,x:number,y:number) {if(state.pickups.length<3)state.pickups.push({id:`supply-${++state.sequence}`,x,y})}
export function complete(state:BaseState) {state.phase=state.level===8?'won':'cleared'}
export function base(mode:AdventureMode,level:number):BaseState {return {mode,level,phase:'playing',elapsed:0,weapon:1,shield:5,score:0,sequence:0,solved:0,recentQuestions:[],question:null,pendingPickup:'',pickups:[],effects:[],lastReward:'',nextSupply:1.2}}