const { SlashCommandBuilder } = require('discord.js');
const { playSlots } = require('../games');  // Import playSlots from games.js

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slots')
        .setDescription('Play a slot game for a chance to win!'),
    async execute(interaction) {
        const userId = interaction.user.id;
        
        // Run the slot game and get the result
        const result = playSlots(userId);

        // Send the result back to the user
        await interaction.reply({
            content: `${interaction.user.username}, you spun: ${result.display}\n${result.message}`,
            ephemeral: true,  // Sends the message only to the user who issued the command
        });
    },
};
