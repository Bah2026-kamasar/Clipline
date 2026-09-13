# Serveur Clipline

Serveur backend pour Clipline : connexion via compte TikTok, annuaire des
tiktokers (recherche par pseudo) et messagerie privée.

## Structure

- `server.js` — point d'entrée, branche les routes et démarre le serveur
- `db.js` — connexion PostgreSQL et création des tables
- `routes/auth.js` — connexion via TikTok (Login Kit)
- `routes/users.js` — profil et recherche par pseudo
- `routes/messages.js` — messagerie privée

## Déployer sur Railway (étape par étape)

1. **Mets ce dossier sur GitHub** — crée un nouveau dépôt et pousse ces fichiers dedans.
2. Sur [railway.app](https://railway.app), clique sur **New Project** → **Deploy from GitHub repo**, et choisis ton dépôt.
3. Dans le même projet Railway, clique sur **+ New** → **Database** → **PostgreSQL**. Railway crée automatiquement une variable `DATABASE_URL` et la relie à ton service.
4. Va dans l'onglet **Variables** de ton service (pas de la base de données) et ajoute :
   - `TIKTOK_CLIENT_KEY`
   - `TIKTOK_CLIENT_SECRET`
   - `TIKTOK_REDIRECT_URI` (voir étape 6)
   - `SESSION_SECRET` (une longue chaîne aléatoire, invente-la)
   - `NODE_ENV` = `production`
5. Dans l'onglet **Settings** du service, sous **Networking**, clique sur **Generate Domain** (ou ajoute ton propre nom de domaine si tu en as un). Note l'URL en `https://...`.
6. Retourne sur [developers.tiktok.com](https://developers.tiktok.com), dans ton app → Login Kit, ajoute comme redirect URI :
   `https://TON-DOMAINE-RAILWAY/auth/tiktok/callback`
   puis reporte cette même URL dans la variable `TIKTOK_REDIRECT_URI` sur Railway (étape 4).
7. Railway redéploie automatiquement à chaque `git push`. Une fois en ligne, teste `https://TON-DOMAINE-RAILWAY/health` — tu dois voir `{"ok":true}`.
8. Le bouton "Se connecter avec TikTok" du site doit pointer vers :
   `https://TON-DOMAINE-RAILWAY/auth/tiktok/login`

## En local pour tester avant de déployer

```bash
npm install
cp .env.example .env
# remplis .env avec tes vraies valeurs
npm start
```

## Prochaine étape

Le fichier HTML du site (Clipline) devra appeler ces routes (`/auth/tiktok/login`,
`/api/users/search`, `/api/messages/:id`) à la place du stockage local utilisé
dans le prototype précédent.
