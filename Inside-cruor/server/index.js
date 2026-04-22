// =============================================================
//  Inside-Cruor — Servidor WebSocket + HTTP
//  Node.js + Express + ws
// =============================================================

const express   = require('express');
const http      = require('http');
const WebSocket = require('ws');
const cors      = require('cors');
const crypto    = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss    = new WebSocket.Server({ server });

// ── Estruturas de dados ──────────────────────────────────────
//
//  rooms: Map<roomId, Room>
//  Room = {
//    creatorNick : string,
//    creatorId   : string | null,
//    players     : Map<playerId, PlayerEntry>,
//    professorId : string | null,
//    magoId      : string | null,
//    started     : boolean,
//  }
//
//  PlayerEntry = { nickname, character, ws }
//
//  clients: Map<WebSocket, ClientMeta>
//  ClientMeta = { playerId, nickname, roomId }

const rooms   = new Map();
const clients = new Map();

// ── Helpers ──────────────────────────────────────────────────

/** Gera playerId de 3 dígitos único dentro da sala */
function generatePlayerId(room) {
  let id;
  do {
    id = String(Math.floor(100 + Math.random() * 900));
  } while (room.players.has(id));
  return id;
}

/** Gera código de sala de 6 caracteres alfanuméricos maiúsculos */
function generateRoomId() {
  let id;
  do {
    id = crypto.randomBytes(3).toString('hex').toUpperCase();
  } while (rooms.has(id));
  return id;
}

/** Envia JSON para um WebSocket específico */
function sendTo(ws, type, payload) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, payload }));
  }
}

/** Broadcast para todos os jogadores da sala, opcionalmente excluindo um ws */
function broadcastToRoom(roomId, type, payload, excludeWs = null) {
  const room = rooms.get(roomId);
  if (!room) return;
  const msg = JSON.stringify({ type, payload });
  for (const player of room.players.values()) {
    if (player.ws !== excludeWs && player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(msg);
    }
  }
}

/** Snapshot da sala para enviar como room-state */
function roomSnapshot(roomId, forPlayerId) {
  const room = rooms.get(roomId);
  if (!room) return null;
  return {
    playerId    : forPlayerId,
    professorId : room.professorId,
    magoId      : room.magoId,
    players     : Array.from(room.players.entries()).map(([id, p]) => ({
      id,
      nickname  : p.nickname,
      character : p.character,
    })),
  };
}

// ── Rotas HTTP ───────────────────────────────────────────────

/** Lista todas as salas abertas (não iniciadas e com vaga) */
app.get('/rooms', (_req, res) => {
  const list = [];
  for (const [roomId, room] of rooms.entries()) {
    if (!room.started && room.players.size < 2) {
      list.push({
        roomId,
        creatorNick : room.creatorNick,
        playerCount : room.players.size,
        hasProfessor: !!room.professorId,
        hasMago     : !!room.magoId,
      });
    }
  }
  res.json(list);
});

/** Cria uma sala nova e devolve o roomId */
app.post('/create-room', (req, res) => {
  const { creatorNick } = req.body;
  if (!creatorNick || typeof creatorNick !== 'string' || !creatorNick.trim()) {
    return res.status(400).json({ error: 'creatorNick is required' });
  }
  const roomId = generateRoomId();
  rooms.set(roomId, {
    creatorNick : creatorNick.trim(),
    creatorId   : null,
    players     : new Map(),
    professorId : null,
    magoId      : null,
    started     : false,
  });
  console.log(`[room] criada: ${roomId} por ${creatorNick}`);
  res.json({ roomId });
});

// ── WebSocket ────────────────────────────────────────────────

// Heartbeat: detecta conexões zumbis a cada 30 s
const HEARTBEAT_INTERVAL = 30_000;
wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
});
const heartbeatTimer = setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) { ws.terminate(); continue; }
    ws.isAlive = false;
    ws.ping();
  }
}, HEARTBEAT_INTERVAL);
wss.on('close', () => clearInterval(heartbeatTimer));

// Handlers por tipo de mensagem
const handlers = {};

