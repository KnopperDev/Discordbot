const { Client, Collection, GatewayIntentBits, REST, Routes } = require('discord.js');
const { loadBalances, saveBalances, balances } = require('./balance');
const fs = require('fs');
require('dotenv').config();

// Maak de client aan
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers,],
  
});

client.commands = new Collection();

// Lees de bestanden in de `commands` map
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

// Laad elk commando en voeg het toe aan de collectie
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.data.name, command);
}

// Registering commands with Discord API (only needed once, during initial deployment or changes)
const commands = client.commands.map(command => command.data.toJSON());
const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
      body: commands,
    });

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();

// After client is ready:
client.once('ready', async () => {
  console.log(`Ingelogd als ${client.user.tag}!`);
  loadBalances();

  // For each member in every guild the bot is in
  for (const guild of client.guilds.cache.values()) {
      // Fetch all members to ensure you have everyone
      await guild.members.fetch();
      guild.members.cache.forEach(member => {
          if (!member.user.bot && !(member.id in balances)) {
              balances[member.id] = 5000;
          }
      });
  }

  saveBalances();
  console.log('All members initialized with 5000 chips!');
});

// Handling interactions (commands)
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    await interaction.reply({
      content: 'Er is een fout opgetreden bij het uitvoeren van dit commando.',
      ephemeral: true,
    });
  }
});

const http = require('http');
const PORT = process.env.PORT || 8000;

http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Bot is alive!');
}).listen(PORT, () => {
  console.log(`Health check server running on port ${PORT}`);
});

// Log in the bot with the token from the .env file
client.login(process.env.BOT_TOKEN);
