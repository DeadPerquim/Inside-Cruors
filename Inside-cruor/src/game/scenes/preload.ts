// =============================================================
//  preload.ts — Carrega todos os assets com barra de progresso
// =============================================================
import * as Phaser from 'phaser';

export class Preload extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload() {
    this._createLoadingBar();

    this.load.setPath('/assets');

    // Mapa
    this.load.tilemapTiledJSON('map', 'maps/_Mapas do jogo/Primeira fase.json');

    // Tilesets
    this.load.image(
      'exterior',
      'maps/Craftpix-main-character-house-interior-exterior-trees/Tiled_files/exterior.png'
    );
    this.load.image(
      'Castelo-interior',
      'maps/Castelo (by FlapJack)/Castelo-interior_v2.png'
    );

    // Parallax backgrounds
    this.load.image('clouds1', 'sprites/background-images/Clouds/Clouds 1/1.png');
    this.load.image('clouds2', 'sprites/background-images/Clouds/Clouds 1/2.png');
    this.load.image('clouds3', 'sprites/background-images/Clouds/Clouds 1/3.png');
    this.load.image('clouds4', 'sprites/background-images/Clouds/Clouds 1/4.png');

    // Spritesheets de personagens
    this.load.spritesheet('aluno',     'sprites/characters/mago.png',      { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('professor', 'sprites/characters/prof.png',      { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('mago',      'sprites/characters/mago.png',      { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('rei',       'sprites/characters/rei.png',       { frameWidth: 64, frameHeight: 64 });

    // Partícula de magia (fallback programático caso não exista o arquivo)
    this.load.image('magicParticle', 'sprites/effects/magic_particle.png');

    // Captura erros de asset sem travar o jogo
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.warn(`[preload] asset não carregado: ${file.key} (${file.url})`);
    });
  }

  create() {
    // Garante que a partícula de magia sempre existe mesmo sem o arquivo
  /*  if (!this.textures.exists('magicParticle')) {
      const gfx = this.make.graphics({ x: 0, y: 0, add: false });
      gfx.fillStyle(0xffff00, 1);
      gfx.fillCircle(4, 4, 4);
      gfx.generateTexture('magicParticle', 8, 8);
      gfx.destroy();
    }*/

    this.scene.start('Nickname');
  }

  // ── UI de progresso ──────────────────────────────────────

  private _createLoadingBar() {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    const bg = this.add.rectangle(cx, cy, width * 0.6, 20, 0x333333);
    const bar = this.add.rectangle(cx - width * 0.3, cy, 0, 20, 0x00ccff).setOrigin(0, 0.5);

    this.add.text(cx, cy - 40, 'Carregando…', {
      fontSize: '18px',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      bar.width = bg.width * value;
    });
  }
}