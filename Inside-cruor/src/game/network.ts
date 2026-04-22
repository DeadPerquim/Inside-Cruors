// =============================================================
//  network.ts — Gerenciador de conexão WebSocket
//  Suporta: múltiplos listeners por tipo, fila de envio,
//  reconexão automática e heartbeat via pong.
// =============================================================

type Handler = (payload: any) => void;

export class NetworkManager {
  private ws: WebSocket | null = null;
  private handlers: Map<string, Handler[]> = new Map();
  private sendQueue: string[] = [];          // mensagens aguardando conexão
  private serverUrl: string = '';
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 2000;             // ms entre tentativas
  private maxReconnectDelay = 30_000;
  private intentionalClose = false;

  // ── Conexão ─────────────────────────────────────────────

  connect(url: string): Promise<void> {
    this.serverUrl     = url;
    this.intentionalClose = false;
    return this._open();
  }

  private _open(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      this.ws = new WebSocket(this.serverUrl);

      this.ws.onopen = () => {
        console.log('[network] conectado a', this.serverUrl);
        this.reconnectDelay = 2000;           // reseta back-off
        this._flushQueue();
        resolve();
      };

      this.ws.onerror = (err) => {
        console.error('[network] erro de WebSocket', err);
        reject(err);
      };

      this.ws.onclose = () => {
        console.warn('[network] conexão encerrada');
        this._emit('disconnected', null);
        if (!this.intentionalClose) this._scheduleReconnect();
      };

      this.ws.onmessage = (event: MessageEvent) => {
        let msg: { type: string; payload: any };
        try {
          msg = JSON.parse(event.data as string);
        } catch {
          console.error('[network] JSON inválido recebido:', event.data);
          return;
        }
        this._emit(msg.type, msg.payload);
      };
    });
  }

  private _scheduleReconnect() {
    if (this.reconnectTimer) return;
    console.log(`[network] reconectando em ${this.reconnectDelay}ms…`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this._open().catch(() => {
        // aumenta delay com back-off exponencial
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
      });
    }, this.reconnectDelay);
  }

  disconnect() {
    this.intentionalClose = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
  }

  // ── Envio ────────────────────────────────────────────────

  send(type: string, payload: any = null) {
    const msg = JSON.stringify({ type, payload });
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(msg);
    } else {
      // Encfileira para enviar quando a conexão estiver disponível
      this.sendQueue.push(msg);
    }
  }

  private _flushQueue() {
    while (this.sendQueue.length > 0) {
      const msg = this.sendQueue.shift()!;
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(msg);
      }
    }
  }

  // ── Listeners ────────────────────────────────────────────

  /**
   * Registra um handler para um tipo de mensagem.
   * Múltiplos handlers para o mesmo tipo são suportados.
   * Retorna função de remoção (unsubscribe).
   */
  on(type: string, handler: Handler): () => void {
    if (!this.handlers.has(type)) this.handlers.set(type, []);
    this.handlers.get(type)!.push(handler);
    return () => this.off(type, handler);
  }

  /** Remove um handler específico */
  off(type: string, handler: Handler) {
    const list = this.handlers.get(type);
    if (!list) return;
    const idx = list.indexOf(handler);
    if (idx !== -1) list.splice(idx, 1);
  }

  /** Remove todos os handlers de um tipo (útil ao trocar de cena) */
  removeAllListeners(type?: string) {
    if (type) {
      this.handlers.delete(type);
    } else {
      this.handlers.clear();
    }
  }

  private _emit(type: string, payload: any) {
    const list = this.handlers.get(type);
    if (list) {
      for (const h of [...list]) h(payload);
    }
  }

  // ── Estado ───────────────────────────────────────────────

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const network = new NetworkManager();