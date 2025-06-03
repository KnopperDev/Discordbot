const { SlashCommandBuilder } = require('discord.js');
const { getBalance, updateBalance } = require('../balance');

// Track users with active games
const activeCrashGames = new Set();
// Track cooldowns: userId => timestamp when they can play again
const crashCooldowns = new Map();

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
        const now = Date.now();

        // Check if user is in cooldown
        if (crashCooldowns.has(userId)) {
            const availableAt = crashCooldowns.get(userId);
            if (now < availableAt) {
                const waitSeconds = ((availableAt - now) / 1000).toFixed(1);
                await interaction.reply({
                    content: `⏳ Please wait ${waitSeconds} more second(s) before starting a new Crash game!`,
                    ephemeral: true
                });
                return;
            }
        }

        // Prevent multiple concurrent games per user
        if (activeCrashGames.has(userId)) {
            await interaction.reply({
                content: "🚫 You already have an active Crash game! Finish it before starting a new one.",
                ephemeral: true
            });
            return;
        }

        const betAmount = interaction.options.getInteger('bet');
        const balance = getBalance(userId);

        if (balance < betAmount) {
            await interaction.reply({
                content: `You don't have enough chips to place this bet. Your balance is ${balance} chips.`,
                ephemeral: true
            });
            return;
        }

        // Mark this user as having an active game
        activeCrashGames.add(userId);

        updateBalance(userId, -betAmount);

        // Stake-style crash multiplier: 1/(1-r), capped at 100x
        function getRandomCrashMultiplier() {
            const r = Math.random();
            const rawMultiplier = 1 / (1 - r);
            return Math.min(rawMultiplier, 100).toFixed(2);
        }

        const crashMultiplier = parseFloat(getRandomCrashMultiplier());
        let currentMultiplier = 1.0;
        let increment = 0.1;
        let gameEnded = false;

        function getCashOutButton(disabled = false) {
            return [
                {
                    type: 1,
                    components: [
                        {
                            type: 2,
                            label: 'Cash Out',
                            style: 3,
                            custom_id: 'cash_out',
                            disabled
                        }
                    ]
                }
            ];
        }

        await interaction.reply({
            content: `The game has started! Your bet: ${betAmount} chips.\nMultiplier: ${currentMultiplier.toFixed(2)}x`,
            ephemeral: true,
            components: getCashOutButton(false)
        });

        const filter = i => i.user.id === userId && i.customId === 'cash_out';
        const collector = interaction.channel.createMessageComponentCollector({ filter, max: 1 });

        // Helper to clean up after game ends (with cooldown)
        function endGameCleanup() {
            activeCrashGames.delete(userId);
            crashCooldowns.set(userId, Date.now() + 1000); // 1 second cooldown
            setTimeout(() => {
                crashCooldowns.delete(userId);
            }, 1100); // A little buffer to ensure the cooldown is over
        }

        collector.on('collect', async i => {
            if (gameEnded) return;
            gameEnded = true;

            const winnings = Math.floor(betAmount * currentMultiplier);
            updateBalance(userId, winnings);

            await i.update({
                content: `🎉 You cashed out at ${currentMultiplier.toFixed(2)}x!\nIt would have crashed at ${crashMultiplier}x.\nYou won ${winnings} chips! Your balance is now ${getBalance(userId)} chips.`,
                components: getCashOutButton(true)
            });
            clearInterval(multiplierInterval);
            collector.stop('cashed_out');
            endGameCleanup();
        });

        collector.on('end', async (collected, reason) => {
            // If the game ended by crash, disable the button if not already
            if (!gameEnded && reason !== 'cashed_out') {
                gameEnded = true;
                try {
                    await interaction.editReply({
                        content: `💥 **Crash!** The multiplier crashed at ${crashMultiplier}x.\nYou lost your bet of ${betAmount} chips.`,
                        components: getCashOutButton(true)
                    });
                } catch (err) {
                    // Message might already be updated, ignore
                }
                endGameCleanup();
            }
        });

        const multiplierInterval = setInterval(async () => {
            if (gameEnded) {
                clearInterval(multiplierInterval);
                return;
            }

            increment *= 1.05;
            currentMultiplier += increment;

            if (parseFloat(currentMultiplier.toFixed(2)) >= crashMultiplier) {
                gameEnded = true;
                clearInterval(multiplierInterval);
                collector.stop('crashed');
                try {
                    await interaction.editReply({
                        content: `💥 **Crash!** The multiplier crashed at ${crashMultiplier}x.\nYou lost your bet of ${betAmount} chips.`,
                        components: getCashOutButton(true)
                    });
                } catch (err) {
                    // Ignore if already updated
                }
                endGameCleanup();
                return;
            }

            // Update multiplier if game is still running
            try {
                await interaction.editReply({
                    content: `The multiplier is now ${currentMultiplier.toFixed(2)}x.\nClick "Cash Out" to secure your winnings!`,
                    components: getCashOutButton(false)
                });
            } catch (err) {
                // Ignore if already updated
            }
        }, 1000);
    }
};
