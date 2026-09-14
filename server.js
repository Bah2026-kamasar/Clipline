require('dotenv').config();
const express = require('express');
const session = require('express-session');
const pgSessionFactory = require('connect-pg-simple');
const cors = require('cors');

const { pool, initDb } = require('./db');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const messageRoutes = require('./routes/messages');

const PgSession = pgSessionFactory(session);
const app = express();
app.set('trust proxy', 1);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
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

app.get('/health', (req, res) => res.json({ ok: true }));

const port = process.env.PORT || 3000;

initDb()
  .then(() => {
    app.listen(port, () => console.log(`Serveur Clipline lancé sur le port ${port}`));
  })
  .catch((err) => {
    console.error("Impossible d'initialiser la base de données :", err);
    process.exit(1);
  });
