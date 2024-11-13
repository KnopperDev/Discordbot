const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pong')
    .setDescription('Reageert met ping!'),
  async execute(interaction) {
    await interaction.reply('Ping!');
  },
};
