const { SlashCommandBuilder } = require('discord.js');
const { getBalance } = require('../balance');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Displays the user\'s balance!'),
  async execute(interaction) {
    const user = interaction.user.username;
    const balance = getBalance(interaction.user.id);

    await interaction.reply({ 
      content: `${user}, your balance is ${balance} chips.`,
      ephemeral: true
    });
  },
};
