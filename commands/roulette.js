const { SlashCommandBuilder } = require('discord.js');
const { playRoulette } = require('../games');  // Import playRoulette from games.js

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

        // Convert betTypeInput to a number if it's between "0" and "36", or keep it as a string if it's "red" or "black"
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

        // Run the roulette game and get the result
        const result = playRoulette(userId, betType, betAmount);

        // Send the result back to the user
        await interaction.reply({
            content: `${interaction.user.username}, you bet on ${betType} with ${betAmount} chips.\nResult: ${result.outcome}\n${result.message}`,
            ephemeral: true,
        });
    },
};
