import Phaser from 'phaser';
import './style.css';
import { DungeonScene } from './scenes/DungeonScene';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  width: 960,
  height: 640,
  backgroundColor: '#0a0d12',
  pixelArt: true,
  roundPixels: true,
  scene: [DungeonScene],
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }
});
