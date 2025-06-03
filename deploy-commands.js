const { Client, SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config(); // Ensure dotenv is loaded

const client = new Client({ intents: [] });

// Read command files from the `commands` folder
const commands = [];
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

// Define the guildId variable
const guildId = process.env.GUILD_ID; // Ensure your .env contains GUILD_ID

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  commands.push(command.data.toJSON());
}

client.once('ready', async () => {
  try {
    if (!guildId) {
      throw new Error('Guild ID is not defined in .env');
    }

    // Ensure the client has logged in and we can access the guild
    const guild = await client.guilds.fetch(guildId); // Fetch the guild by ID
    await guild.commands.set(commands); // Register commands in the specified guild
    console.log('Successfully registered commands for the guild.');
    
  } catch (error) {
    console.error('Error registering commands:', error);
  } finally {
    client.destroy(); // Disconnect after registering commands
  }
});

client.login(process.env.BOT_TOKEN); // Use the token from .env
