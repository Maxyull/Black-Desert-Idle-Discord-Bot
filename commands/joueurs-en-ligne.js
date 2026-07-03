const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { supabase } = require('../lib/supabase');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('joueurs-en-ligne')
    .setDescription('Affiche le nombre de joueurs actuellement en ligne sur Velia Idle'),
  async execute(interaction) {
    await interaction.deferReply();
    const { data, error } = await supabase.rpc('get_online_counts', { p_window_seconds: 90 });
    if (error || !data || !data[0]) {
      await interaction.editReply('Impossible de récupérer le nombre de joueurs en ligne pour le moment.');
      return;
    }
    const { total, guests, verified } = data[0];
    const embed = new EmbedBuilder()
      .setTitle('🟢 Joueurs en ligne')
      .setDescription(`**${total}** joueurs en ligne\n${verified} compte(s) vérifié(s) · ${guests} invité(s)`)
      .setColor(0x8fc98a);
    await interaction.editReply({ embeds: [embed] });
  },
};
