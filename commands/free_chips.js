const { SlashCommandBuilder } = require('discord.js');
const { getBalance, updateBalance } = require('../balance');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('freechips')
    .setDescription('Get a free chip bonus if you are broke!'),
  async execute(interaction) {
    const userId = interaction.user.id;
    const userName = interaction.user.username;
    const userBalance = await getBalance(userId);

    if (userBalance > 0) {
      await interaction.reply({
        content: `🪙 **${userName}'s Balance:** \`${userBalance}\` chips\n\nYou still have chips to play!`,
        ephemeral: true
      });
    } else {
      await updateBalance(userId, 5000);
      await interaction.reply({
        content: `💸 **${userName}, you were out of chips!**\n\n🎁 You received **5,000 free chips** to keep playing!\n\nYour new balance: \`5000\` chips.`,
        ephemeral: true
      });
    }
  },
};
