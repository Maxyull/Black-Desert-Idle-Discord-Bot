const { SlashCommandBuilder } = require('discord.js');
const { supabase } = require('../lib/supabase');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lier')
    .setDescription('Lie ton compte Discord à ton compte Velia Idle')
    .addStringOption(opt =>
      opt.setName('code')
        .setDescription('Code généré dans le panneau "Mon compte" du jeu')
        .setRequired(true)),
  async execute(interaction) {
    const code = interaction.options.getString('code').trim().toUpperCase();
    await interaction.deferReply({ ephemeral: true });

    const { data: linkCode, error: findError } = await supabase
      .from('link_codes')
      .select('user_id, expires_at')
      .eq('code', code)
      .maybeSingle();

    if (findError) {
      await interaction.editReply('Erreur serveur, réessaie plus tard.');
      return;
    }
    if (!linkCode) {
      await interaction.editReply('❌ Code invalide. Génère un nouveau code depuis le panneau "Mon compte" dans le jeu.');
      return;
    }
    if (new Date(linkCode.expires_at) < new Date()) {
      await interaction.editReply('❌ Ce code a expiré. Génère-en un nouveau dans le jeu.');
      return;
    }

    const { error: linkError } = await supabase
      .from('discord_links')
      .upsert({ discord_id: interaction.user.id, user_id: linkCode.user_id, linked_at: new Date().toISOString() });

    if (linkError) {
      await interaction.editReply('Erreur en liant ton compte : ' + linkError.message);
      return;
    }

    await supabase.from('link_codes').delete().eq('code', code);

    await interaction.editReply('✅ Ton compte Discord est maintenant lié à ton compte Velia Idle !');
  },
};
