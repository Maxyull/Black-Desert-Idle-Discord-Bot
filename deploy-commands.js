require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'))) {
  const command = require(path.join(commandsPath, file));
  commands.push(command.data.toJSON());
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    const route = process.env.DISCORD_GUILD_ID
      ? Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID)
      : Routes.applicationCommands(process.env.DISCORD_CLIENT_ID);

    await rest.put(route, { body: commands });
    console.log(`${commands.length} commande(s) slash déployée(s)` +
      (process.env.DISCORD_GUILD_ID ? ' (serveur — quasi instantané)' : ' (globalement — jusqu\'à 1h de délai)'));
  } catch (err) {
    console.error('Échec du déploiement des commandes :', err);
    process.exit(1);
  }
})();
