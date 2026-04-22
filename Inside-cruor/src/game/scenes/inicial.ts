// =============================================================
//  inicial.ts — Cena principal de jogo
//  • RemotePlayer com lerp
//  • Objetos empurráveis (pushable-object)
//  • Efeito de magia sincronizado
//  • Throttle de envio com delta de posição
//  • Cleanup de listeners ao encerrar a cena
// =============================================================
import { Scene } from 'phaser';
import { Player } from '../player';
import { RemotePlayer } from '../remotePlayer';
import { network } from '../network';
import { gameState } from '../gameState';

// Intervalo mínimo entre envios de posição (ms)
const MOVE_THROTTLE   = 50;
// Delta mínimo de pixels para enviar uma atualização de posição
const MOVE_THRESHOLD  = 1.5;

interface RoomPlayer {
  id        : string;
  nickname  : string;
  character : string | null;
}

export class Inicial extends Scene {
  private bg1!: Phaser.GameObjects.TileSprite;
  private bg2!: Phaser.GameObjects.TileSprite;
  private bg3!: Phaser.GameObjects.TileSprite;
  private bg4!: Phaser.GameObjects.TileSprite;

  private player!: Player;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private remotePlayers: Map<string, RemotePlayer> = new Map();

  // Jogadores já presentes na sala ao entrar na cena
  private existingPlayers: RoomPlayer[] = [];

  // Objetos empurráveis: name (Tiled) → Sprite
  private pushableObjects: Map<string, Phaser.GameObjects.Sprite> = new Map();

  private lastSentTime = 0;
  private lastSentX    = -9999;
  private lastSentY    = -9999;
  private lastSentAnim = '';

  constructor() {
    super('Inicial');
  }

  init(data: { roomState?: { players: RoomPlayer[] } }) {
    // Guarda a lista de jogadores já na sala para instanciar no create()
    this.existingPlayers = data?.roomState?.players ?? [];
  }

  // ── Create ───────────────────────────────────────────────

  create() {
    if (!gameState.character) {
      console.error('[inicial] personagem não definido, voltando à seleção');
      this.scene.start('CharacterSelect');
      return;
    }

    const map         = this.make.tilemap({ key: 'map' });
    const { width, height } = this.scale;

    // Parallax backgrounds (scroll factor 0 = fixo na câmera)
    this.bg1 = this.add.tileSprite(0, 0, width, height, 'clouds1').setOrigin(0).setScrollFactor(0).setDepth(-10);
    this.bg2 = this.add.tileSprite(0, 0, width, height, 'clouds2').setOrigin(0).setScrollFactor(0).setDepth(-9);
    this.bg3 = this.add.tileSprite(0, 0, width, height, 'clouds3').setOrigin(0).setScrollFactor(0).setDepth(-8);
    this.bg4 = this.add.tileSprite(0, 0, width, height, 'clouds4').setOrigin(0).setScrollFactor(0).setDepth(-7);

    // Tilesets
    const exteriorTiles = map.addTilesetImage('exterior',          'exterior');
    const casteloTiles  = map.addTilesetImage('Castelo-interior',  'Castelo-interior');
    if (!exteriorTiles || !casteloTiles) {
      console.error('[inicial] tilesets não carregaram');
      return;
    }
    const ts = [exteriorTiles, casteloTiles];

    // Layers
    const chaoLayer        = map.createLayer('Chão/Base',         ts)?.setDepth(0);
    const paredesLayer     = map.createLayer('Paredes',           ts)?.setDepth(1);
    const decoracaoLayer   = map.createLayer('Decoração',         ts)?.setDepth(2);
    const objetosLayer     = map.createLayer('Objetos',           ts)?.setDepth(3);
    const bgObjectsLayer   = map.createLayer('BackgroundObjects', ts)?.setDepth(4);
    const foregroundLayer  = map.createLayer('Foreground',        ts)?.setDepth(1000);

    if (!chaoLayer || !paredesLayer) {
      console.error('[inicial] layers essenciais não carregaram');
      return;
    }

    // Colisões
    for (const layer of [paredesLayer, chaoLayer, decoracaoLayer, objetosLayer, foregroundLayer, bgObjectsLayer]) {
      layer?.setCollisionByProperty({ colisao: true });
    }

    // Spawn
    const spawn = map.findObject('Spawn', (obj) => obj.name === 'start');
    if (!spawn || spawn.x === undefined || spawn.y === undefined) {
      console.error('[inicial] spawn point não encontrado');
      return;
    }

    // Player local
    this.player = new Player(
      this, spawn.x, spawn.y,
      gameState.character,
      gameState.nickname,
    );
    this.physics.add.collider(this.player, paredesLayer);
    this.physics.add.collider(this.player, chaoLayer);
    if (decoracaoLayer) this.physics.add.collider(this.player, decoracaoLayer);
    if (objetosLayer)   this.physics.add.collider(this.player, objetosLayer);

    // Objetos empurráveis definidos no Tiled na layer "Pushable"
    const pushableLayer = map.getObjectLayer('Pushable');
    if (pushableLayer) {
      for (const obj of pushableLayer.objects) {
        if (!obj.name || obj.x === undefined || obj.y === undefined) continue;
        const sprite = this.physics.add.sprite(obj.x, obj.y, 'exterior')
          .setName(obj.name)
          .setDepth(3)
          .setImmovable(false);
        (sprite.body as Phaser.Physics.Arcade.Body).setDrag(300, 300);
        this.physics.add.collider(this.player, sprite, () => {
          this._onPushObject(sprite);
        });
        this.pushableObjects.set(obj.name, sprite);
      }
    }

    // Câmera
    this.cameras.main
      .startFollow(this.player, true, 0.1, 0.1)
      .setZoom(4)
      .fadeIn(1000, 0, 0, 0);

    this.cursors = this.input.keyboard!.createCursorKeys();

    // ── Instancia jogadores que já estavam na sala ───────────
    for (const p of this.existingPlayers) {
      if (p.id === gameState.playerId) continue;
      if (!this.remotePlayers.has(p.id)) {
        this._addRemotePlayer(p.id, p.nickname, p.character ?? 'mago');
      }
    }

    this._setupNetworkEvents();

    // Cleanup ao encerrar cena
    this.events.once('shutdown', () => {
      network.removeAllListeners('player-joined');
      network.removeAllListeners('player-left');
      network.removeAllListeners('player-move');
      network.removeAllListeners('animation-change');
      network.removeAllListeners('magic-effect');
      network.removeAllListeners('pushable-object');
    });
  }

