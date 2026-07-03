// Journal centralisé : écrit toujours dans la console (visible dans les logs Render),
// et en plus, une fois le bot connecté, relaie aussi vers un salon Discord dédié — pratique
// pour surveiller le bot sans avoir à ouvrir le dashboard Render.
let discordClient = null;

function initLogger(client) {
  discordClient = client;
}

async function sendToDiscord(text, isError) {
  const channelId = process.env.DISCORD_LOGS_CHANNEL_ID;
  if (!discordClient || !channelId || !discordClient.isReady()) return;
  try {
    const channel = await discordClient.channels.fetch(channelId).catch(() => null);
    if (!channel) return;
    const prefix = isError ? '🔴' : '🟢';
    const stamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
    // limite Discord de 2000 caractères par message — tronque au besoin plutôt que planter
    const content = `${prefix} \`${stamp}\` ${text}`.slice(0, 1900);
    await channel.send(content);
  } catch (e) { /* jamais faire planter le bot pour un souci de journalisation */ }
}

function formatArgs(args) {
  return args.map(a => (a instanceof Error ? a.stack || a.message : typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
}

function logInfo(...args) {
  console.log(...args);
  sendToDiscord(formatArgs(args), false);
}

function logError(...args) {
  console.error(...args);
  sendToDiscord(formatArgs(args), true);
}

module.exports = { initLogger, logInfo, logError };
