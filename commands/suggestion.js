const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { supabase } = require('../lib/supabase');
const { ensureSuggestionTags, isForumChannel } = require('../lib/suggestionTags');

async function nextSuggestionNumber() {
  const { data } = await supabase.from('bot_state').select('value').eq('key', 'suggestion_counter').maybeSingle();
  const n = (data ? parseInt(data.value, 10) : 0) + 1;
  await supabase.from('bot_state').upsert({ key: 'suggestion_counter', value: String(n) });
  return n;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('suggestion')
    .setDescription('Propose une idée pour Velia Idle')
    .addStringOption(opt =>
      opt.setName('texte')
        .setDescription('Ta suggestion')
        .setRequired(true)
        .setMaxLength(1000)),
  async execute(interaction) {
    const texte = interaction.options.getString('texte');
    const channelId = process.env.DISCORD_SUGGESTIONS_CHANNEL_ID;
    const forumChannel = channelId ? await interaction.client.channels.fetch(channelId).catch(() => null) : null;

    if (!forumChannel || !isForumChannel(forumChannel)) {
      await interaction.reply({
        content: 'Le salon de suggestions n\'est pas configuré (ou n\'est pas un salon Forum), contacte un admin.',
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const number = await nextSuggestionNumber();
    const { pendingId } = await ensureSuggestionTags(forumChannel);

    const embed = new EmbedBuilder()
      .setDescription(texte)
      .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
      .setFooter({ text: '🗳️ En attente de vote' })
      .setColor(0xc9a55a)
      .setTimestamp();

    // le vote se fait par réaction (👍/👎, natif Discord) — les boutons sont réservés au staff
    const modRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`sugg_accept_${number}`).setLabel('✅ Accepter').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`sugg_reject_${number}`).setLabel('❌ Refuser').setStyle(ButtonStyle.Danger),
    );

    const thread = await forumChannel.threads.create({
      name: `#${number} — ${texte.slice(0, 80)}`,
      appliedTags: pendingId ? [pendingId] : [],
      message: { embeds: [embed], components: [modRow] },
    });

    const starterMessage = await thread.fetchStarterMessage();
    if (starterMessage) {
      await starterMessage.react('👍');
      await starterMessage.react('👎');
    }

    await interaction.editReply(`✅ Suggestion publiée : ${thread}`);
  },
};
