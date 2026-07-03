require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection, Events, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder } = require('discord.js');
const { supabase } = require('./lib/supabase');
const { translateToEnglish } = require('./lib/translate');
const { ensureSuggestionTags } = require('./lib/suggestionTags');
const { startKeepAliveServer } = require('./lib/keepAlive');

startKeepAliveServer();

// GuildMessages + MessageContent sont nécessaires pour lire le texte des messages à
// traduire. MessageContent est un "Privileged Intent" : à activer manuellement dans
// Discord Developer Portal > ton appli > Bot > "Message Content Intent".
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});
client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'))) {
  const command = require(path.join(commandsPath, file));
  client.commands.set(command.data.name, command);
}

client.once(Events.ClientReady, c => {
  console.log(`Bot connecté en tant que ${c.user.tag}`);
  updatePresence();
  checkForNewVersion();
  setInterval(updatePresence, 60 * 1000);
  setInterval(checkForNewVersion, 5 * 60 * 1000);
});

client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction);
    } catch (err) {
      console.error(`Erreur dans la commande /${interaction.commandName} :`, err);
      const payload = { content: 'Une erreur est survenue en exécutant cette commande.', ephemeral: true };
      if (interaction.deferred || interaction.replied) await interaction.editReply(payload);
      else await interaction.reply(payload);
    }
    return;
  }
  if (interaction.isButton()) return handleSuggestionButton(interaction);
});

// ---------- boutons Accepter/Refuser des suggestions (réservés au staff) ----------
async function handleSuggestionButton(interaction) {
  const match = interaction.customId.match(/^sugg_(accept|reject)_\d+$/);
  if (!match) return;
  const action = match[1];

  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    await interaction.reply({ content: '❌ Réservé au staff (permission "Gérer le serveur" requise).', ephemeral: true });
    return;
  }

  const embed = EmbedBuilder.from(interaction.message.embeds[0]);
  if (action === 'accept') {
    embed.setFooter({ text: `✅ Acceptée par ${interaction.user.tag}` }).setColor(0x8fc98a);
  } else {
    embed.setFooter({ text: `❌ Refusée par ${interaction.user.tag}` }).setColor(0xc05545);
  }

  const disabledRow = new ActionRowBuilder().addComponents(
    interaction.message.components[0].components.map(b => ButtonBuilder.from(b).setDisabled(true))
  );

  await interaction.update({ embeds: [embed], components: [disabledRow] });

  // met à jour le tag du post forum (Accepté/Refusé) en remplaçant "En attente"
  const thread = interaction.channel;
  if (thread?.isThread() && thread.parent) {
    try {
      const { pendingId, acceptedId, rejectedId } = await ensureSuggestionTags(thread.parent);
      const newTagId = action === 'accept' ? acceptedId : rejectedId;
      const kept = thread.appliedTags.filter(id => id !== pendingId && id !== acceptedId && id !== rejectedId);
      await thread.setAppliedTags(newTagId ? [...kept, newTagId] : kept);
    } catch (e) { console.error('maj tag suggestion:', e.message); }
  }
}

// ---------- relais de traduction FR -> EN entre deux salons ----------
if (!process.env.DISCORD_FR_CHANNEL_ID || !process.env.DISCORD_EN_CHANNEL_ID) {
  console.error('Relais de traduction désactivé : DISCORD_FR_CHANNEL_ID et/ou DISCORD_EN_CHANNEL_ID non configurées — voir .env.example');
}
client.on(Events.MessageCreate, async message => {
  if (message.author.bot) return; // évite les boucles (dont les propres messages du bot)
  if (!process.env.DISCORD_FR_CHANNEL_ID || !process.env.DISCORD_EN_CHANNEL_ID) return;
  if (message.channel.id !== process.env.DISCORD_FR_CHANNEL_ID) return;
  if (!message.content || !message.content.trim()) return;

  const translated = await translateToEnglish(message.content);
  if (!translated) { console.error('Relais de traduction : échec de la traduction (message ignoré)'); return; }

  const targetChannel = await client.channels.fetch(process.env.DISCORD_EN_CHANNEL_ID).catch(() => null);
  if (!targetChannel) { console.error('Relais de traduction : salon EN introuvable (DISCORD_EN_CHANNEL_ID incorrect ?)'); return; }

  const embed = new EmbedBuilder()
    .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
    .setDescription(translated)
    .setFooter({ text: '🌐 Traduit automatiquement depuis #' + (message.channel.name || 'fr') })
    .setColor(0x9cc9e8)
    .setTimestamp(message.createdAt);

  await targetChannel.send({ embeds: [embed] }).catch(e => console.error('relais traduction:', e.message));
});

