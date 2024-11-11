const { Client, Collection, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
require('dotenv').config();  // Zorg ervoor dat de .env variabelen geladen worden
 
// Maak de client aan
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});
 
// Maak een verzameling voor de commando's
client.commands = new Collection();
 
// Lees de bestanden in de `commands` map
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
 
// Laad elk commando en voeg het toe aan de collectie
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.data.name, command);
}
 
// Wanneer de bot klaar is
client.once('ready', () => {
  console.log(`Ingelogd als ${client.user.tag}!`);
});
 
// Wanneer er een interactie is (bijvoorbeeld een slash command)
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
 
// Log in de bot met de token uit je .env bestand
client.login(process.env.BOT_TOKEN);