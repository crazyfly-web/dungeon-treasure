export type Point={x:number;y:number};
export type Tile=0|1;
export type Room={x:number;y:number;w:number;h:number;cx:number;cy:number};
export type Enemy={id:number;pos:Point;hp:number;maxHp:number;kind:'crawler'|'sentinel'};
export type Loot={id:number;pos:Point;kind:'scrap'|'cell'|'module'};
