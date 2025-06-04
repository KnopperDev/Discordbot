const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
require('dotenv').config(); // Load environment variables

const client = new Client({ intents: [GatewayIntentBits.Guilds] }); // Enable necessary intents

// Load commands from the `commands` folder
const commands = [];
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  commands.push(command.data.toJSON());
}

// Read environment variables
const guildId = process.env.GUILD_ID;

const deployGlobally = process.env.DEPLOY_GLOBALLY === 'true';

client.once('ready', async () => {
  try {
    if (deployGlobally) {
      // Register commands globally
      await client.application.commands.set(commands);
      console.log('Successfully registered commands globally.');
    } else if (guildId) {
      // Register commands for a specific guild
      const guild = await client.guilds.fetch(guildId);
      await guild.commands.set(commands);
      console.log('Successfully registered commands for the specified guild.');
    } else {
      console.error('Error: Guild ID is missing and global deployment is not enabled.');
    }
  } catch (error) {
    console.error('Error registering commands:', error);
  } finally {
    client.destroy(); // Disconnect after registering commands
  }
});

client.login(process.env.BOT_TOKEN); // Login using the bot token from .env
