// =============================================================
//  charSelect.ts — Seleção de personagem
//  • Bloqueia o personagem já escolhido por outro jogador
//  • Aguarda confirmação do servidor antes de avançar
//  • Exibe o personagem do outro jogador em tempo real
// =============================================================
import { Scene } from 'phaser';
import { network } from '../network';
import { gameState } from '../gameState';

interface RoomStatePayload {
  playerId    : string;
  professorId : string | null;
  magoId      : string | null;
  players     : { id: string; nickname: string; character: string | null }[];
}

export class CharacterSelect extends Scene {
  private roomState!: RoomStatePayload;
  private professorBtn!: Phaser.GameObjects.Text;
  private magoBtn!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private waitingText!: Phaser.GameObjects.Text;
  private hasChosen = false;

  constructor() {
    super('CharacterSelect');
  }

  init(data: { roomState: RoomStatePayload }) {
    this.roomState = data.roomState;
    this.hasChosen = false;
  }

  create() {
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.75);

    this.add.text(width / 2, 60, 'Escolha seu personagem', {
      fontSize: '28px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Sala
    this.add.text(width / 2, 100, `Sala: ${gameState.roomId}`, {
      fontSize: '14px', color: '#888888',
    }).setOrigin(0.5);

    // Cards dos personagens
    this.professorBtn = this._createCharCard(width / 2 - 140, height / 2, 'professor', 'Professor');
    this.magoBtn      = this._createCharCard(width / 2 + 140, height / 2, 'mago',      'Mago');

    // Aplica estado inicial (personagens já escolhidos)
    this._applyRoomState(this.roomState);

    // Texto de status
    this.statusText = this.add.text(width / 2, height / 2 + 140, '', {
      fontSize: '15px', color: '#ff4444',
    }).setOrigin(0.5);

    // Texto de espera (visível após escolha)
    this.waitingText = this.add.text(width / 2, height / 2 + 170, '', {
      fontSize: '14px', color: '#aaaaaa',
    }).setOrigin(0.5);

    this._setupNetworkEvents();

    // Remove listeners ao sair
    this.events.once('shutdown', () => {
      network.removeAllListeners('character-selected');
      network.removeAllListeners('start-game');
      network.removeAllListeners('player-left');
      network.removeAllListeners('error');
    });
  }

  // ── UI ───────────────────────────────────────────────────

  private _createCharCard(x: number, y: number, charKey: string, label: string) {
    const bg = this.add.rectangle(x, y, 200, 200, 0x003344).setInteractive({ useHandCursor: true });
    const txt = this.add.text(x, y + 70, label, {
      fontSize: '20px', color: '#00ccff', fontStyle: 'bold',
    }).setOrigin(0.5);
    const desc = this.add.text(x, y + 95, '(livre)', {
      fontSize: '12px', color: '#888888',
    }).setOrigin(0.5);

    bg.on('pointerover',  () => { if (!this.hasChosen) bg.setFillStyle(0x005566); });
    bg.on('pointerout',   () => { if (!this.hasChosen) bg.setFillStyle(0x003344); });
    bg.on('pointerdown',  () => this._selectCharacter(charKey));

    // Guarda referências para atualizar
    (bg as any).__desc = desc;
    (bg as any).__txt  = txt;

    return txt;
  }

  private _setCardState(charKey: string, occupantNick: string | null, isMe: boolean) {
    const btn  = charKey === 'professor' ? this.professorBtn : this.magoBtn;
    const bg   = this.children.list.find(
      (c) => c instanceof Phaser.GameObjects.Rectangle &&
             Math.abs(c.x - btn.x) < 10
    ) as Phaser.GameObjects.Rectangle | undefined;
    const desc = bg ? (bg as any).__desc as Phaser.GameObjects.Text : null;

    if (occupantNick) {
      bg?.setFillStyle(isMe ? 0x004400 : 0x440000).disableInteractive();
      btn.setStyle({ color: isMe ? '#00ff88' : '#ff4444' });
      desc?.setText(isMe ? '(você)' : `(${occupantNick})`).setStyle({ color: isMe ? '#00ff88' : '#ff4444' });
    } else {
      bg?.setFillStyle(0x003344).setInteractive({ useHandCursor: true });
      btn.setStyle({ color: '#00ccff' });
      desc?.setText('(livre)').setStyle({ color: '#888888' });
    }
  }

  private _applyRoomState(state: RoomStatePayload) {
    const myId      = gameState.playerId;
    const findNick  = (id: string | null) =>
      state.players.find((p) => p.id === id)?.nickname ?? '?';

    if (state.professorId) {
      this._setCardState('professor', findNick(state.professorId), state.professorId === myId);
    }
    if (state.magoId) {
      this._setCardState('mago', findNick(state.magoId), state.magoId === myId);
    }
  }

  // ── Lógica ───────────────────────────────────────────────

  private _selectCharacter(char: string) {
    if (this.hasChosen) return;

    gameState.character = char as 'professor' | 'mago';
    this.hasChosen = true;

    network.send('select-character', { character: char });
    this.waitingText.setText('Aguardando o outro jogador…');
  }

  private _setupNetworkEvents() {
    network.on('character-selected', (data: { playerId: string; character: string }) => {
      // Atualiza estado local da sala
      if (data.character === 'professor') this.roomState.professorId = data.playerId;
      if (data.character === 'mago')      this.roomState.magoId      = data.playerId;

      // Atualiza o character no array de players para que Inicial receba correto
      const player = this.roomState.players.find((p) => p.id === data.playerId);
      if (player) player.character = data.character;

      const nick = player?.nickname ?? '?';
      this._setCardState(data.character, nick, data.playerId === gameState.playerId);
    });

    network.on('start-game', () => {
      // Passa o estado completo da sala para o Inicial instanciar o jogador remoto
      this.scene.start('Inicial', { roomState: this.roomState });
    });

    network.on('player-left', (data: { playerId: string }) => {
      // Remove o personagem do jogador que saiu
      if (this.roomState.professorId === data.playerId) {
        this.roomState.professorId = null;
        this._setCardState('professor', null, false);
      }
      if (this.roomState.magoId === data.playerId) {
        this.roomState.magoId = null;
        this._setCardState('mago', null, false);
      }
      this.waitingText.setText('O outro jogador saiu da sala.');
      this.hasChosen = false;
    });

    network.on('error', (msg: string) => {
      this.statusText.setText(msg);
      this.hasChosen = false;
      this.waitingText.setText('');
      gameState.character = '';
    });
  }
}