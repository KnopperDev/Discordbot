const { SlashCommandBuilder } = require('discord.js');
const { getBalance } = require('../balance');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Displays your casino balance!'),
  async execute(interaction) {
    const user = interaction.user.username;
    const balance = getBalance(interaction.user.id);

    await interaction.reply({ 
      content: `💳 **${user}'s Casino Balance** 💳\n\n**Chips:** \`${balance}\` 🪙`,
      ephemeral: true
    });
  },
};
