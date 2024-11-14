const { SlashCommandBuilder } = require('discord.js');
const { getBalance, updateBalance } = require('../balance');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('last_resort')
    .setDescription('gives the user an extra amount of chips if they are broke!'),
  async execute(interaction) {
    const user = interaction.user.id;  // Use the correct property to get user ID
    const user_name = interaction.user.username;
    const user_balance = await getBalance(user);  // Await getBalance if it's async

    if (user_balance > 0) {
      await interaction.reply({
        content: `${user_name}, your balance is ${user_balance} chips. So you can still bet.`,
        ephemeral: true
      });
    } else {
      await interaction.reply({
        content: `${user_name}, your balance is ${user_balance} chips. I'll give you some extra chips.`,
        ephemeral: true
      });
      await updateBalance(user, 5000);  // Await updateBalance if it's async
    }
  },
};
