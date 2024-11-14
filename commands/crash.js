const { SlashCommandBuilder } = require('discord.js');
const { getBalance, updateBalance } = require('../balance');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('crash')
        .setDescription('Play a Crash game!')
        .addIntegerOption(option => 
            option.setName('bet')
            .setDescription('Amount of chips to bet')
            .setRequired(true)
            .setMinValue(1)
        ),

    async execute(interaction) {
        const userId = interaction.user.id;
        const betAmount = interaction.options.getInteger('bet');
        const balance = getBalance(userId);

        // Check if the user has enough balance for the bet
        if (balance < betAmount) {
            await interaction.reply(`You don't have enough chips to place this bet. Your balance is ${balance} chips.`);
            return;
        }

        // Deduct the bet amount from the user's balance
        updateBalance(userId, -betAmount);

        // Generate a random crash multiplier between 1x and 10x
        function getRandomCrashMultiplier(min, max, skew) {
            let randomNum = Math.pow(Math.random(), skew);
            return (randomNum * (max - min) + min).toFixed(2);
        }

        const crashMultiplier = parseFloat(getRandomCrashMultiplier(1, 10, 4.5));
        // console.log(`Crash Multiplier: ${crashMultiplier}`);

        let currentMultiplier = 1.0;
        let increment = 0.1;
        let gameEnded = false; // Flag to handle game state

        // Initial response
        await interaction.reply({
            content: `The game has started! Your bet: ${betAmount} chips.\nMultiplier: ${currentMultiplier.toFixed(2)}x`,
            ephemeral: true,
            components: [
                {
                    type: 1,
                    components: [
                        { type: 2, label: 'Cash Out', style: 3, custom_id: 'cash_out' }
                    ]
                }
            ]
        });

        // Button interaction collector for "Cash Out" with no time limit
        const filter = i => i.user.id === userId && i.customId === 'cash_out';
        const collector = interaction.channel.createMessageComponentCollector({ filter, max: 1 });

        collector.on('collect', async i => {
            if (gameEnded) return; // If the game has ended, ignore the cash-out attempt
            gameEnded = true; // Mark the game as ended

            // If the player pressed "Cash Out" before crash
            const winnings = Math.floor(betAmount * currentMultiplier);
            updateBalance(userId, winnings);

            await i.update({
                content: `🎉 You cashed out at ${currentMultiplier.toFixed(2)}x!\nIt would have crashed at ${crashMultiplier}x.\nYou won ${winnings} chips! Your balance is now ${getBalance(userId)} chips.`,
                components: []
            });
            clearInterval(multiplierInterval); // Stop multiplier updates
        });

        // Function to update the multiplier and check for crash
        const multiplierInterval = setInterval(async () => {
            if (gameEnded) {
                clearInterval(multiplierInterval); // Stop updates if game ended
                return;
            }

            increment *= 1.05; // Increase the increment to accelerate the multiplier
            currentMultiplier += increment;

            // Check if the multiplier has reached or exceeded the crash multiplier
            if (parseFloat(currentMultiplier.toFixed(2)) >= crashMultiplier) {
                gameEnded = true; // Mark the game as ended
                clearInterval(multiplierInterval); // Stop updating multiplier
                collector.stop(); // Stop the collector to prevent further "Cash Out" attempts

                // Inform the player about the crash
                await interaction.editReply({
                    content: `💥 **Crash!** The multiplier crashed at ${crashMultiplier}x.\nYou lost your bet of ${betAmount} chips.`,
                    components: []
                });
                return;
            }

            // If not crashed and user hasn't cashed out, update the multiplier display
            if (!gameEnded) {
                await interaction.editReply({
                    content: `The multiplier is now ${currentMultiplier.toFixed(2)}x.\nClick "Cash Out" to secure your winnings!`,
                    components: [
                        {
                            type: 1,
                            components: [
                                { type: 2, label: 'Cash Out', style: 3, custom_id: 'cash_out' }
                            ]
                        }
                    ]
                });
            }
        }, 1000);
    }
};
