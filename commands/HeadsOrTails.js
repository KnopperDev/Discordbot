const { SlashCommandBuilder } = require('discord.js');
const { getBalance, updateBalance } = require('../balance');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('headsortails') // must be all lowercase
        .setDescription('Play a Heads or Tails game!')
        .addIntegerOption(option => 
            option.setName('bet')
                .setDescription('Amount of chips to bet')
                .setRequired(true)
                .setMinValue(1)
        )
        .addStringOption(option =>
            option.setName('choice')
                .setDescription('Choose heads or tails')
                .setRequired(true)
                .addChoices(
                    { name: 'Heads', value: 'heads' },
                    { name: 'Tails', value: 'tails' }
                )
        ),

    async execute(interaction) {
        const userId = interaction.user.id;
        const balance = getBalance(userId);
        const userChoice = interaction.options.getString('choice');
        const betAmount = interaction.options.getInteger('bet');

        if (balance < betAmount) {
            await interaction.reply({ content: `You don't have enough chips to bet ${betAmount}. Your balance is ${balance}.`, ephemeral: true });
            return;
        }

        // Deduct bet temporarily
        updateBalance(userId, -betAmount);

        // Simulate coin flip
        const result = Math.random() < 0.5 ? 'heads' : 'tails';

        let response = `You chose **${userChoice}**. The coin landed on **${result}**.\n`;

        if (userChoice === result) {
            const winnings = betAmount * 2;
            updateBalance(userId, winnings);
            response += `🎉 You won **${winnings}** chips!\nYour balance is now ${getBalance(userId)} chips.`;
        } else {
            response += `😢 You lost **${betAmount}** chips. Better luck next time! \nYour balance is now ${getBalance(userId)} chips.`;
        }

        await interaction.reply({ content: response });
    }
};
