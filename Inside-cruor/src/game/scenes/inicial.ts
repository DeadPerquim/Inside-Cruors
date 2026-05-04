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

    // layers (Atenção para manter os acentos exatamente como no Tiled)
    const chaoLayer = map.createLayer("Chão/Base", allTilesets);
    const decoracaoLayer = map.createLayer("Decoração", allTilesets);
    const objetosLayer = map.createLayer("Objetos", allTilesets);
    const paredesLayer = map.createLayer("Paredes", allTilesets);
    const paredesParaCompletarLayer = map.createLayer("ParedesParaCompletar", allTilesets);
    const bgObjectsLayer = map.createLayer("BackgroundObjects", allTilesets);
    const foregroundLayer = map.createLayer("Foreground", allTilesets);
    const foregroundSoquemaispracimaLayer = map.createLayer("ForegroundSoquemaispracima", allTilesets);

    // Se o nome estiver errado, o código para aqui (por isso só aparecia nuvem)
    if (!chaoLayer || !paredesLayer) {
      console.error("Layers não carregaram! Verifique os acentos.");
      return;
    }

    // ordem de profundidade (Z-INDEX)
    chaoLayer.setDepth(0);
    decoracaoLayer?.setDepth(1);
    objetosLayer?.setDepth(2);
    bgObjectsLayer?.setDepth(2);
    paredesLayer.setDepth(2);
    paredesParaCompletarLayer?.setDepth(2);
    foregroundLayer?.setDepth(4); 
    foregroundSoquemaispracimaLayer?.setDepth(5); 

    // colisões por propriedade
    chaoLayer.setCollisionByProperty({ colisao: true });
    decoracaoLayer?.setCollisionByProperty({ colisao: true });
    objetosLayer?.setCollisionByProperty({ colisao: true });
    bgObjectsLayer?.setCollisionByProperty({ colisao: true });
    paredesLayer.setCollisionByProperty({ colisao: true });
    paredesParaCompletarLayer?.setCollisionByProperty({ colisao: true }); 
    foregroundSoquemaispracimaLayer?.setCollisionByProperty({ colisao: true });

    // spawn do jogador
    const spawnPoint = map.findObject("Spawn", (obj) => obj.name === "start");

    if (!spawnPoint || spawnPoint.x === undefined || spawnPoint.y === undefined) {
      console.error("Spawn point não encontrado!");
      return;
    }
    
    this.player = new Player(this, spawnPoint.x, spawnPoint.y);

    // colisões do jogador (Ajustado com os IFs para o TypeScript não chorar)
    this.physics.add.collider(this.player, chaoLayer);
    this.physics.add.collider(this.player, paredesLayer);
    
    if (paredesParaCompletarLayer) {
      this.physics.add.collider(this.player, paredesParaCompletarLayer);
    }
    if (objetosLayer) {
      this.physics.add.collider(this.player, objetosLayer);
    }
    if (bgObjectsLayer) {
      this.physics.add.collider(this.player, bgObjectsLayer);
    }
    if (foregroundSoquemaispracimaLayer) {
      this.physics.add.collider(this.player, foregroundSoquemaispracimaLayer);
    }

    // --- CÂMERA E CONTROLES (Os trechos que haviam sido apagados) ---
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1); 
    this.cameras.main.setZoom(4); 
    this.cameras.main.fadeIn(1000, 0, 0, 0); 
    
    this.cursors = this.input.keyboard!.createCursorKeys();
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
