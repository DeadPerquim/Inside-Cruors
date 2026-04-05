import { Scene } from "phaser";

export class Inicial extends Scene {
    private bg1!: Phaser.GameObjects.TileSprite;
    private bg2!: Phaser.GameObjects.TileSprite;
    private bg3!: Phaser.GameObjects.TileSprite;
    private bg4!: Phaser.GameObjects.TileSprite;

    private player!: Phaser.Physics.Arcade.Sprite;
    private playerX!: number;
    private playerY!: number;

    constructor() {
        super("Inicial");
    }

    create() {
        // criando o mapa
        const map = this.make.tilemap({ key: 'map' });
        // definindo a altura e largura do mapa
        const { width, height } = this.scale;

        // background (nuvens) do mapa
        this.bg1 = this.add.tileSprite(0, 0, width, height, 'clouds1').setOrigin(0, 0).setScrollFactor(0);
        this.bg2 = this.add.tileSprite(0, 0, width, height, 'clouds2').setOrigin(0, 0).setScrollFactor(0);
        this.bg3 = this.add.tileSprite(0, 0, width, height, 'clouds3').setOrigin(0, 0).setScrollFactor(0);
        this.bg4 = this.add.tileSprite(0, 0, width, height, 'clouds4').setOrigin(0, 0).setScrollFactor(0);

        // tilesets usados pelo mapa
        const exteriorTiles = map.addTilesetImage('exterior', 'exterior');
        const casteloTiles = map.addTilesetImage('Castelo-interior', 'Castelo-interior');

        if (exteriorTiles && casteloTiles) {
            const allTilesets = [exteriorTiles, casteloTiles];

            map.createLayer('Chão/Base', allTilesets);
            map.createLayer('Paredes', allTilesets);
            map.createLayer('Decoração', allTilesets);
            map.createLayer('Objetos', allTilesets);
            map.createLayer('BackgroundObjects', allTilesets);
            map.createLayer('Foreground', allTilesets);
        } else {
            console.error("Erro ao carregar tilesets");
        }

        // spawn do player
        const spawnPoint = map.findObject("Spawn", obj => obj.name === "start");




        




        if (spawnPoint && typeof spawnPoint.x === 'number' && typeof spawnPoint.y === 'number') {

            this.playerX = spawnPoint.x;
            this.playerY = spawnPoint.y;

            console.log(`Spawn point encontrado em: (${this.playerX}, ${this.playerY})`);

            console.log(spawnPoint);
            // criando o player na posição de spawn
            this.player = this.physics.add.sprite(this.playerX, this.playerY, 'aluno', 0).setScale(0.3);
            this.player.setCollideWorldBounds(true);
            this.player.setOrigin(0.5, 1); 
            this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
            // dando zoom e fadeIn
            this.cameras.main.setZoom(8);
            this.cameras.main.fadeIn(2000, 0, 0, 0);

        } else {
            console.error("Spawn point não encontrado!");
        }
    }

    update() {
        // parallax
        this.bg1.tilePositionX += 0.05;
        this.bg2.tilePositionX += 0.1;
        this.bg3.tilePositionX += 0.2;
        this.bg4.tilePositionX += 0.3;
    }
}