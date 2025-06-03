const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getBalance, updateBalance } = require('../balance');

const activeMinesGames = new Set();

function calculateMinesMultiplier(gems, mines, houseEdge = 0.99) {
    let multiplier = 1;
    for (let n = 0; n < gems; n++) {
        multiplier *= (16 - n) / (16 - mines - n);
    }
    return multiplier * houseEdge;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mines')
        .setDescription('Play a Mines game!')
        .addIntegerOption(option =>
            option.setName('bet')
                .setDescription('Amount of chips to bet')
                .setRequired(true)
                .setMinValue(1)
        )
        .addIntegerOption(option =>
            option.setName('bombs')
                .setDescription('Number of bombs (1-8)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(15)
        ),

    async execute(interaction) {
        try {
            const userId = interaction.user.id;
            const betAmount = interaction.options.getInteger('bet');
            const bombCount = interaction.options.getInteger('bombs');
            const balance = getBalance(userId);

            if (activeMinesGames.has(userId)) {
                await interaction.reply({ content: '🚫 You already have an active Mines game! Finish it before starting a new one.', ephemeral: true });
                return;
            }

            if (balance < betAmount) {
                await interaction.reply({ content: `❌ You don't have enough chips to place this bet. Your balance is \`${balance}\` chips.`, ephemeral: true });
                return;
            }

            activeMinesGames.add(userId);

            // Deduct the initial bet amount
            updateBalance(userId, -betAmount);

            const gridSize = 4; // 4x4 grid for 16 tiles
            const totalTiles = gridSize * gridSize;

            let multiplier = calculateMinesMultiplier(0, bombCount);
            let gameEnded = false;
            let winnings = 0;

            // Initialize grid with 'safe' tiles
            const grid = Array(totalTiles).fill('safe');

            // Place bombs randomly
            for (let i = 0; i < bombCount; i++) {
                let pos;
                do {
                    pos = Math.floor(Math.random() * totalTiles);
                } while (grid[pos] === 'bomb');
                grid[pos] = 'bomb';
            }

            // Render grid buttons
            const renderGrid = (revealAll = false) => {
                const rows = [];
                for (let y = 0; y < gridSize; y++) {
                    const row = new ActionRowBuilder();
                    for (let x = 0; x < gridSize; x++) {
                        const index = y * gridSize + x;
                        const tileStatus = grid[index];

                        const button = new ButtonBuilder()
                            .setCustomId(`tile_${index}`);

                        if (revealAll) {
                            if (tileStatus === 'bomb') {
                                button.setLabel('💣').setStyle(ButtonStyle.Danger).setDisabled(true);
                            } else if (tileStatus === 'clicked') {
                                button.setLabel('🟩').setStyle(ButtonStyle.Success).setDisabled(true);
                            } else {
                                button.setLabel('⬜').setStyle(ButtonStyle.Secondary).setDisabled(true);
                            }
                        } else {
                            if (tileStatus === 'clicked') {
                                button.setLabel('🟩').setStyle(ButtonStyle.Success).setDisabled(true);
                            } else {
                                button.setLabel('🟦').setStyle(ButtonStyle.Primary).setDisabled(false);
                            }
                        }

                        row.addComponents(button);
                    }
                    rows.push(row);
                }

                if (!gameEnded) {
                    rows.push(new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('cash_out')
                            .setLabel('💰 Cash Out')
                            .setStyle(ButtonStyle.Success)
                    ));
                }

                return rows;
            };

            // Update multiplier and winnings based on revealed gems
            const updateMultiplierAndWinnings = () => {
                const gemsRevealed = grid.filter(tile => tile === 'clicked').length;
                multiplier = calculateMinesMultiplier(gemsRevealed, bombCount);
                winnings = Math.floor(betAmount * multiplier);
            };

            // Initial reply
            await interaction.reply({
                content: `🎰 **Mines Casino** 🎰\n\n**Bet:** \`${betAmount} chips\`\n**Bombs:** \`${bombCount}\`\n**Current Multiplier:** \`x${multiplier.toFixed(2)}\`\nClick tiles to reveal safe spots and increase your multiplier!\nOr cash out anytime to secure your winnings.`,
                components: renderGrid(),
                ephemeral: true,
                fetchReply: true
            });

            const tileFilter = i => i.user.id === userId && i.customId.startsWith('tile_');
            const collector = interaction.channel.createMessageComponentCollector({
                filter: tileFilter,
                time: 120000
            });

            collector.on('collect', async i => {
                if (gameEnded) {
                    await i.reply({ content: 'Game over! Start a new game to play again.', ephemeral: true });
                    return;
                }

                const tileIndex = parseInt(i.customId.split('_')[1]);

                if (grid[tileIndex] === 'bomb') {
                    gameEnded = true;
                    winnings = 0;
                    activeMinesGames.delete(userId);

                    await i.update({
                        content: `💥 **You hit a bomb!** Game Over.\nYou lost your bet of \`${betAmount}\` chips.`,
                        components: renderGrid(true),
                        ephemeral: true
                    });
                    collector.stop();
                } else if (grid[tileIndex] === 'clicked') {
                    await i.reply({ content: 'This tile is already revealed!', ephemeral: true });
                } else {
                    grid[tileIndex] = 'clicked';

                    updateMultiplierAndWinnings();

                    const remainingSafeTiles = grid.filter(tile => tile === 'safe').length;

                    if (remainingSafeTiles === 0) {
                        gameEnded = true;
                        updateBalance(userId, winnings);
                        activeMinesGames.delete(userId);

                        await i.update({
                            content: `🎉 **Congratulations!** You've uncovered all safe tiles!\nYou won \`${winnings}\` chips with a multiplier of \`x${multiplier.toFixed(2)}\`.\n**New Balance:** \`${getBalance(userId)} chips\``,
                            components: renderGrid(true),
                            ephemeral: true
                        });
                        collector.stop();
                        return;
                    }

                    await i.update({
                        content: `🎰 **Mines Casino** 🎰\n\n**Bet:** \`${betAmount} chips\`\n**Bombs:** \`${bombCount}\`\n**Current Multiplier:** \`x${multiplier.toFixed(2)}\`\n**Potential Winnings:** \`${winnings} chips\`\nClick tiles to increase your multiplier or **Cash Out** to secure your winnings!`,
                        components: renderGrid(),
                        ephemeral: true
                    });
                }
            });

            const cashOutFilter = i => i.user.id === userId && i.customId === 'cash_out';
            const cashOutCollector = interaction.channel.createMessageComponentCollector({ filter: cashOutFilter, max: 1, time: 120000 });

            cashOutCollector.on('collect', async i => {
                if (gameEnded) return;
                gameEnded = true;
                updateBalance(userId, winnings);
                activeMinesGames.delete(userId);

                await i.update({
                    content: `💰 **You cashed out at x${multiplier.toFixed(2)}!**\nYou won \`${winnings}\` chips.\n**New Balance:** \`${getBalance(userId)} chips\``,
                    components: renderGrid(true),
                    ephemeral: true
                });
                collector.stop();
            });

            cashOutCollector.on('end', () => {
                activeMinesGames.delete(userId);
            });

        } catch (error) {
            console.error('Error executing /mines command:', error);
            await interaction.reply({ content: 'An error occurred while executing the command.', ephemeral: true });
        }
    }
};
