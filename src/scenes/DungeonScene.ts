import Phaser from 'phaser';
import { generateDungeon } from '../core/DungeonGenerator';
import { adjacent, alive, same, stepToward, walkable } from '../core/TurnEngine';
import type { Dungeon } from '../core/DungeonGenerator';
import type { Enemy, Loot, Point } from '../core/types';

const TILE=32,OX=32,OY=112;
const COLORS={void:0x090d12,floor:0x263238,floor2:0x303e43,wall:0x11181d,edge:0x56645f,robot:0xe4c86b,eye:0x80e9ff,crawler:0xb56b6b,sentinel:0x9a72b5,scrap:0xd18b47,cell:0x63c99b,module:0x6eb6d8,exit:0xe2d27d};

export class DungeonScene extends Phaser.Scene{
  private dungeon!:Dungeon; private floor=1; private hp=12; private maxHp=12; private atk=1; private scrap=0; private modules=0; private level=1; private xp=0; private xpNext=6; private bankedModules=0;
  private player:Point={x:0,y:0}; private enemies:Enemy[]=[]; private loot:Loot[]=[]; private nextId=1;
  private gfx!:Phaser.GameObjects.Graphics; private hud!:Phaser.GameObjects.Text; private log!:Phaser.GameObjects.Text;
  private ended=false; private busy=false; private explored=new Set<string>(); private visionRadius=4; private beaconTurns=0; private energy=100; private turns=0; private bankedScrap=0; private workshop=0; private medkits=1; private emp=1; private note=''; private phase:'field'|'shelter'='field';

  constructor(){super('dungeon')}
  create(){
    this.gfx=this.add.graphics();
    this.hud=this.add.text(28,22,'',{fontFamily:'monospace',fontSize:'18px',color:'#e8dfc5'});
    this.log=this.add.text(28,570,'',{fontFamily:'monospace',fontSize:'16px',color:'#aebdb7',wordWrap:{width:900}});
    this.add.text(28,64,'SHELTER LINK // EXPLORATION UNIT DT-03',{fontFamily:'monospace',fontSize:'14px',color:'#6f9f9a'});
    this.input.keyboard!.on('keydown',this.onKey,this);
    try{const saved=JSON.parse(localStorage.getItem('dt-save-v1')||'{}') as {scrap?:number;modules?:number;workshop?:number};this.bankedScrap=saved.scrap||0;this.bankedModules=saved.modules||0;this.workshop=saved.workshop||0}catch{/* Fresh save */}
    this.phase='shelter';this.showShelter();
  }

  private newFloor(reset=false){
    if(reset){this.floor=1;this.level=1;this.xp=0;this.xpNext=6;this.atk=1;this.maxHp=12;this.hp=this.maxHp;this.scrap=0;this.modules=0;this.beaconTurns=0;this.ended=false;this.energy=100;this.turns=0;this.medkits=1+this.workshop;this.emp=1;this.visionRadius=4;this.phase='field'}
    this.dungeon=generateDungeon();this.player={...this.dungeon.start};this.enemies=[];this.loot=[];this.explored=new Set<string>();
    for(const room of this.dungeon.rooms.slice(1)){
      if(Math.random()<.8)this.enemies.push({id:this.nextId++,pos:{x:room.cx,y:room.cy},hp:this.floor>5?6:4,maxHp:this.floor>5?6:4,kind:Math.random()<Math.max(.25,.8-this.floor*.055)?'crawler':'sentinel'});
      if(Math.random()<.75){
        const p=this.randomFloorIn(room.x,room.y,room.w,room.h);
        this.loot.push({id:this.nextId++,pos:p,kind:Math.random()<.18?'module':Math.random()<.38?'cell':'scrap'});
      }
    }
    this.message(this.floor===1?'連線建立。ZONE I：廢棄地下鐵。回收物資，尋找工程套件資料。':`下降至 B${this.floor}。訊號強度下降。`);
    this.reveal();this.draw();
  }

