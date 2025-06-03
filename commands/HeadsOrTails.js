const { SlashCommandBuilder } = require('discord.js');
const { getBalance, updateBalance } = require('../balance');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('headsortails')
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
                    { name: '🪙 Heads', value: 'heads' },
                    { name: '🪙 Tails', value: 'tails' }
                )
        ),

    async execute(interaction) {
        const userId = interaction.user.id;
        const userName = interaction.user.username;
        const balance = getBalance(userId);
        const userChoice = interaction.options.getString('choice');
        const betAmount = interaction.options.getInteger('bet');

        if (balance < betAmount) {
            await interaction.reply({ 
                content: `❌ **${userName}**, you don't have enough chips to bet \`${betAmount}\`.\nYour balance: \`${balance}\` chips.`,
                ephemeral: true 
            });
            return;
        }

        // Deduct bet temporarily
        updateBalance(userId, -betAmount);

        // Simulate coin flip
        const result = Math.random() < 0.5 ? 'heads' : 'tails';
        const resultEmoji = result === 'heads' ? '🪙' : '🪙';

        let response = `🎰 **Heads or Tails** 🎰\n\n**Bet:** \`${betAmount} chips\`\n**Your Choice:** \`${userChoice.charAt(0).toUpperCase() + userChoice.slice(1)}\`\n**Result:** ${resultEmoji} \`${result.charAt(0).toUpperCase() + result.slice(1)}\`\n\n`;

        if (userChoice === result) {
            const winnings = betAmount * 2;
            updateBalance(userId, winnings);
            response += `🎉 **You won \`${winnings}\` chips!**\n**New Balance:** \`${getBalance(userId)} chips\``;
        } else {
            response += `😢 **You lost \`${betAmount}\` chips.** Better luck next time!\n**New Balance:** \`${getBalance(userId)} chips\``;
        }

        await interaction.reply({ content: response, ephemeral: true });
    }
};
