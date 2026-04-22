// =============================================================
//  remotePlayer.ts — Jogador remoto recebido via rede
//  • Interpolação suave (lerp) de posição
//  • Nome acima do sprite
//  • Guard de animação para não re-tocar o mesmo anim
// =============================================================
import Phaser from 'phaser';

const LERP = 0.18; // velocidade de suavização (0 = parado, 1 = instantâneo)

export class RemotePlayer extends Phaser.GameObjects.Sprite {
  private nameTag!: Phaser.GameObjects.Text;
  private targetX: number;
  private targetY: number;
  private readonly textureKey: string;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    characterType: string,
    nickname: string = '',
  ) {
    const key = characterType === 'professor' ? 'professor' : 'mago';
    super(scene, x, y, key, 0);
    this.textureKey = key;
    this.targetX    = x;
    this.targetY    = y;

    scene.add.existing(this);
    this.setOrigin(0.5, 1);
    this.setScale(0.3);
    this.setDepth(5);

    // Nome
    this.nameTag = scene.add.text(x, y + 10, nickname, {
      fontSize        : '7px',
      color           : '#ffdd00',
      stroke          : '#000000',
      fontStyle       : 'bold',
      strokeThickness : 1,
    }).setOrigin(0.5, 2).setDepth(6);
  }

  // Chamado pelo servidor com a nova posição-alvo
  moveTo(x: number, y: number) {
    this.targetX = x;
    this.targetY = y;
  }

  // Chamado no update da cena para aplicar lerp
  interpolate() {
    this.x = Phaser.Math.Linear(this.x, this.targetX, LERP);
    this.y = Phaser.Math.Linear(this.y, this.targetY, LERP);
    this.nameTag.setPosition(this.x, this.y - 2);
  }

  playAnim(key: string) {
    if (this.anims.currentAnim?.key === key && this.anims.isPlaying) return;
    if (this.anims.exists(key)) {
      this.anims.play(key, true);
    }
  }

  destroy(fromScene?: boolean) {
    this.nameTag?.destroy();
    super.destroy(fromScene);
  }
}