  // ── Update ───────────────────────────────────────────────

  update(time: number, _delta: number) {
    if (!this.player) return;

    this.player.update(this.cursors);

    // Interpola remotos
    for (const remote of this.remotePlayers.values()) {
      remote.interpolate();
    }

    // Throttle + delta de posição para envio de posição
    const dx = Math.abs(this.player.x - this.lastSentX);
    const dy = Math.abs(this.player.y - this.lastSentY);
    if (time - this.lastSentTime > MOVE_THROTTLE && (dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD)) {
      network.send('player-move', {
        x: Math.round(this.player.x * 10) / 10,
        y: Math.round(this.player.y * 10) / 10,
      });
      this.lastSentX    = this.player.x;
      this.lastSentY    = this.player.y;
      this.lastSentTime = time;
    }

    // Animação — só envia quando muda
    const anim = this.player.currentAnimKey;
    if (anim && anim !== this.lastSentAnim) {
      network.send('animation-change', { animKey: anim });
      this.lastSentAnim = anim;
    }

    // Parallax
    this.bg1.tilePositionX += 0.05;
    this.bg2.tilePositionX += 0.10;
    this.bg3.tilePositionX += 0.20;
    this.bg4.tilePositionX += 0.30;
  }

  // ── Rede ─────────────────────────────────────────────────

  private _setupNetworkEvents() {
    network.on('player-joined', (data: { playerId: string; nickname: string; character?: string }) => {
      if (data.playerId === gameState.playerId) return;
      if (!this.remotePlayers.has(data.playerId)) {
        this._addRemotePlayer(data.playerId, data.nickname, data.character ?? 'mago');
      }
    });

    network.on('player-left', (data: { playerId: string }) => {
      const remote = this.remotePlayers.get(data.playerId);
      if (remote) {
        remote.destroy();
        this.remotePlayers.delete(data.playerId);
      }
    });

    network.on('player-move', (data: { playerId: string; x: number; y: number }) => {
      this.remotePlayers.get(data.playerId)?.moveTo(data.x, data.y);
    });

    network.on('animation-change', (data: { playerId: string; animKey: string }) => {
      this.remotePlayers.get(data.playerId)?.playAnim(data.animKey);
    });

    network.on('magic-effect', (data: { playerId: string; x: number; y: number; effectType?: string; duration?: number }) => {
      this._spawnMagicEffect(data.x, data.y, data.duration ?? 1000);
    });

    network.on('pushable-object', (data: { playerId: string; objectId: string; x: number; y: number }) => {
      const obj = this.pushableObjects.get(data.objectId);
      if (obj) obj.setPosition(data.x, data.y);
    });
  }

  private _addRemotePlayer(id: string, nickname: string, character: string) {
    // Usa posição do spawn temporariamente — vai convergir pelo lerp
    const spawn = { x: this.player?.x ?? 0, y: this.player?.y ?? 0 };
    const remote = new RemotePlayer(this, spawn.x, spawn.y, character, nickname);
    this.remotePlayers.set(id, remote);
  }

  // ── Objetos empurráveis ──────────────────────────────────

  private _lastPushSent = 0;
  private _onPushObject(sprite: Phaser.GameObjects.Sprite) {
    const now = Date.now();
    if (now - this._lastPushSent < 100) return; // throttle de 100ms
    this._lastPushSent = now;
    network.send('pushable-object', {
      objectId: sprite.name,
      x       : Math.round(sprite.x * 10) / 10,
      y       : Math.round(sprite.y * 10) / 10,
    });
  }

  // ── Efeitos de magia ─────────────────────────────────────

  /**
   * Dispara um efeito de magia LOCAL e envia ao servidor.
   * Chame este método a partir de um input (ex.: tecla Z).
   */
  fireMagicEffect(effectType = 'spark') {
    const x = this.player.x;
    const y = this.player.y;
    this._spawnMagicEffect(x, y, 1000);
    network.send('magic-effect', { x, y, effectType, duration: 1000 });
  }

  private _spawnMagicEffect(x: number, y: number, duration: number) {
    if (!this.textures.exists('magicParticle')) return;
    const emitter = this.add.particles(x, y, 'magicParticle', {
      speed     : { min: 40, max: 120 },
      lifespan  : 600,
      scale     : { start: 0.6, end: 0 },
      quantity  : 12,
      blendMode : Phaser.BlendModes.ADD,
    });
    emitter.setDepth(10);
    this.time.delayedCall(duration, () => emitter.destroy());
  }
}