const express = require('express');
const crypto = require('crypto');
const fetch = require('node-fetch');
const { pool } = require('../db');

const router = express.Router();

// Étape 1 : le bouton "Se connecter avec TikTok" pointe vers cette route.
// On génère un "state" aléatoire pour se protéger des attaques CSRF,
// puis on redirige l'utilisateur vers la page d'autorisation TikTok.
router.get('/tiktok/login', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  req.session.oauthState = state;

  const params = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY,
    scope: 'user.info.basic',
    response_type: 'code',
    redirect_uri: process.env.TIKTOK_REDIRECT_URI,
    state
  });

  res.redirect(`https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`);
});

// Étape 2 : TikTok renvoie l'utilisateur ici avec un "code".
// On échange ce code contre un access_token, puis on récupère le profil.
router.get('/tiktok/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.status(400).send("Connexion TikTok annulée ou refusée.");
  }
  if (!state || state !== req.session.oauthState) {
    return res.status(400).send("Session invalide, réessaie de te connecter.");
  }
  delete req.session.oauthState;

  try {
    // Échange du code contre un access_token (doit se faire côté serveur)
    const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_KEY,
        client_secret: process.env.TIKTOK_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.TIKTOK_REDIRECT_URI
      })
    });
    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      console.error('Réponse token inattendue :', tokenData);
      return res.status(500).send("Impossible d'obtenir un accès TikTok.");
    }

    // Récupération du profil de base (pseudo affiché + avatar)
    const infoRes = await fetch(
      'https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url',
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
    );
    const infoData = await infoRes.json();
    const profile = infoData.data && infoData.data.user;

    if (!profile) {
      console.error('Réponse profil inattendue :', infoData);
      return res.status(500).send("Impossible de récupérer le profil TikTok.");
    }

    // On crée le compte s'il n'existe pas encore, sinon on le met à jour
    const existing = await pool.query(
      'SELECT * FROM users WHERE tiktok_open_id = $1',
      [tokenData.open_id]
    );

    let user;
    if (existing.rows.length === 0) {
      const inserted = await pool.query(
        `INSERT INTO users (tiktok_open_id, pseudo, avatar_url)
         VALUES ($1, $2, $3) RETURNING *`,
        [tokenData.open_id, profile.display_name, profile.avatar_url]
      );
      user = inserted.rows[0];
    } else {
      user = existing.rows[0];
      await pool.query(
        'UPDATE users SET pseudo = $1, avatar_url = $2 WHERE id = $3',
        [profile.display_name, profile.avatar_url, user.id]
      );
    }

    req.session.userId = user.id;
    req.session.pseudo = user.pseudo;

    res.redirect('/'); // retour vers le site
  } catch (err) {
    console.error(err);
    res.status(500).send("Erreur pendant la connexion TikTok.");
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

module.exports = router;
