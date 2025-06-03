const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { getBalance, updateBalance } = require('../balance');

const activeCrashGames = new Set();
const crashCooldowns = new Map();

function getCrashBar(current, steps = 10) {
    // Show a progress bar: 🟦 for current, ⬜ for future
    let visual = '';
    for (let i = 1; i <= steps; i++) {
        const threshold = 1 + (i - 1) * 1.5; // just for visual, not actual crash logic
        if (current >= threshold) visual += '🟦';
        else visual += '⬜';
    }
    return visual;
}

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

        // Cooldown check
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
                content: `❌ You don't have enough chips to place this bet. Your balance is ${balance} chips.`,
                ephemeral: true
            });
            return;
        }

        activeCrashGames.add(userId);
        updateBalance(userId, -betAmount);

        // Crash multiplier is secret until the end!
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
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('cash_out')
                        .setLabel('💰 Cash Out')
                        .setStyle(ButtonStyle.Success)
                        .setDisabled(disabled)
                )
            ];
        }

        function getCrashVisual(current) {
            let bar = getCrashBar(current);
            return `${bar}\n🟦 **Rising...**\n**Current Multiplier:** \`x${current.toFixed(2)}\`\n`;
        }

        await interaction.reply({
            content: `🎲 **Crash Casino** 🎲\n\n**Bet:** \`${betAmount} chips\`\n${getCrashVisual(currentMultiplier)}\nClick **Cash Out** before it crashes!`,
            ephemeral: true,
            components: getCashOutButton(false)
        });

        const filter = i => i.user.id === userId && i.customId === 'cash_out';
        const collector = interaction.channel.createMessageComponentCollector({ filter, max: 1 });

        function endGameCleanup() {
            activeCrashGames.delete(userId);
            crashCooldowns.set(userId, Date.now() + 1000); // 1 second cooldown
            setTimeout(() => {
                crashCooldowns.delete(userId);
            }, 1100);
        }

        collector.on('collect', async i => {
            if (gameEnded) return;
            gameEnded = true;

            const winnings = Math.floor(betAmount * currentMultiplier);
            updateBalance(userId, winnings);

            await i.update({
                content: `🎲 **Crash Casino** 🎲\n\n**Bet:** \`${betAmount} chips\`\n${getCrashBar(currentMultiplier)}\n💰 **Cashed Out!**\nYou cashed out at \`x${currentMultiplier.toFixed(2)}\`!\nIt would have crashed at \`x${crashMultiplier}\`.\n**Winnings:** \`${winnings} chips\`\n**New Balance:** \`${getBalance(userId)} chips\``,
                components: getCashOutButton(true)
            });
            clearInterval(multiplierInterval);
            collector.stop('cashed_out');
            endGameCleanup();
        });

        collector.on('end', async (collected, reason) => {
            if (!gameEnded && reason !== 'cashed_out') {
                gameEnded = true;
                try {
                    await interaction.editReply({
                        content: `🎲 **Crash Casino** 🎲\n\n**Bet:** \`${betAmount} chips\`\n${getCrashBar(crashMultiplier)}\n💥 **Crash!** The multiplier crashed at \`x${crashMultiplier}\`.\nYou lost your bet of \`${betAmount} chips\`.`,
                        components: getCashOutButton(true)
                    });
                } catch (err) {}
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
                        content: `🎲 **Crash Casino** 🎲\n\n**Bet:** \`${betAmount} chips\`\n${getCrashBar(crashMultiplier)}\n💥 **Crash!** The multiplier crashed at \`x${crashMultiplier}\`.\nYou lost your bet of \`${betAmount} chips\`.`,
                        components: getCashOutButton(true)
                    });
                } catch (err) {}
                endGameCleanup();
                return;
            }

            // Update multiplier if game is still running
            try {
                await interaction.editReply({
                    content: `🎲 **Crash Casino** 🎲\n\n**Bet:** \`${betAmount} chips\`\n${getCrashVisual(currentMultiplier)}\nClick **Cash Out** before it crashes!`,
                    components: getCashOutButton(false)
                });
            } catch (err) {}
        }, 1000);
    }
};
