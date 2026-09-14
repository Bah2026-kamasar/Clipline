// Jeton de courte durée utilisé uniquement pour authentifier la connexion
// WebSocket (les appels). Il ne remplace pas la session normale du site.
const crypto = require('crypto');

function sign(userId) {
  const expiry = Date.now() + 60 * 1000; // valable 60 secondes, juste le temps d'ouvrir la connexion
  const payload = `${userId}.${expiry}`;
  const sig = crypto
    .createHmac('sha256', process.env.SESSION_SECRET || 'dev-secret')
    .update(payload)
    .digest('hex');
  return `${payload}.${sig}`;
}

function verify(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [userIdStr, expiryStr, sig] = parts;
  const payload = `${userIdStr}.${expiryStr}`;
  const expected = crypto
    .createHmac('sha256', process.env.SESSION_SECRET || 'dev-secret')
    .update(payload)
    .digest('hex');
  if (sig !== expected) return null;
  if (Date.now() > parseInt(expiryStr, 10)) return null;
  const userId = parseInt(userIdStr, 10);
  return Number.isInteger(userId) ? userId : null;
}

module.exports = { sign, verify };
