import type {Point,Room,Tile} from './types';

export type Dungeon={tiles:Tile[][];rooms:Room[];start:Point;exit:Point};

const ri=(min:number,max:number)=>Math.floor(Math.random()*(max-min+1))+min;
const overlap=(a:Room,b:Room)=>a.x<=b.x+b.w+1&&a.x+a.w+1>=b.x&&a.y<=b.y+b.h+1&&a.y+a.h+1>=b.y;

export function generateDungeon(width=25,height=15):Dungeon{
  const tiles:Tile[][]=Array.from({length:height},()=>Array<Tile>(width).fill(0));
  const rooms:Room[]=[];
  for(let tries=0;tries<120&&rooms.length<8;tries++){
    const w=ri(4,7),h=ri(3,5),x=ri(1,width-w-2),y=ri(1,height-h-2);
    const room:Room={x,y,w,h,cx:x+Math.floor(w/2),cy:y+Math.floor(h/2)};
    if(rooms.some(r=>overlap(room,r)))continue;
    for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)tiles[yy][xx]=1;
    const prev=rooms.at(-1);
    if(prev){
      const horizontalFirst=Math.random()<.5;
      const carveH=(x1:number,x2:number,yy:number)=>{for(let xx=Math.min(x1,x2);xx<=Math.max(x1,x2);xx++)tiles[yy][xx]=1};
      const carveV=(y1:number,y2:number,xx:number)=>{for(let yy2=Math.min(y1,y2);yy2<=Math.max(y1,y2);yy2++)tiles[yy2][xx]=1};
      if(horizontalFirst){carveH(prev.cx,room.cx,prev.cy);carveV(prev.cy,room.cy,room.cx)}
      else{carveV(prev.cy,room.cy,prev.cx);carveH(prev.cx,room.cx,room.cy)}
    }
    rooms.push(room);
  }
  if(rooms.length<2)return generateDungeon(width,height);
  return {tiles,rooms,start:{x:rooms[0].cx,y:rooms[0].cy},exit:{x:rooms.at(-1)!.cx,y:rooms.at(-1)!.cy}};
}
