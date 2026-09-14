require('dotenv').config();
const http = require('http');
const express = require('express');
const session = require('express-session');
const pgSessionFactory = require('connect-pg-simple');
const cors = require('cors');
const WebSocket = require('ws');

const { pool, initDb } = require('./db');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const messageRoutes = require('./routes/messages');
const conversationRoutes = require('./routes/conversations');
const callRoutes = require('./routes/call');
const { verify: verifyCallToken } = require('./utils/callToken');

const PgSession = pgSessionFactory(session);
const app = express();

app.set('trust proxy', 1);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '6mb' })); // les messages vocaux passent en base64 dans le JSON
app.use(express.static('public'));

app.use(session({
  store: new PgSession({ pool, tableName: 'session', createTableIfMissing: true }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 jours
  }
}));

app.use('/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/call', callRoutes);

app.get('/health', (req, res) => res.json({ ok: true }));

const server = http.createServer(app);

// --- Serveur d'appels (signalisation WebRTC) ---
const wss = new WebSocket.Server({ server, path: '/ws' });
const onlineUsers = new Map(); // userId -> connexion WebSocket

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, 'http://localhost');
  const token = url.searchParams.get('token');
  const userId = verifyCallToken(token);
  if (!userId) { ws.close(); return; }

  ws.userId = userId;
  onlineUsers.set(userId, ws);

  ws.on('message', async (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch (e) { return; }
    if (!msg || !msg.to) return;

    // On ne relaie une invitation d'appel que si une conversation acceptée existe déjà
    if (msg.type === 'call-invite') {
      const [a, b] = userId < msg.to ? [userId, msg.to] : [msg.to, userId];
      const { rows } = await pool.query(
        "SELECT id FROM conversations WHERE user_a_id = $1 AND user_b_id = $2 AND status = 'accepted'",
        [a, b]
      );
      if (rows.length === 0) return;
    }

    const target = onlineUsers.get(msg.to);
    if (!target || target.readyState !== WebSocket.OPEN) {
      if (msg.type === 'call-invite') {
        ws.send(JSON.stringify({ type: 'call-unavailable', from: msg.to }));
      }
      return;
    }
    target.send(JSON.stringify(Object.assign({}, msg, { from: userId })));
  });

  ws.on('close', () => {
    if (onlineUsers.get(userId) === ws) onlineUsers.delete(userId);
  });
});

const port = process.env.PORT || 3000;

initDb()
  .then(() => {
    server.listen(port, () => console.log(`Serveur Clipline lancé sur le port ${port}`));
  })
  .catch((err) => {
    console.error("Impossible d'initialiser la base de données :", err);
    process.exit(1);
  });
