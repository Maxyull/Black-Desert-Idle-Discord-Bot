const http = require('http');

// Render (comme la plupart des hébergeurs "Web Service" gratuits) exige qu'un port
// HTTP soit ouvert pour considérer le service en bonne santé. Ce serveur sert aussi
// de petite API interne pour /join-guild (ajout auto au serveur Discord après connexion
// OAuth depuis le jeu).
function startKeepAliveServer() {
  const port = process.env.PORT || 3000;

  http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/join-guild') {
      handleJoinGuild(req, res);
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Velia Idle bot en ligne.');
  }).listen(port, () => console.log(`Serveur de santé HTTP à l'écoute sur le port ${port}`));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1e5) { req.destroy(); reject(new Error('Corps de requête trop volumineux')); }
    });
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

// Ajoute un joueur au serveur Discord communautaire via l'API Discord, en utilisant le
// token OAuth (scope guilds.join) obtenu par le jeu lors de la connexion "Se connecter
// avec Discord". Le secret partagé (INTERNAL_API_SECRET) filtre les appels non désirés,
// mais la vraie protection vient de Discord lui-même : un access_token invalide/expiré/
// sans le bon scope est rejeté par leur API, quoi qu'il arrive.
async function handleJoinGuild(req, res) {
  try {
    if (req.headers['x-internal-secret'] !== process.env.INTERNAL_API_SECRET) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Non autorisé' }));
      return;
    }

    const { discordUserId, accessToken } = await readJsonBody(req);
    if (!discordUserId || !accessToken) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'discordUserId et accessToken requis' }));
      return;
    }

    const guildId = process.env.DISCORD_GUILD_ID;
    if (!guildId) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'DISCORD_GUILD_ID non configuré côté bot' }));
      return;
    }

    const discordRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${discordUserId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ access_token: accessToken }),
    });

    // 201 = ajouté, 204 = déjà membre du serveur — les deux sont un succès du point de vue du joueur
    if (discordRes.status === 201 || discordRes.status === 204) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, alreadyMember: discordRes.status === 204 }));
      return;
    }

    const errText = await discordRes.text().catch(() => '');
    console.error('join-guild: échec API Discord', discordRes.status, errText);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Échec de l\'ajout au serveur Discord' }));
  } catch (e) {
    console.error('join-guild:', e.message);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Erreur interne' }));
  }
}

module.exports = { startKeepAliveServer };
