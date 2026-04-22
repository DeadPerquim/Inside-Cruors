// =============================================================
//  gameState.ts — Estado global tipado do jogo
//  Substitui o (window as any).gameState espalhado pelo código.
// =============================================================

export interface GameState {
  nickname  : string;
  playerId  : string;
  character : 'professor' | 'mago' | '';
  roomId    : string;
}

const _state: GameState = {
  nickname  : '',
  playerId  : '',
  character : '',
  roomId    : '',
};

export const gameState = _state;

export function resetGameState() {
  _state.nickname  = '';
  _state.playerId  = '';
  _state.character = '';
  _state.roomId    = '';
}