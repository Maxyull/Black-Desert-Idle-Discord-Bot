const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { supabase } = require('../lib/supabase');

function fmt(n) {
  n = Number(n) || 0;
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(Math.round(n));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('classement')
    .setDescription('Affiche le top 10 des joueurs de Velia Idle')
    .addStringOption(opt =>
      opt.setName('categorie')
        .setDescription('Classement à afficher')
        .addChoices(
          { name: 'Silver', value: 'silver' },
          { name: 'Gearscore', value: 'gearscore' },
        )),
  async execute(interaction) {
    const categorie = interaction.options.getString('categorie') || 'silver';
    await interaction.deferReply();

    const { data, error } = await supabase
      .from('player_stats')
      .select('display_name, silver, gearscore')
      .order(categorie, { ascending: false })
      .limit(10);

    if (error) {
      await interaction.editReply('Erreur en récupérant le classement : ' + error.message);
      return;
    }
    if (!data || !data.length) {
      await interaction.editReply('Pas encore de données de classement.');
      return;
    }

    const lines = data.map((r, i) =>
      `**#${i + 1}** ${r.display_name || '?'} — ${categorie === 'silver' ? fmt(r.silver) + ' silver' : Math.round(r.gearscore) + ' GS'}`
    );

    const embed = new EmbedBuilder()
      .setTitle(`🏆 Classement — ${categorie === 'silver' ? 'Silver' : 'Gearscore'}`)
      .setDescription(lines.join('\n'))
      .setColor(0xc9a55a);

    await interaction.editReply({ embeds: [embed] });
  },
};
