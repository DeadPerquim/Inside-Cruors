import * as Phaser from 'phaser';

export class Preload extends Phaser.Scene {
    constructor() {
        super("Preload");
    }

    preload() {
        this.load.setPath('assets');

        
        this.load.tilemapTiledJSON('map', 'maps/_Mapas do jogo/Primeira fase.json');

        
        this.load.image('exterior', 'maps/Craftpix-main-character-house-interior-exterior-trees/Tiled_files/exterior.png');
        this.load.image('Castelo-interior', 'maps/Castelo (by FlapJack)/Castelo-interior_v2.png');

        
        this.load.image('clouds1', 'sprites/background-images/Clouds/Clouds 1/1.png');
        this.load.image('clouds2', 'sprites/background-images/Clouds/Clouds 1/2.png');
        this.load.image('clouds3', 'sprites/background-images/Clouds/Clouds 1/3.png');
        this.load.image('clouds4', 'sprites/background-images/Clouds/Clouds 1/4.png');
    
        this.load.spritesheet('aluno', 'sprites/characters/mago.png', { frameWidth: 64, frameHeight: 64 });
        this.load.spritesheet('professor', 'sprites/characters/prof.png', { frameWidth: 16, frameHeight: 16 });
        this.load.spritesheet('rei', 'sprites/characters/rei.png', { frameWidth: 16, frameHeight: 16 });
    }

    create() {
        
        this.scene.start('Inicial');
    }
}