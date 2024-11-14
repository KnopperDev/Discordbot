const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getBalance, updateBalance } = require('../balance');

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
                .setDescription('Number of bombs (1-15)')
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

            if (balance < betAmount) {
                await interaction.reply({ content: `You don't have enough chips to place this bet. Your balance is ${balance} chips.`, ephemeral: true });
                return;
            }

            // Deduct the initial bet amount only once
            updateBalance(userId, -betAmount);

            const gridSize = 4;
            let baseMultiplier = 1 + bombCount * 0.15; // Higher base multiplier for more bombs
            let multiplier = baseMultiplier;
            let gameEnded = false;
            let winnings = 0;

            const grid = Array(gridSize * gridSize).fill('safe');
            for (let i = 0; i < bombCount; i++) {
                let pos;
                do {
                    pos = Math.floor(Math.random() * gridSize * gridSize);
                } while (grid[pos] === 'bomb');
                grid[pos] = 'bomb';
            }

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
                                button.setLabel('✅').setStyle(ButtonStyle.Success).setDisabled(true);
                            } else {
                                button.setLabel('⬜').setStyle(ButtonStyle.Secondary).setDisabled(true);
                            }
                        } else {
                            if (tileStatus === 'clicked') {
                                button.setLabel('✅').setStyle(ButtonStyle.Success).setDisabled(true);
                            } else {
                                button.setLabel('⬜').setStyle(ButtonStyle.Secondary).setDisabled(false);
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
                            .setLabel('Cash Out')
                            .setStyle(ButtonStyle.Success)
                    ));
                }

                return rows;
            };

            const message = await interaction.reply({
                content: `🎰 **Mines Game** 🎰\nBet: ${betAmount} chips\nBombs: ${bombCount}\nCurrent Multiplier: x${multiplier.toFixed(2)}\nClick tiles to increase your multiplier!`,
                components: renderGrid(),
                ephemeral: true,
                fetchReply: true
            });

            const collector = interaction.channel.createMessageComponentCollector({
                filter: i => i.user.id === userId && i.customId.startsWith('tile_')
            });

            collector.on('collect', async i => {
                const tileIndex = parseInt(i.customId.split('_')[1]);

                if (grid[tileIndex] === 'bomb') {
                    gameEnded = true;
                    winnings = 0;

                    await i.update({
                        content: `💥 **You hit a bomb!** Game Over.\nYou lost your bet of ${betAmount} chips.`,
                        components: renderGrid(true),
                        ephemeral: true
                    });
                    collector.stop();
                } else {
                    grid[tileIndex] = 'clicked';

                    const remainingSafeTiles = grid.filter(tile => tile === 'safe').length;
                    const revealedTiles = gridSize * gridSize - remainingSafeTiles - bombCount;

                    // Exponentially scale multiplier based on bombs and revealed safe tiles
                    const scaleFactor = 0.1 + (bombCount / (gridSize * gridSize)) * 0.25;
                    multiplier = baseMultiplier + revealedTiles * scaleFactor * Math.pow(1.1, revealedTiles);
                    winnings = Math.floor(betAmount * multiplier);

                    if (remainingSafeTiles === 0) {
                        gameEnded = true;
                        updateBalance(userId, winnings);

                        await i.update({
                            content: `🎉 **Congratulations!** You've uncovered all safe tiles!\nYou won ${winnings} chips with a multiplier of x${multiplier.toFixed(2)}.\nYour balance is now ${getBalance(userId)} chips.`,
                            components: renderGrid(true),
                            ephemeral: true
                        });
                        collector.stop();
                        return;
                    }

                    await i.update({
                        content: `🎰 **Mines Game** 🎰\nCurrent Multiplier: x${multiplier.toFixed(2)}\nPotential Winnings: ${winnings} chips\nClick "Cash Out" to secure your winnings!`,
                        components: renderGrid(),
                        ephemeral: true
                    });
                }
            });

            const cashOutFilter = i => i.user.id === userId && i.customId === 'cash_out';
            const cashOutCollector = interaction.channel.createMessageComponentCollector({ filter: cashOutFilter, max: 1 });

            cashOutCollector.on('collect', async i => {
                if (gameEnded) return;
                gameEnded = true;
                updateBalance(userId, winnings);

                await i.update({
                    content: `💰 You cashed out at x${multiplier.toFixed(2)}! You won ${winnings} chips. Your balance is now ${getBalance(userId)} chips.`,
                    components: renderGrid(true),
                    ephemeral: true
                });
                collector.stop();
            });

        } catch (error) {
            console.error('Error executing /mines command:', error);
            await interaction.reply({ content: 'An error occurred while executing the command.', ephemeral: true });
        }
    }
};
