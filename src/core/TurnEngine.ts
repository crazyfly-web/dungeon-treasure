import type {Enemy,Point,Tile} from './types';

export const same=(a:Point,b:Point)=>a.x===b.x&&a.y===b.y;
export const walkable=(tiles:Tile[][],p:Point)=>tiles[p.y]?.[p.x]===1;

export function stepToward(from:Point,to:Point,tiles:Tile[][],blocked:Point[]):Point{
  const dx=Math.sign(to.x-from.x),dy=Math.sign(to.y-from.y);
  const options:Point[]=[];
  if(Math.abs(to.x-from.x)>=Math.abs(to.y-from.y)){options.push({x:from.x+dx,y:from.y},{x:from.x,y:from.y+dy})}
  else{options.push({x:from.x,y:from.y+dy},{x:from.x+dx,y:from.y})}
  return options.find(p=>walkable(tiles,p)&&!blocked.some(b=>same(b,p)))??from;
}

export function adjacent(a:Point,b:Point){return Math.abs(a.x-b.x)+Math.abs(a.y-b.y)===1}
export function alive(enemies:Enemy[]){return enemies.filter(e=>e.hp>0)}
