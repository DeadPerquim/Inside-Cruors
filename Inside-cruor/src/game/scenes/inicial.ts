import { Scene } from "phaser";
import { Player } from "../player";

export class Inicial extends Scene {
  private bg1!: Phaser.GameObjects.TileSprite;
  private bg2!: Phaser.GameObjects.TileSprite;
  private bg3!: Phaser.GameObjects.TileSprite;
  private bg4!: Phaser.GameObjects.TileSprite;

  private player!: Player;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  exteriorTiles: any;

  constructor() {
    super("Inicial");
  }

  create() {
    const map = this.make.tilemap({ key: "map" });
    const { width, height } = this.scale;

    // backgrounds (nuvens)
    this.bg1 = this.add.tileSprite(0, 0, width, height, "clouds1").setOrigin(0, 0).setScrollFactor(0);
    this.bg2 = this.add.tileSprite(0, 0, width, height, "clouds2").setOrigin(0, 0).setScrollFactor(0);
    this.bg3 = this.add.tileSprite(0, 0, width, height, "clouds3").setOrigin(0, 0).setScrollFactor(0);
    this.bg4 = this.add.tileSprite(0, 0, width, height, "clouds4").setOrigin(0, 0).setScrollFactor(0);

    // tilesets
    const exteriorTiles = map.addTilesetImage("exterior", "exterior");
    const casteloTiles = map.addTilesetImage("Castelo-interior", "Castelo-interior");

    if (!exteriorTiles || !casteloTiles) {
      console.error("Tileset não carregou!");
      return;
    }

    const allTilesets = [exteriorTiles, casteloTiles];

    // layers
    const chaoLayer = map.createLayer("Chão/Base", allTilesets);
    const paredesLayer = map.createLayer("Paredes", allTilesets);
    const decoracaoLayer = map.createLayer("Decoração", allTilesets);
    const objetosLayer = map.createLayer("Objetos", allTilesets);
    const bgObjectsLayer = map.createLayer("BackgroundObjects", allTilesets);
    const foregroundLayer = map.createLayer("Foreground", allTilesets);

    if (!chaoLayer || !paredesLayer) {
      console.error("Layers não carregaram!");
      return;
    }

    // profundidade das layers
    chaoLayer.setDepth(0);
    paredesLayer.setDepth(1);
    decoracaoLayer?.setDepth(2);
    objetosLayer?.setDepth(3);
    bgObjectsLayer?.setDepth(4);
    foregroundLayer?.setDepth(1000); // sempre na frente

    // colisão
    paredesLayer.setCollisionByProperty({ colisao: true });
    chaoLayer.setCollisionByProperty({ colisao: true });
    decoracaoLayer?.setCollisionByProperty({colisao: true});
    objetosLayer?.setCollisionByProperty({colisao: true});
    foregroundLayer?.setCollisionByProperty({colisao: true});
    bgObjectsLayer?.setCollisionByProperty({colisao: true});
    // spawn
    const spawnPoint = map.findObject("Spawn", (obj) => obj.name === "start");

    if (!spawnPoint || spawnPoint.x === undefined || spawnPoint.y === undefined) {
      console.error("Spawn point não encontrado!");
      return;
    }
    // criando jogador
    this.player = new Player(this, spawnPoint.x, spawnPoint.y);

    // colisãodo do jogador com as layers de parede e chão
    this.physics.add.collider(this.player, paredesLayer);
    this.physics.add.collider(this.player, chaoLayer);

    // câmera
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1); // segue o jogador, com suavização
    this.cameras.main.setZoom(4); // zoom de 4x (400%)
    this.cameras.main.fadeIn(1000, 0, 0, 0); // efeito de fade no inicio

    // controles
    this.cursors = this.input.keyboard.createCursorKeys();
  }

  update() {
    // movimentação do jogador
    if (this.player) {
      this.player.update(this.cursors);
    }

    // parallax das nuvens
    /*this.bg1.tilePositionX += this.player.x;
    this.bg2.tilePositionX += this.player.x;
    this.bg3.tilePositionX += this.player.x;
    this.bg4.tilePositionX += this.player.x;
    */
    this.bg1.tilePositionX += 0.05;
    this.bg2.tilePositionX += 0.1;
    this.bg3.tilePositionX += 0.2;
    this.bg4.tilePositionX += 0.3;  
  }
}
