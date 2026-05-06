import Phaser from "phaser";

export class Player extends Phaser.Physics.Arcade.Sprite {
  
  private direcao : string = "direita"; // direção inicial do personagem
  
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "aluno", 0);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setScale(0.3);
    this.setOrigin(0.5, 1);

    // Animação andar para baixo
    this.anims.create({
      key: "walk_down",
      frames: this.anims.generateFrameNumbers("aluno", { start: 130, end: 137 }),
      frameRate: 10,
      repeat: 0,
    });

    this.anims.create({
      key: "walk_down_idle",
      frames: this.anims.generateFrameNumbers("aluno", { start: 130, end: 130 }),
      frameRate: 0,
      repeat: -1,
    });

    // Animação andar para esquerda
    this.anims.create({
      key: "walk_left",
      frames: this.anims.generateFrameNumbers("aluno", { start: 117, end: 125 }),
      frameRate: 10,
      repeat: 0,
    });

    this.anims.create({
      key: "walk_left_idle",
      frames: this.anims.generateFrameNumbers("aluno", { start: 117, end: 117 }),
      frameRate: 0,
      repeat: -1,
    });

    // Animação andar para direita
    this.anims.create({
      key: "walk_right",
      frames: this.anims.generateFrameNumbers("aluno", { start: 143, end: 151 }),
      frameRate: 10,
      repeat: 0,
    });

    this.anims.create({
      key: "walk_right_idle",
      frames: this.anims.generateFrameNumbers("aluno", { start: 143}),
      frameRate: 0,
      repeat: -1,
    });

    // Animação andar para cima
    this.anims.create({
      key: "walk_up",
      frames: this.anims.generateFrameNumbers("aluno", { start: 105, end: 112 }),
      frameRate: 10,
      repeat: 0,
    });

    this.anims.create({
      key: "walk_up_idle",
      frames: this.anims.generateFrameNumbers("aluno", { start: 105}),
      frameRate: 0,
      repeat: -1,
    });
  }

  update(cursors: Phaser.Types.Input.Keyboard.CursorKeys) {
    const speed = 120;

    let vx = 0;
    let vy = 0;

    // movimento e animação da esquerda e direita
    if (cursors.left?.isDown) {
      vx = -speed;
      this.anims.play("walk_left", true);
      this.direcao = "esquerda";
    } else if (cursors.right?.isDown) {
      vx = speed;
      this.anims.play("walk_right", true);
      this.direcao = "direita";
    }
    // movimento e animação da cima e baixo
    if (cursors.up?.isDown) {
      vy = -speed;
      this.direcao = "cima";
      this.anims.play("walk_up", true);
    } else if (cursors.down?.isDown) {
      vy = speed;
      this.anims.play("walk_down", true);
      this.direcao = "baixo";
    }

    if (vx === 0 && vy === 0) {
      // personagem parado, toca a animação de idle correspondente à última direção
      switch (this.direcao) {
        case "cima":
          this.anims.play("walk_up_idle", true);
          break;
        case "baixo":
          this.anims.play("walk_down_idle", true);
          break;
        case "esquerda":
          this.anims.play("walk_left_idle", true);
          break;
        case "direita":
          this.anims.play("walk_right_idle", true);
          break;
      }
    }

    // se nenhuma tecla de movimento estiver pressionada, o personagem não se move.
    this.setVelocity(vx, vy);
    // normaliza a velocidade para evitar movimento diagonal mais rápido
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.velocity.normalize().scale(speed);

    // profundidade do jogador
    this.setDepth(3);
  }
}
