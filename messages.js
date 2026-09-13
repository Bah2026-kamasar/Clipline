const express = require('express');
const { pool } = require('../db');

const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'not_logged_in' });
  next();
}

// Historique d'une conversation avec un autre utilisateur
router.get('/:otherUserId', requireAuth, async (req, res) => {
  const otherId = parseInt(req.params.otherUserId, 10);
  const { rows } = await pool.query(
    `SELECT * FROM messages
     WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)
     ORDER BY created_at ASC`,
    [req.session.userId, otherId]
  );
  res.json(rows);
});

// Envoyer un message
router.post('/:otherUserId', requireAuth, async (req, res) => {
  const otherId = parseInt(req.params.otherUserId, 10);
  const content = (req.body.content || '').trim();
  if (!content) return res.status(400).json({ error: 'empty_message' });

  const { rows } = await pool.query(
    `INSERT INTO messages (sender_id, receiver_id, content) VALUES ($1, $2, $3) RETURNING *`,
    [req.session.userId, otherId, content]
  );
  res.json(rows[0]);
});

module.exports = router;
