const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getBalance, updateBalance } = require('../balance');

const redNumbers = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const blackNumbers = new Set([2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35]);
const greenNumber = 0;

function spinRoulette() {
    return Math.floor(Math.random() * 37); // 0-36
}

function getColorEmoji(number) {
    if (number === greenNumber) return '🟢';
    if (redNumbers.has(number)) return '🔴';
    if (blackNumbers.has(number)) return '⚫';
    return '';
}

function getRouletteColor(number) {
    if (number === greenNumber) return '#00FF00';
    if (redNumbers.has(number)) return '#FF0000';
    if (blackNumbers.has(number)) return '#000000';
    return '#FFFFFF';
}

function getPayout(betType, outcome) {
    if (betType === 'red' && redNumbers.has(outcome)) return 2;
    if (betType === 'black' && blackNumbers.has(outcome)) return 2;
    if (typeof betType === 'number' && betType === outcome) return 36;
    return 0;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roulette')
        .setDescription('Play a roulette game! Bet on red, black, or a specific number (0-36).')
        .addStringOption(option =>
            option.setName('bet_type')
                .setDescription('Choose "red", "black", or a number from 0 to 36.')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('bet')
                .setDescription('The amount of chips to bet.')
                .setRequired(true)
                .setMinValue(1)
        ),

    async execute(interaction) {
        const userId = interaction.user.id;
        const userName = interaction.user.username;
        const betTypeInput = interaction.options.getString('bet_type').toLowerCase();
        const betAmount = interaction.options.getInteger('bet');
        const balance = getBalance(userId);

        // Validate bet type
        let betType;
        if (betTypeInput === 'red' || betTypeInput === 'black') {
            betType = betTypeInput;
        } else if (!isNaN(parseInt(betTypeInput)) && parseInt(betTypeInput) >= 0 && parseInt(betTypeInput) <= 36) {
            betType = parseInt(betTypeInput);
        } else {
            await interaction.reply({
                content: `❌ Invalid bet type. Please choose "red", "black", or a number between 0 and 36.`,
                ephemeral: true
            });
            return;
        }

        // Check balance
        if (balance < betAmount) {
            await interaction.reply({
                content: `❌ You don't have enough chips to bet \`${betAmount}\`. Your balance: \`${balance}\` chips.`,
                ephemeral: true
            });
            return;
        }

        // Deduct bet
        updateBalance(userId, -betAmount);

        // Spin the wheel
        const outcome = spinRoulette();
        const payout = getPayout(betType, outcome);
        let winnings = 0;
        let resultMsg = '';

        if (payout > 0) {
            winnings = betAmount * payout;
            updateBalance(userId, winnings);
            resultMsg = `🎉 **You won \`${winnings}\` chips!**\n**New Balance:** \`${getBalance(userId)} chips\``;
        } else {
            resultMsg = `😢 **You lost \`${betAmount}\` chips.**\n**New Balance:** \`${getBalance(userId)} chips\``;
        }

        // Build the embed
        const embed = new EmbedBuilder()
            .setTitle(`🎰 ${userName}'s Roulette Game`)
            .setDescription(
                `**Your Bet:** \`${typeof betType === 'number' ? betType : betType.charAt(0).toUpperCase() + betType.slice(1)}\`\n` +
                `**Bet Amount:** \`${betAmount} chips\`\n\n` +
                `**The ball landed on:** ${getColorEmoji(outcome)} \`${outcome}\``
            )
            .setColor(getRouletteColor(outcome))
            .addFields({ name: 'Result', value: resultMsg });

        await interaction.reply({
            embeds: [embed],
            ephemeral: true,
        });
    },
};
