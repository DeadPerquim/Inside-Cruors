// =============================================================
//  roomLobby.ts — Lobby de salas com UI Phaser
//  Suporta: listar salas, criar sala, entrar por código,
//  polling de atualização e feedback visual.
// =============================================================
import { Scene } from 'phaser';
import { network } from '../network';
import { gameState } from '../gameState';

const SERVER       = 'http://localhost:3000';
const POLL_INTERVAL = 5000; // ms entre atualizações da lista

interface RoomInfo {
  roomId      : string;
  creatorNick : string;
  playerCount : number;
  hasProfessor: boolean;
  hasMago     : boolean;
}

export class RoomLobby extends Scene {
  private rooms: RoomInfo[] = [];
  private roomListContainer!: Phaser.GameObjects.Container;
  private statusText!: Phaser.GameObjects.Text;
  private codeInput!: HTMLInputElement;
  private pollTimer!: Phaser.Time.TimerEvent;
  private isJoining = false;

  constructor() {
    super('RoomLobby');
  }

  init(data: { rooms: RoomInfo[] }) {
    this.rooms = data.rooms ?? [];
  }

  create() {
    const { width, height } = this.scale;

    // Fundo
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.75);

    // Título
    this.add.text(width / 2, 36, 'Salas Disponíveis', {
      fontSize: '28px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Área de lista (scrollável por container)
    this.roomListContainer = this.add.container(0, 0);
    this._renderRoomList();

    // Separador
    this.add.line(width / 2, height - 140, 0, 0, width - 80, 0, 0x444444).setOrigin(0.5);

    // Input de código de sala
    this.codeInput = this._createCodeInput(width / 2 - 70, height - 110);

    // Botão Entrar por código
    this.add.text(width / 2 + 90, height - 110, '[ Entrar ]', {
      fontSize: '16px', color: '#00ccff',
      backgroundColor: '#001a2e', padding: { x: 12, y: 8 },
    })
      .setOrigin(0, 0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this._joinByCode());

    // Botão Criar Sala
    this.add.text(width / 2, height - 60, '[ + Criar Nova Sala ]', {
      fontSize: '20px', color: '#ffdd00',
      backgroundColor: '#1a1400', padding: { x: 16, y: 10 },
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this._createRoom());

    // Texto de status/erro
    this.statusText = this.add.text(width / 2, height - 20, '', {
      fontSize: '13px', color: '#ff4444',
    }).setOrigin(0.5);

    // Polling automático de salas
    this.pollTimer = this.time.addEvent({
      delay   : POLL_INTERVAL,
      loop    : true,
      callback: this._fetchRooms,
      callbackScope: this,
    });

    // Limpeza ao sair da cena
    this.events.once('shutdown', () => {
      this.pollTimer?.remove();
      this.codeInput?.remove();
      network.removeAllListeners('room-state');
      network.removeAllListeners('error');
    });
  }

  // ── Lista de salas ───────────────────────────────────────

  private _renderRoomList() {
    this.roomListContainer.removeAll(true);
    const { width } = this.scale;
    const startY = 80;

    if (this.rooms.length === 0) {
      const t = this.add.text(width / 2, startY + 20, 'Nenhuma sala disponível.', {
        fontSize: '16px', color: '#888888',
      }).setOrigin(0.5);
      this.roomListContainer.add(t);
      return;
    }

    this.rooms.forEach((room, i) => {
      const y        = startY + i * 44;
      const chars    = [room.hasProfessor ? '✓Professor' : '—Professor',
                        room.hasMago      ? '✓Mago'     : '—Mago'].join('  ');
      const label    = `${room.roomId}  •  ${room.creatorNick}  (${room.playerCount}/2)  ${chars}`;
      const isFull   = room.playerCount >= 2;

      const bg = this.add.rectangle(width / 2, y + 18, width - 80, 36,
        isFull ? 0x222222 : 0x003344, isFull ? 0.4 : 0.8).setOrigin(0.5);

      const txt = this.add.text(width / 2, y + 18, label, {
        fontSize: '15px',
        color   : isFull ? '#555555' : '#00ccff',
      }).setOrigin(0.5);

      if (!isFull) {
        bg.setInteractive({ useHandCursor: true })
          .on('pointerover',  () => bg.setFillStyle(0x005566))
          .on('pointerout',   () => bg.setFillStyle(0x003344))
          .on('pointerdown',  () => this._joinRoom(room.roomId));
      }

      this.roomListContainer.add([bg, txt]);
    });
  }

  private async _fetchRooms() {
    try {
      const res  = await fetch(`${SERVER}/rooms`);
      if (!res.ok) return;
      this.rooms = await res.json();
      this._renderRoomList();
    } catch {
      // silencioso — não interrompe o jogador
    }
  }

  // ── Ações ────────────────────────────────────────────────

  private async _createRoom() {
    if (this.isJoining) return;
    this._setStatus('Criando sala…', '#aaaaaa');
    try {
      const res = await fetch(`${SERVER}/create-room`, {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ creatorNick: gameState.nickname }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { roomId } = await res.json();
      this._joinRoom(roomId);
    } catch (err: any) {
      console.error('[lobby] erro ao criar sala:', err);
      this._setStatus('Erro ao criar sala. Tente novamente.', '#ff4444');
    }
  }

  private _joinByCode() {
    const code = this.codeInput.value.trim().toUpperCase();
    if (!code) {
      this._setStatus('Digite um código de sala.', '#ff4444');
      return;
    }
    this._joinRoom(code);
  }

  private async _joinRoom(roomId: string) {
    if (this.isJoining) return;
    this.isJoining = true;
    this._setStatus('Conectando…', '#aaaaaa');

    try {
      // Conecta o WebSocket (idempotente se já estiver aberto)
      if (!network.isConnected) {
        await network.connect('ws://localhost:3000');
      }

      // Aguarda confirmação da sala antes de avançar
      const unsub = network.on('room-state', (payload) => {
        unsub();
        gameState.playerId = payload.playerId;
        gameState.roomId   = roomId;
        this.codeInput?.remove();
        this.scene.start('CharacterSelect', { roomState: payload });
      });

      // Trata erros do servidor
      const unsubErr = network.on('error', (msg: string) => {
        unsubErr();
        this._setStatus(`Erro: ${msg}`, '#ff4444');
        this.isJoining = false;
      });

      network.send('join-room', { roomId, nickname: gameState.nickname });

    } catch (err: any) {
      console.error('[lobby] erro ao entrar na sala:', err);
      this._setStatus('Não foi possível conectar ao servidor.', '#ff4444');
      this.isJoining = false;
    }
  }

  // ── Helpers ──────────────────────────────────────────────

  private _createCodeInput(cx: number, cy: number): HTMLInputElement {
    const canvas = this.sys.game.canvas;
    const rect   = canvas.getBoundingClientRect();
    const scaleX = rect.width  / this.scale.width;
    const scaleY = rect.height / this.scale.height;

    const el = document.createElement('input');
    el.type        = 'text';
    el.maxLength   = 6;
    el.placeholder = 'Código…';

    const w = 130, h = 32;
    Object.assign(el.style, {
      position    : 'absolute',
      left        : `${rect.left + (cx - w / 2) * scaleX}px`,
      top         : `${rect.top  + (cy - h / 2) * scaleY}px`,
      width       : `${w * scaleX}px`,
      height      : `${h * scaleY}px`,
      fontSize    : `${14 * scaleY}px`,
      padding     : '0 8px',
      border      : '2px solid #444',
      borderRadius: '4px',
      background  : '#111',
      color       : '#fff',
      outline     : 'none',
      textAlign   : 'center',
      textTransform: 'uppercase',
      zIndex      : '10',
    });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._joinByCode();
    });
    document.body.appendChild(el);
    return el;
  }

  private _setStatus(msg: string, color: string) {
    this.statusText?.setText(msg).setStyle({ color });
  }
}