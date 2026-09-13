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
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  console.log('Tables prêtes (users, messages).');
}

module.exports = { pool, initDb };
