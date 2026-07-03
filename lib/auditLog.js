// Envoie un embed d'audit (arrivées/départs, messages modifiés/supprimés...) dans le
// salon logs — séparé de lib/logger.js (qui gère les logs internes du bot lui-même),
// mais les deux finissent dans le même salon Discord au final.
async function sendAuditEmbed(client, embed) {
  const channelId = process.env.DISCORD_LOGS_CHANNEL_ID;
  if (!channelId) return;
  try {
    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel) return;
    await channel.send({ embeds: [embed] });
  } catch (e) { /* jamais faire planter le bot pour un souci de journalisation */ }
}

module.exports = { sendAuditEmbed };
