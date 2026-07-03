const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bug')
    .setDescription('Signale un bug sur Velia Idle')
    .addStringOption(opt =>
      opt.setName('description')
        .setDescription('Décris le bug (ce que tu faisais, ce qui s\'est passé)')
        .setRequired(true)),
  async execute(interaction) {
    const description = interaction.options.getString('description');
    const channelId = process.env.DISCORD_BUG_CHANNEL_ID;

    const embed = new EmbedBuilder()
      .setTitle('🐛 Signalement de bug')
      .setDescription(description)
      .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
      .setTimestamp()
      .setColor(0xc05545);

    if (channelId) {
      const channel = await interaction.client.channels.fetch(channelId).catch(() => null);
      if (channel) {
        await channel.send({ embeds: [embed] });
        await interaction.reply({ content: '✅ Bug signalé, merci !', ephemeral: true });
        return;
      }
    }
    // pas de salon dédié configuré (ou introuvable) → poste directement dans le salon courant
    await interaction.reply({ embeds: [embed] });
  },
};
