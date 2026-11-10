import type { AdventureMode } from './types'
export function arcadeViewport(width:number,height:number,mode:AdventureMode) {
  const scale=Math.max(.001,mode==='platform'?height/142:Math.min(width/100,height/142))
  return {scale,offsetX:mode==='platform'?0:(width-scale*100)/2,viewWidth:width/scale}
}
export function arcadePoint(x:number,y:number,width:number,height:number,mode:AdventureMode) {
  const {scale,offsetX}=arcadeViewport(width,height,mode)
  return {x:(x-offsetX)/scale,y:y/scale}
}