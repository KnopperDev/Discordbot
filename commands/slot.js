const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { playSlots } = require('../games');
const { getBalance } = require('../balance');

const activeUsers = new Set();  // Set to track users who are currently playing slots

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slots')
        .setDescription('Play a slot game for a chance to win!')
        .addIntegerOption(option =>
            option.setName('bet_amount')
            .setDescription('The amount of chips to bet.')
            .setRequired(true)),
    async execute(interaction) {
        const userId = interaction.user.id;
        const balance = getBalance(userId);
        const betAmount = interaction.options.getInteger('bet_amount');

        if (balance < betAmount || betAmount <= 0) {
            // Send a reply to the user when their balance is too low
            return interaction.reply({
                content: `Invalid bet. Your balance is ${balance} chips.`,
                ephemeral: true  // Make the message visible only to the user
            });
        }

        // Check if the user is already in the middle of a game
        if (activeUsers.has(userId)) {
            return interaction.reply({
                content: 'You are already playing a slot game. Please wait for it to finish before starting a new one!',
                ephemeral: true,  // Make the message visible only to the user
            });
        }

        // Mark the user as currently playing
        activeUsers.add(userId);

        // Symbols for the animated "spinning" effect
        const spinningSymbols = ["🍒", "🍋", "🍊", "⭐", "💎", "BAR"];

        // Helper function to get a random spinning symbol
        function getRandomSymbol() {
            return spinningSymbols[Math.floor(Math.random() * spinningSymbols.length)];
        }

        // Create the initial "spinning" embed with random symbols
        const embed = new EmbedBuilder()
            .setColor(0xFFD700)
            .setTitle(`${interaction.user.username}'s Slot Game 🎰`)
            .setDescription(`Spinning... **${getRandomSymbol()} ${getRandomSymbol()} ${getRandomSymbol()}**`)
            .setFooter({ text: 'Good luck!' })
            .setTimestamp();

        // Send the initial "spinning" message, ephemeral so it's visible only to the user
        const reply = await interaction.reply({
            embeds: [embed],
            ephemeral: false,  // Make it visible only to the user
            fetchReply: true  // Fetch the reply to edit it later
        });

        // Start the fake spin animation without delay
        const fakeSpins = 3;
        for (let i = 0; i < fakeSpins; i++) {
            // Create a new random spin for each cycle
            const spinningRoll = [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()];
            embed.setDescription(`Spinning... **${spinningRoll.join(" ")}**`);
            await reply.edit({ embeds: [embed] });

            // Small delay to simulate fast spinning (adjust speed as needed)
            await new Promise(resolve => setTimeout(resolve, 150));
        }

        // Retrieve the actual result of the slot game after fake spins
        const result = playSlots(userId, betAmount);
        const finalRoll = result.display.split(" ");  // Final symbols for each reel

        // After the fake spins, update the embed with the final result
        embed.setDescription(`You spun: **${finalRoll.join(" ")}**\n${result.message}`);
        
        // Update the message with the final result (ephemeral, visible only to the user)
        await reply.edit({
            embeds: [embed],
            ephemeral: true  // Ensures the final result remains visible only to the user
        });

        // Remove the user from the active set once the game is finished
        activeUsers.delete(userId);
    },
};
