// =============================================================
//  nick.ts — Tela de nickname com UI em Phaser (sem DOM puro)
// =============================================================
import { Scene } from 'phaser';
import { gameState } from '../gameState';

const SERVER = 'http://localhost:3000';
const MAX_NICK_LEN = 16;

export class NicknameScene extends Scene {
  private inputEl!: HTMLInputElement;
  private feedbackText!: Phaser.GameObjects.Text;
  private connectBtn!: Phaser.GameObjects.Text;
  private isLoading = false;

  constructor() {
    super('Nickname');
  }

  create() {
    const { width, height } = this.scale;

    // Fundo escuro semi-transparente
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);

    // Título
    this.add.text(width / 2, height / 2 - 100, 'Inside-Cruor', {
      fontSize  : '36px',
      color     : '#ffffff',
      fontStyle : 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 - 60, 'Digite seu nickname para entrar', {
      fontSize: '18px',
      color   : '#aaaaaa',
    }).setOrigin(0.5);

    // Input HTML posicionado sobre o canvas
    this.inputEl = this._createInput(width / 2, height / 2);

    // Botão Conectar
    this.connectBtn = this.add.text(width / 2, height / 2 + 60, '[ Conectar ]', {
      fontSize        : '22px',
      color           : '#00ccff',
      backgroundColor : '#001a2e',
      padding         : { x: 20, y: 10 },
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerover',  () => this.connectBtn.setStyle({ color: '#ffffff' }))
      .on('pointerout',   () => this.connectBtn.setStyle({ color: '#00ccff' }))
      .on('pointerdown',  () => this._handleConnect());

    // Feedback de erro/loading
    this.feedbackText = this.add.text(width / 2, height / 2 + 110, '', {
      fontSize: '14px',
      color   : '#ff4444',
    }).setOrigin(0.5);

    // Enter no input também conecta
    this.inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._handleConnect();
    });

    // Limpa o input ao entrar na cena (pode vir de uma volta atrás)
    this.inputEl.value = '';
    this.inputEl.focus();

    // Remove o input ao destruir a cena
    this.events.once('shutdown', () => this.inputEl.remove());
    this.events.once('destroy',  () => this.inputEl.remove());
  }

  private _createInput(cx: number, cy: number): HTMLInputElement {
    const canvas  = this.sys.game.canvas;
    const rect    = canvas.getBoundingClientRect();
    const scaleX  = rect.width  / this.scale.width;
    const scaleY  = rect.height / this.scale.height;

    const el = document.createElement('input');
    el.type        = 'text';
    el.maxLength   = MAX_NICK_LEN;
    el.placeholder = 'Seu nickname…';

    const w = 220;
    const h = 36;
    Object.assign(el.style, {
      position        : 'absolute',
      left            : `${rect.left + (cx - w / 2) * scaleX}px`,
      top             : `${rect.top  + (cy - h / 2) * scaleY}px`,
      width           : `${w * scaleX}px`,
      height          : `${h * scaleY}px`,
      fontSize        : `${16 * scaleY}px`,
      padding         : '0 8px',
      border          : '2px solid #00ccff',
      borderRadius    : '4px',
      background      : '#001a2e',
      color           : '#ffffff',
      outline         : 'none',
      textAlign       : 'center',
      zIndex          : '10',
    });

    document.body.appendChild(el);
    return el;
  }

  private async _handleConnect() {
    if (this.isLoading) return;

    const nickname = this.inputEl.value.trim();
    if (!nickname) {
      this._setFeedback('Por favor, insira um nickname.', '#ff4444');
      return;
    }
    if (nickname.length < 2) {
      this._setFeedback('Nickname muito curto (mín. 2 caracteres).', '#ff4444');
      return;
    }

    this.isLoading = true;
    this.connectBtn.setText('[ Conectando… ]');
    this._setFeedback('', '');

    try {
      const res   = await fetch(`${SERVER}/rooms`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const rooms = await res.json();

      // Persiste o nickname no estado global tipado
      gameState.nickname = nickname;

      this.inputEl.remove();
      this.scene.start('RoomLobby', { rooms });
    } catch (err: any) {
      console.error('[nick] erro ao buscar salas:', err);
      this._setFeedback('Servidor indisponível. Tente novamente.', '#ff4444');
      this.connectBtn.setText('[ Conectar ]');
      this.isLoading = false;
    }
  }

  private _setFeedback(msg: string, color: string) {
    this.feedbackText.setText(msg).setStyle({ color });
  }
}