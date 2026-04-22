// =============================================================
//  main.ts (game) — Configuração e inicialização do Phaser
// =============================================================
import { AUTO, Game, Scale, Types } from 'phaser';
import { Boot }            from './scenes/boot';
import { Preload }         from './scenes/preload';
import { NicknameScene }   from './scenes/nick';
import { RoomLobby }       from './scenes/roomLobby';
import { CharacterSelect } from './scenes/charSelect';
import { Inicial }         from './scenes/inicial';

const config: Types.Core.GameConfig = {
  type  : AUTO,
  parent: 'game-container',
  scene : [Boot, Preload, NicknameScene, RoomLobby, CharacterSelect, Inicial],
  physics: {
    default: 'arcade',
    arcade : {
      gravity: { x: 0, y: 0 },
      debug  : false,          // mude para true durante desenvolvimento
    },
  },
  scale: {
    mode      : Scale.FIT,
    width     : 1024,
    height    : 768,
    autoCenter: Scale.CENTER_BOTH,
  },
  backgroundColor: '#1a1a2e',
};

export default function StartGame(parent: string): Game {
  return new Game({ ...config, parent });
}