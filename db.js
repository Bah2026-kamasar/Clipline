const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      tiktok_open_id TEXT UNIQUE NOT NULL,
      pseudo TEXT NOT NULL,
      avatar_url TEXT,
      niche TEXT DEFAULT 'Autre',
      bio TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS conversations (
      id SERIAL PRIMARY KEY,
      user_a_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      user_b_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      initiator_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_a_id, user_b_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      content TEXT,
      type TEXT DEFAULT 'text',
      audio_data TEXT,
      duration_seconds INTEGER,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Au cas où la table messages existait déjà avant l'ajout des messages vocaux
  await pool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'text'`);
  await pool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS audio_data TEXT`);
  await pool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS duration_seconds INTEGER`);
  await pool.query(`ALTER TABLE messages ALTER COLUMN content DROP NOT NULL`);

  console.log('Tables prêtes (users, conversations, messages).');
}

module.exports = { pool, initDb };