  private randomFloorIn(x:number,y:number,w:number,h:number):Point{return{x:Phaser.Math.Between(x,x+w-1),y:Phaser.Math.Between(y,y+h-1)}}

  private onKey=(e:KeyboardEvent)=>{
    if(this.busy)return;
    const k=e.key.toLowerCase();
    if(this.phase==='shelter'){if(k==='1')this.buyWorkshop();else if(k==='enter'||k==='r'){this.newFloor(true)}return}
    if(this.ended){if(k==='r'){this.phase='shelter';this.showShelter()}return}
    if(k==='h'&&this.medkits>0){this.medkits--;this.hp=Math.min(this.maxHp,this.hp+7);this.message('使用維修包，恢復最多 7 HP。');this.advanceTurn();return}
    if(k==='q'&&this.emp>0){this.emp--;for(const enemy of alive(this.enemies))if(Math.abs(enemy.pos.x-this.player.x)+Math.abs(enemy.pos.y-this.player.y)<=3)enemy.hp-=4;this.message('EMP 脈衝釋放！近距離機械受到傷害。');this.advanceTurn();return}
    if(k==='.'||k===' '){this.hp=Math.min(this.maxHp,this.hp+1);this.message('待機維修：+1 HP，消耗一回合能源。');this.advanceTurn();return}
    if(k==='e'&&this.beaconTurns===0){this.beaconTurns=4;this.message('RETURN BEACON 啟動：撐過 4 回合即可安全撤離。');this.draw();return}
    let d:Point|undefined;
    if(k==='arrowup'||k==='w')d={x:0,y:-1}; if(k==='arrowdown'||k==='s')d={x:0,y:1};
    if(k==='arrowleft'||k==='a')d={x:-1,y:0}; if(k==='arrowright'||k==='d')d={x:1,y:0};
    if(d)this.playerTurn(d);
  }

  private playerTurn(d:Point){
    const target={x:this.player.x+d.x,y:this.player.y+d.y};
    const enemy=this.enemies.find(e=>e.hp>0&&same(e.pos,target));
    if(enemy){
      const damage=Phaser.Math.Between(1,3)+this.atk;enemy.hp-=damage;this.message(`機械臂撞擊：造成 ${damage} 傷害。`);
      if(enemy.hp<=0){this.scrap+=2;this.xp+=enemy.kind==='sentinel'?4:3;this.message('威脅解除。取得 EXP 與廢料。');if(this.xp>=this.xpNext){this.xp-=this.xpNext;this.level++;this.xpNext=Math.round(this.xpNext*1.45);this.maxHp+=1;this.hp=Math.min(this.maxHp,this.hp+2);this.message('LEVEL UP！機體耐久略增；真正的戰力取決於裝備與資源。')}}
    }else if(walkable(this.dungeon.tiles,target)){this.player=target;this.pickup();this.reveal()}
    else return;
    if(same(this.player,this.dungeon.exit)){
      if(this.floor>=10){if(this.bankedModules+this.modules>=4){this.bankedModules=4;this.extract('深層維修防爆門已解鎖！')}else{this.message(`防爆門需要完整工程套件。安全保存 ${this.bankedModules}/4，本次攜帶 ${this.modules}。按 E 撤離。`)}this.draw();return}
      this.floor++;this.newFloor();this.advanceTurn();return;
    }
    this.advanceTurn();
  }

  private pickup(){
    const item=this.loot.find(l=>same(l.pos,this.player));if(!item)return;
    this.loot=this.loot.filter(l=>l.id!==item.id);
    if(item.kind==='scrap'){this.scrap+=Phaser.Math.Between(2,5);this.message('回收舊世界零件。')}
    if(item.kind==='cell'){const gain=Math.min(5,this.maxHp-this.hp);this.hp+=gain;this.message(gain>0?`維修電池接入，機體 +${gain}。`:'維修電池已回收；目前機體完整。')}
    if(item.kind==='module'){this.modules++;this.message(`★ 發現工程套件資料。本次攜帶 ${this.modules}，安全保存 ${this.bankedModules}/4。`)}
  }

