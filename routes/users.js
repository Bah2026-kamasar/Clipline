const express = require('express');
const { pool } = require('../db');

const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'not_logged_in' });
  next();
}

// Qui suis-je ?
router.get('/me', requireAuth, async (req, res) => {
  const { rows } = await pool.query('SELECT id, pseudo, avatar_url, niche, bio FROM users WHERE id = $1', [req.session.userId]);
  res.json(rows[0] || null);
});

// Modifier sa niche / bio
router.put('/me', requireAuth, async (req, res) => {
  const { niche, bio } = req.body;
  await pool.query('UPDATE users SET niche = $1, bio = $2 WHERE id = $3', [niche, bio, req.session.userId]);
  res.json({ ok: true });
});

// Recherche par pseudo TikTok (utilisé par la barre de recherche du site)
router.get('/search', requireAuth, async (req, res) => {
  const q = (req.query.q || '').trim();
  const { rows } = await pool.query(
    `SELECT id, pseudo, avatar_url, niche, bio FROM users
     WHERE pseudo ILIKE $1 AND id != $2
     ORDER BY pseudo LIMIT 30`,
    [`%${q}%`, req.session.userId]
  );
  res.json(rows);
});

module.exports = router;