// ---------- statut du bot = nombre de joueurs en ligne ----------
async function updatePresence() {
  try {
    const { data, error } = await supabase.rpc('get_online_counts', { p_window_seconds: 90 });
    if (error || !data || !data[0]) return;
    client.user.setActivity(`${data[0].total} joueur(s) en ligne`, { type: 3 }); // 3 = Watching
  } catch (e) { console.error('updatePresence:', e.message); }
}

// ---------- annonce automatique de nouvelle version ----------
async function getBotState(key) {
  const { data } = await supabase.from('bot_state').select('value').eq('key', key).maybeSingle();
  return data ? data.value : null;
}
async function setBotState(key, value) {
  await supabase.from('bot_state').upsert({ key, value });
}

// extrait les lignes tx:'...' d'un bloc fr:[...] ou en:[...] déjà isolé
function extractLines(block) {
  if (!block) return [];
  return [...block.matchAll(/tx:\s*'((?:[^'\\]|\\.)*)'/g)].map(m => m[1].replace(/\\'/g, "'"));
}

async function postPatchNote(channelId, versionName, lines) {
  if (!channelId) return;
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel) return;
  const embed = new EmbedBuilder()
    .setTitle(`🚀 Velia Idle — ${versionName}`)
    .setDescription(lines.length ? lines.map(l => `• ${l}`).join('\n') : 'Nouvelle version déployée !')
    .setColor(0xc9a55a)
    .setURL(process.env.GAME_URL);
  await channel.send({ embeds: [embed] });
}

async function checkForNewVersion() {
  if (!process.env.GAME_URL) {
    console.error('checkForNewVersion: variable GAME_URL non configurée — voir .env.example');
    return;
  }
  try {
    const res = await fetch(process.env.GAME_URL + (process.env.GAME_URL.includes('?') ? '&' : '?') + '_=' + Date.now());
    const text = await res.text();

    const verMatch = text.match(/const PATCH_NOTES = \[\s*\{\s*v:\s*'([^']+)'/);
    if (!verMatch) return;
    const latestVersion = verMatch[1];

    const lastAnnounced = await getBotState('last_announced_version');
    if (lastAnnounced === latestVersion) return; // rien de neuf

    // isole le tout premier bloc { v:'...', ... } du tableau (celui de latestVersion) en repérant
    // le début de l'entrée suivante plutôt qu'en devinant l'indentation exacte de fermeture —
    // plus robuste face aux reformatages mineurs du fichier source.
    const arrayStart = text.indexOf('const PATCH_NOTES = [');
    const fromArray = arrayStart === -1 ? '' : text.slice(arrayStart);
    const entryStarts = [...fromArray.matchAll(/\{\s*v:\s*'/g)];
    const firstBlock = entryStarts.length === 0 ? '' :
      entryStarts.length >= 2
        ? fromArray.slice(entryStarts[0].index, entryStarts[1].index)
        : fromArray.slice(entryStarts[0].index);

    const frBlockMatch = firstBlock.match(/fr:\[([\s\S]*?)\],\s*en:/);
    const enBlockMatch = firstBlock.match(/en:\[([\s\S]*?)\]\s*\}/);
    const frLines = extractLines(frBlockMatch ? frBlockMatch[1] : '');
    const enLines = extractLines(enBlockMatch ? enBlockMatch[1] : '');

    const nameMatch = text.match(new RegExp(`v:'${latestVersion}',\\s*name:\\{fr:'([^']*)',\\s*en:'([^']*)'`));
    const nameFr = nameMatch ? nameMatch[1] : '';
    const nameEn = nameMatch ? nameMatch[2] : '';

    await postPatchNote(process.env.DISCORD_PATCHNOTE_FR_CHANNEL_ID, `${latestVersion}${nameFr ? ' : ' + nameFr : ''}`, frLines);
    await postPatchNote(process.env.DISCORD_PATCHNOTE_EN_CHANNEL_ID, `${latestVersion}${nameEn ? ' : ' + nameEn : ''}`, enLines);

    await setBotState('last_announced_version', latestVersion);
  } catch (e) { console.error('checkForNewVersion:', e.message); }
}

client.login(process.env.DISCORD_TOKEN);