  private persist(){try{localStorage.setItem('dt-save-v1',JSON.stringify({scrap:this.bankedScrap,modules:this.bankedModules,workshop:this.workshop}))}catch{/* Storage unavailable */}}
  private extract(reason='撤離成功'){this.bankedScrap+=this.scrap;this.bankedModules=Math.min(4,this.bankedModules+this.modules);this.persist();this.ended=true;this.message(`${reason} 已存入 ${this.scrap} Scrap，工程套件 ${this.bankedModules}/4。按 R 返回庇護所。`);this.draw()}
  private showShelter(){this.gfx.clear();this.hud.setText('SHELTER // 庇護所整備');this.message(`庫存 ${this.bankedScrap} Scrap｜工程套件 ${this.bankedModules}/4｜維修支援 Lv.${this.workshop}\n[1] 維修工坊升級（${30+this.workshop*30} Scrap，出擊多帶 1 維修包）\n[ENTER] 出擊｜[H] 維修包 [Q] EMP [.] 待機 [E] 撤離`)}
  private buyWorkshop(){const cost=30+this.workshop*30;if(this.workshop>=3){this.message('工坊已達最高等級。');return}if(this.bankedScrap<cost){this.message(`Scrap 不足，需要 ${cost}。`);return}this.bankedScrap-=cost;this.workshop++;this.persist();this.showShelter()}
  private advanceTurn(){this.turns++;this.energy=Math.max(0,this.energy-1);if(this.energy===0)this.hp-=2;if(this.turns>150)this.hp-=1;this.enemyTurn();if(this.hp<=0){this.hp=0;this.ended=true;this.message('SIGNAL LOST｜本次戰利品遺失。按 R 返回庇護所。')}if(this.beaconTurns>0&&!this.ended){this.beaconTurns--;if(this.beaconTurns===0){this.extract();return}}this.draw()}
  private enemyTurn(){
    const enemies=alive(this.enemies);
    for(const e of enemies){
      if(adjacent(e.pos,this.player)){
        const dmg=e.kind==='sentinel'?2:1;this.hp-=dmg;this.message(`${e.kind==='sentinel'?'警戒機':'爬行體'}攻擊，機體 -${dmg}。`);
        if(this.hp<=0){this.hp=0;this.ended=true;this.message('SIGNAL LOST // 戰利品遺失，按 R 返回庇護所。');break}
      }else{
        const dist=Math.abs(e.pos.x-this.player.x)+Math.abs(e.pos.y-this.player.y);
        if(dist<8)e.pos=stepToward(e.pos,this.player,this.dungeon.tiles,enemies.filter(o=>o.id!==e.id).map(o=>o.pos).concat([this.player]));
      }
    }
  }

