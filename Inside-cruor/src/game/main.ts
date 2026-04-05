import { AUTO, Game, Scale, Types } from "phaser";
import { Boot } from "./scenes/boot";
import { Preload } from "./scenes/preload";
import { Inicial } from "./scenes/inicial";

const config: Types.Core.GameConfig = {
    type: AUTO,
    width: 1024,
    height: 768,
    parent: 'game-container',
    scene: [Boot, Preload, Inicial],
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { x: 0, y: 0 },
            debug: true,
        }
    },
    scale: {
        mode: Scale.FIT,
        width: 1024,
        height: 768,
        autoCenter: Scale.CENTER_BOTH
    }
};

const StartGame = (parent: string) => {
    return new Game({ ...config, parent });
}

export default StartGame;