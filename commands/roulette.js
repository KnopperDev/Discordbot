const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { playRoulette } = require('../games');  

const redNumbers = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const blackNumbers = new Set([2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35]);
const greenNumber = 0;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roulette')
        .setDescription('Play a roulette game! Bet on red, black, or a specific number (0-36).')
        .addStringOption(option =>
            option.setName('bet_type')
                .setDescription('Choose "red", "black", or a number from 0 to 36.')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('bet_amount')
                .setDescription('The amount of chips to bet.')
                .setRequired(true)),
                
    async execute(interaction) {
        const userId = interaction.user.id;
        const betTypeInput = interaction.options.getString('bet_type').toLowerCase();
        const betAmount = interaction.options.getInteger('bet_amount');

        const betType = (betTypeInput === 'red' || betTypeInput === 'black')
            ? betTypeInput
            : !isNaN(parseInt(betTypeInput)) && parseInt(betTypeInput) >= 0 && parseInt(betTypeInput) <= 36
                ? parseInt(betTypeInput)
                : null;

        if (betType === null) {
            await interaction.reply({
                content: `Invalid bet type. Please choose "red", "black", or a number between 0 and 36.`,
                ephemeral: true
            });
            return;
        }

        const result = playRoulette(userId, betType, betAmount);

        let color;
        let outcomeText;
        
        if (result.outcome === greenNumber) {
            color = '#00FF00';
            outcomeText = `🟢 **${result.outcome}**`;
        } else if (redNumbers.has(result.outcome)) {
            color = '#FF0000';
            outcomeText = `🔴 **${result.outcome}**`;
        } else if (blackNumbers.has(result.outcome)) {
            color = '#000000';
            outcomeText = `⚫ **${result.outcome}**`;
        } else {
            color = '#FFFFFF';
            outcomeText = `**${result.outcome}**`;
        }

        const embed = new EmbedBuilder()
            .setTitle(`${interaction.user.username}'s Roulette Game`)
            .setDescription(`You bet on **${betType}** with **${betAmount} chips**.\n\n **The ball landed on:** ${outcomeText}`)
            .setColor(color)
            .addFields(
                { name: 'Result', value: result.message }
            );

        await interaction.reply({
            embeds: [embed],
            ephemeral: true,
        });
    },
};
