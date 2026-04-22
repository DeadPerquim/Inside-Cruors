// =============================================================
//  boot.ts — Primeira cena: apenas inicia o Preload
// =============================================================
import { Scene } from 'phaser';

export class Boot extends Scene {
  constructor() {
    super('Boot');
  }

  create() {
    this.scene.start('Preload');
  }
}