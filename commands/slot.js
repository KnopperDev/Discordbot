const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { playSlots } = require('../games');
const { getBalance } = require('../balance');

const activeUsers = new Set();  // Set to track users who are currently playing slots

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slots')
        .setDescription('Play a slot game for a chance to win!')
        .addIntegerOption(option =>
            option.setName('bet')
            .setDescription('The amount of chips to bet.')
            .setRequired(true)
            .setMinValue(1)
        ),
    async execute(interaction) {
        const userId = interaction.user.id;
        const userName = interaction.user.username;
        const balance = getBalance(userId);
        const betAmount = interaction.options.getInteger('bet');

        if (balance < betAmount) {
            await interaction.reply({ 
                content: `❌ You don't have enough chips to place this bet. Your balance is \`${balance}\` chips.`, 
                ephemeral: true 
            });
            return;
        }

        // Check if the user is already in the middle of a game
        if (activeUsers.has(userId)) {
            return interaction.reply({
                content: '🚫 You are already playing a slot game. Please wait for it to finish before starting a new one!',
                ephemeral: true,
            });
        }

        // Mark the user as currently playing
        activeUsers.add(userId);

        // Symbols for the animated "spinning" effect
        const spinningSymbols = ["🍒", "🍋", "🍊", "⭐", "💎", "BAR"];

        function getRandomSymbol() {
            return spinningSymbols[Math.floor(Math.random() * spinningSymbols.length)];
        }

        // Create the initial "spinning" embed with random symbols
        const embed = new EmbedBuilder()
            .setColor(0xFFD700)
            .setTitle(`🎰 ${userName}'s Slot Game`)
            .setDescription(`Spinning... **${getRandomSymbol()} ${getRandomSymbol()} ${getRandomSymbol()}**`)
            .setFooter({ text: 'Good luck!' })
            .setTimestamp();

        // Send the initial "spinning" message
        const reply = await interaction.reply({
            embeds: [embed],
            ephemeral: false, // Temporarily public for animation
            fetchReply: true
        });

        // Fake spin animation
        const fakeSpins = 3;
        for (let i = 0; i < fakeSpins; i++) {
            const spinningRoll = [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()];
            embed.setDescription(`Spinning... **${spinningRoll.join(" ")}**`);
            await reply.edit({ embeds: [embed] });
            await new Promise(resolve => setTimeout(resolve, 150));
        }

        // Get the actual result of the slot game
        const result = playSlots(userId, betAmount);
        const finalRoll = result.display.split(" ");

        // Update the embed with the final result
        embed.setDescription(`You spun: **${finalRoll.join(" ")}**\n${result.message}`);

        // Update the message with the final result (ephemeral)
        await reply.edit({
            embeds: [embed],
            ephemeral: true
        });

        // Remove the user from the active set once the game is finished
        activeUsers.delete(userId);
    },
};