  private message(s:string){this.note=s;this.log.setText(s)}
  private key(x:number,y:number){return `${x},${y}`}
  private visible(x:number,y:number){
    const dx=x-this.player.x,dy=y-this.player.y;
    return dx*dx+dy*dy<=this.visionRadius*this.visionRadius;
  }
  private reveal(){
    for(let y=0;y<this.dungeon.tiles.length;y++)for(let x=0;x<this.dungeon.tiles[y].length;x++)
      if(this.visible(x,y))this.explored.add(this.key(x,y));
  }
  private draw(){
    this.gfx.clear();
    for(let y=0;y<this.dungeon.tiles.length;y++)for(let x=0;x<this.dungeon.tiles[y].length;x++){
      const px=OX+x*TILE,py=OY+y*TILE,seen=this.explored.has(this.key(x,y)),vis=this.visible(x,y);
      if(!seen)continue;
      const dim=vis?1:.22;
      if(this.dungeon.tiles[y][x]===1){
        const base=(x+y)%3===0?COLORS.floor2:COLORS.floor;
        this.gfx.fillStyle(base,dim).fillRect(px,py,TILE,TILE);
        this.gfx.lineStyle(1,0x526063,vis?.42:.12).strokeRect(px,py,TILE,TILE);
      }else if(this.nearFloor(x,y)){
        this.gfx.fillStyle(COLORS.wall,vis?1:.3).fillRect(px,py,TILE,TILE);
        this.gfx.lineStyle(2,COLORS.edge,vis?.5:.12).lineBetween(px,py+TILE-2,px+TILE,py+TILE-2);
      }
    }
    if(this.explored.has(this.key(this.dungeon.exit.x,this.dungeon.exit.y)))this.drawGlyph(this.dungeon.exit,COLORS.exit,'stairs');
    for(const l of this.loot)if(this.visible(l.pos.x,l.pos.y))this.drawGlyph(l.pos,COLORS[l.kind],l.kind);
    for(const e of alive(this.enemies))if(this.visible(e.pos.x,e.pos.y))this.drawGlyph(e.pos,e.kind==='crawler'?COLORS.crawler:COLORS.sentinel,e.kind);
    this.drawGlyph(this.player,COLORS.robot,'robot');
    this.hud.setText(`B${String(this.floor).padStart(2,'0')} LV${this.level} XP${this.xp}/${this.xpNext} HP${this.hp}/${this.maxHp} EN${this.energy} T${this.turns} SCRAP${this.scrap}`);this.log.setText(`${this.note}\n[H] 維修 ${this.medkits}  [Q] EMP ${this.emp}  [.] 待機  [E] 撤離 ${this.beaconTurns||''}  工程 ${this.bankedModules}/4 SAFE + ${this.modules} CARRY`);
  }

  private nearFloor(x:number,y:number){for(let yy=y-1;yy<=y+1;yy++)for(let xx=x-1;xx<=x+1;xx++)if(this.dungeon.tiles[yy]?.[xx]===1)return true;return false}

  private drawGlyph(p:Point,color:number,kind:string){
    const x=OX+p.x*TILE,y=OY+p.y*TILE,g=this.gfx;
    if(kind==='robot'){
      g.fillStyle(0x252b2c).fillRect(x+7,y+8,18,17);g.fillStyle(color).fillRect(x+9,y+6,14,15);
      g.fillStyle(COLORS.eye).fillRect(x+12,y+10,8,3);g.fillStyle(0x59615c).fillRect(x+6,y+24,7,4).fillRect(x+19,y+24,7,4);
    }else if(kind==='crawler'){
      g.fillStyle(color).fillCircle(x+16,y+18,9);g.fillStyle(0xe6d9ba).fillRect(x+10,y+15,3,3).fillRect(x+19,y+15,3,3);
      g.lineStyle(2,color).lineBetween(x+8,y+22,x+3,y+27).lineBetween(x+24,y+22,x+29,y+27);
    }else if(kind==='sentinel'){
      g.fillStyle(color).fillRect(x+8,y+8,16,17);g.fillStyle(0xf0a7a7).fillRect(x+11,y+13,10,3);g.fillStyle(0x31363b).fillRect(x+13,y+25,6,4);
    }else if(kind==='stairs'){
      g.fillStyle(0x151a1d).fillRect(x+5,y+5,22,22);g.lineStyle(3,color);for(let i=0;i<4;i++)g.lineBetween(x+8+i*4,y+23-i*4,x+23,y+23-i*4);
    }else{
      g.fillStyle(color).fillRect(x+10,y+10,12,12);g.fillStyle(0xf3e7c4,.7).fillRect(x+12,y+12,4,4);
      if(kind==='module')g.lineStyle(2,0xbcecff).strokeRect(x+8,y+8,16,16);
    }
  }
}