handlers['join-room'] = function (ws, payload) {
  const { roomId, nickname } = payload ?? {};
  if (!roomId || !nickname) {
    return sendTo(ws, 'error', 'Parâmetros inválidos para join-room');
  }

  const room = rooms.get(roomId);
  if (!room) return sendTo(ws, 'error', 'Sala não encontrada');
  if (room.players.size >= 2) return sendTo(ws, 'error', 'Sala cheia');
  if (room.started) return sendTo(ws, 'error', 'Partida já iniciada');

  // Se este ws já estava em uma sala (reconexão), limpar entrada anterior
  const existingMeta = clients.get(ws);
  if (existingMeta) {
    leaveRoom(ws, existingMeta);
  }

  const playerId = generatePlayerId(room);
  room.players.set(playerId, { nickname: nickname.trim(), character: null, ws });
  if (!room.creatorId) room.creatorId = playerId;
  clients.set(ws, { playerId, nickname: nickname.trim(), roomId });

  console.log(`[join] ${nickname} (${playerId}) entrou em ${roomId}`);

  // Envia estado completo da sala apenas para quem entrou
  sendTo(ws, 'room-state', roomSnapshot(roomId, playerId));

  // Notifica os outros jogadores da sala
  broadcastToRoom(roomId, 'player-joined', { playerId, nickname: nickname.trim() }, ws);
};

handlers['select-character'] = function (ws, payload) {
  const { character } = payload ?? {};
  const meta = clients.get(ws);
  if (!meta) return;

  const room = rooms.get(meta.roomId);
  if (!room) return;

  if (character !== 'professor' && character !== 'mago') {
    return sendTo(ws, 'error', 'Personagem inválido');
  }

  const alreadyTaken =
    (character === 'professor' && room.professorId) ||
    (character === 'mago'      && room.magoId);

  if (alreadyTaken) {
    return sendTo(ws, 'error', 'Personagem já escolhido');
  }

  // Verifica se este jogador já escolheu um personagem antes
  const playerData = room.players.get(meta.playerId);
  if (playerData.character) {
    // Libera o personagem anterior
    if (playerData.character === 'professor') room.professorId = null;
    if (playerData.character === 'mago')      room.magoId      = null;
  }

  if (character === 'professor') room.professorId = meta.playerId;
  else                           room.magoId      = meta.playerId;

  playerData.character = character;

  // Broadcast para TODOS (incluindo o remetente) para atualizar a UI
  broadcastToRoom(meta.roomId, 'character-selected', {
    playerId  : meta.playerId,
    character,
  }, null);

  console.log(`[char] ${meta.nickname} escolheu ${character} em ${meta.roomId}`);

  // Inicia o jogo quando os dois personagens estiverem preenchidos
  if (room.professorId && room.magoId) {
    room.started = true;
    console.log(`[game] partida iniciada na sala ${meta.roomId}`);
    broadcastToRoom(meta.roomId, 'start-game', {
      professorId : room.professorId,
      magoId      : room.magoId,
    }, null);
  }
};

// Mensagens de gameplay — simplesmente re-transmitidas aos demais
const RELAY_TYPES = ['player-move', 'animation-change', 'magic-effect', 'pushable-object'];
for (const type of RELAY_TYPES) {
  handlers[type] = function (ws, payload) {
    const meta = clients.get(ws);
    if (!meta) return;
    // Injeta o playerId no payload para o receptor saber quem enviou
    broadcastToRoom(meta.roomId, type, { ...payload, playerId: meta.playerId }, ws);
  };
}

// Processamento central de mensagens
wss.on('connection', (ws) => {
  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return sendTo(ws, 'error', 'JSON inválido');
    }
    const { type, payload } = msg;
    const handler = handlers[type];
    if (handler) {
      handler(ws, payload);
    } else {
      console.warn(`[ws] tipo desconhecido: ${type}`);
    }
  });

  ws.on('close', () => {
    const meta = clients.get(ws);
    if (meta) leaveRoom(ws, meta);
  });

  ws.on('error', (err) => {
    console.error('[ws] erro:', err.message);
  });
});

/** Remove um jogador da sala e notifica os demais */
function leaveRoom(ws, meta) {
  const { playerId, roomId } = meta;
  const room = rooms.get(roomId);
  if (room) {
    room.players.delete(playerId);
    if (room.professorId === playerId) room.professorId = null;
    if (room.magoId      === playerId) room.magoId      = null;
    // Partida volta a ser não-iniciada se alguém sair
    if (room.started) room.started = false;

    broadcastToRoom(roomId, 'player-left', { playerId }, null);
    console.log(`[leave] ${meta.nickname} (${playerId}) saiu de ${roomId}`);

    if (room.players.size === 0) {
      rooms.delete(roomId);
      console.log(`[room] sala ${roomId} removida (vazia)`);
    }
  }
  clients.delete(ws);
}

// ── Start ────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});