const { ChannelType } = require('discord.js');

const TAG_NAMES = {
  pending: '🗳️ En attente',
  accepted: '✅ Accepté',
  rejected: '❌ Refusé',
};

// S'assure que le salon forum a les 3 tags nécessaires — les crée s'ils manquent
// (garde les tags existants intacts, Discord limite à 20 tags par forum).
async function ensureSuggestionTags(forumChannel) {
  const existing = forumChannel.availableTags || [];
  const byName = Object.fromEntries(existing.map(t => [t.name, t.id]));
  const missing = Object.values(TAG_NAMES).filter(name => !byName[name]);

  if (missing.length) {
    const updated = [...existing, ...missing.map(name => ({ name }))];
    const result = await forumChannel.setAvailableTags(updated);
    for (const t of result.availableTags) byName[t.name] = t.id;
  }

  return {
    pendingId: byName[TAG_NAMES.pending],
    acceptedId: byName[TAG_NAMES.accepted],
    rejectedId: byName[TAG_NAMES.rejected],
  };
}

function isForumChannel(channel) {
  return channel && channel.type === ChannelType.GuildForum;
}

module.exports = { ensureSuggestionTags, isForumChannel, TAG_NAMES };
