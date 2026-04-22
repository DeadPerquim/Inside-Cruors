// =============================================================
//  player.ts — Jogador local controlado pelo teclado
//  • Velocidade diagonal normalizada
//  • Hitbox ajustado
//  • Animações protegidas contra re-criação duplicada
//  • Nome exibido sobre o sprite
// =============================================================
import Phaser from 'phaser';

export class Player extends Phaser.Physics.Arcade.Sprite {
  private facing: 'up' | 'down' | 'left' | 'right' = 'down';
  public currentAnimKey: string = '';
  private nameTag!: Phaser.GameObjects.Text;
  private readonly textureKey: string;

  constructor(
    scene: Phaser.Scene,
    x: number, y: number,
    characterType: 'professor' | 'mago' | string = 'mago',
    nickname: string = '',
  ) {
    const key = characterType === 'professor' ? 'professor' : 'mago';
    super(scene, x, y, key, 0);
    this.textureKey = key;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setScale(0.3);
    this.setOrigin(0.5, 1);
    this.setDepth(5);

    // Hitbox menor para não travar em bordas de tile
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(28, 28);
    body.setOffset(18, 52);

    this._registerAnimations(scene);
    this._playAndStore('walk_down_idle');

    // Nome acima do sprite
    this.nameTag = scene.add.text(x, y + 10, nickname, {
      fontSize : '8px',
      color    : '#ffffff',
      stroke   : '#000000',
      strokeThickness: 3,
      fontStyle: 'bold',
    }).setOrigin(0.5, 2).setDepth(6);
  }

  // ── Animações ────────────────────────────────────────────

  private _registerAnimations(scene: Phaser.Scene) {
    const anims = scene.anims;
    const k     = this.textureKey;
    const fps   = 10;

    const defs = [
      { key: 'walk_up',    start: 105, end: 112 },
      { key: 'walk_left',  start: 117, end: 125 },
      { key: 'walk_down',  start: 130, end: 137 },
      { key: 'walk_right', start: 143, end: 151 },
    ];

    for (const d of defs) {
      const walkKey = `${k}_${d.key}`;
      const idleKey = `${k}_${d.key}_idle`;
      if (!anims.exists(walkKey)) {
        anims.create({
          key      : walkKey,
          frames   : anims.generateFrameNumbers(k, { start: d.start, end: d.end }),
          frameRate: fps,
          repeat   : -1,
        });
      }
      if (!anims.exists(idleKey)) {
        anims.create({
          key      : idleKey,
          frames   : anims.generateFrameNumbers(k, { start: d.start, end: d.start }),
          frameRate: 0,
          repeat   : -1,
        });
      }
    }
  }

  // ── Update ───────────────────────────────────────────────

  update(cursors: Phaser.Types.Input.Keyboard.CursorKeys) {
    const speed = 120;
    let vx = 0;
    let vy = 0;

    const left  = cursors.left?.isDown  ?? false;
    const right = cursors.right?.isDown ?? false;
    const up    = cursors.up?.isDown    ?? false;
    const down  = cursors.down?.isDown  ?? false;

    if (left)  { vx = -speed; this.facing = 'left';  }
    if (right) { vx =  speed; this.facing = 'right'; }
    if (up)    { vy = -speed; this.facing = 'up';    }
    if (down)  { vy =  speed; this.facing = 'down';  }

    // Normaliza diagonal para manter velocidade constante
    if (vx !== 0 && vy !== 0) {
      const norm = Math.SQRT2;
      vx /= norm;
      vy /= norm;
    }

    this.setVelocity(vx, vy);

    // Escolhe animação
    const isMoving = vx !== 0 || vy !== 0;
    const animKey  = isMoving
      ? `${this.textureKey}_walk_${this.facing}`
      : `${this.textureKey}_walk_${this.facing}_idle`;

    this._playAndStore(animKey);

    // Atualiza posição do nome
    this.nameTag.setPosition(this.x, this.y - 2);
  }

  private _playAndStore(key: string) {
    if (this.currentAnimKey !== key) {
      this.anims.play(key, true);
      this.currentAnimKey = key;
    }
  }

  destroy(fromScene?: boolean) {
    this.nameTag?.destroy();
    super.destroy(fromScene);
  }
}