const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getBalance, updateBalance } = require('../balance');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dragontower')
        .setDescription('Play Dragon Tower visually!')
        .addIntegerOption(option =>
            option.setName('bet')
                .setDescription('Amount to bet')
                .setRequired(true)
                .setMinValue(1)
        )
        .addStringOption(option =>
            option.setName('risk')
                .setDescription('Risk level')
                .setRequired(true)
                .addChoices(
                    { name: 'Easy', value: 'easy' },
                    { name: 'Medium', value: 'medium' },
                    { name: 'Hard', value: 'hard' }
                )
        ),

    async execute(interaction) {
        const bet = interaction.options.getInteger('bet');
        const risk = interaction.options.getString('risk');
        const userId = interaction.user.id;

        const balance = getBalance(userId);
        if (balance < bet) {
            await interaction.reply({ content: `❌ You don't have enough chips. Balance: ${balance}`, ephemeral: true });
            return;
        }

        updateBalance(userId, -bet); // Hold the bet

        const dragonChanceMap = { easy: 0.33, medium: 0.5, hard: 0.66 };
        const winningsMultiplierMap = { easy: 0.5, medium: 1.0, hard: 2.0 }; // Per-level multiplier

        const dragonChance = dragonChanceMap[risk];
        const perLevelMultiplier = winningsMultiplierMap[risk];

        const maxLevels = 4;
        let tower = Array.from({ length: maxLevels }, () => ['⬜', '⬜', '⬜']);
        let level = 0;
        let winnings = 0;
        let cashedOut = false;
        let currentMultiplier = 0;

        const buildTowerMessage = (highlightLevel = null) => {
            return tower
                .map((row, i) => {
                    return new ActionRowBuilder().addComponents(
                        row.map((tile, j) => {
                            const disabled = i !== highlightLevel || tile !== '⬜';
                            let style = ButtonStyle.Secondary;
                            if (tile === '✅') style = ButtonStyle.Success;
                            if (tile === '💣') style = ButtonStyle.Danger;

                            return new ButtonBuilder()
                                .setCustomId(`tile_${i}_${j}`)
                                .setLabel(tile)
                                .setStyle(style)
                                .setDisabled(disabled);
                        })
                    );
                })
                .reverse();
        };

        const updateLevel = async () => {
            if (level >= maxLevels) {
                updateBalance(userId, bet + winnings);
                await interaction.editReply({
                    content: `🎉 You reached the top!\nYou won **${Math.round(bet + winnings)} chips**! (Multiplier: x${(1 + currentMultiplier).toFixed(2)})`,
                    components: buildTowerMessage()
                });
                return;
            }

            const components = [...buildTowerMessage(level)];

            // Add cashout button if not first level
            if (level > 0) {
                components.push(new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('cashout')
                        .setLabel(`💰 Cash Out (x${(1 + currentMultiplier).toFixed(2)} = ${Math.round(bet + winnings)} chips)`)
                        .setStyle(ButtonStyle.Success)
                ));
            }

            await interaction.editReply({
                content: `🗼 Level ${level + 1} — Choose a tile!\nCurrent Multiplier: x${(1 + currentMultiplier).toFixed(2)}\nPotential Cashout: **${Math.round(bet + winnings)} chips**`,
                components
            });

            const filter = i => i.user.id === userId;
            const collector = interaction.channel.createMessageComponentCollector({ filter, time: 20000 });

            collector.on('collect', async btn => {
                if (btn.customId === 'cashout') {
                    cashedOut = true;
                    await btn.deferUpdate();
                    updateBalance(userId, bet + winnings);
                    await interaction.editReply({
                        content: `💰 You cashed out with **${Math.round(bet + winnings)} chips**! (Multiplier: x${(1 + currentMultiplier).toFixed(2)})`,
                        components: buildTowerMessage()
                    });
                    collector.stop();
                    return;
                }

                const parts = btn.customId.split("_");
                if (parts.length !== 3 || parts[0] !== "tile") {
                    await btn.reply({
                        content: "❌ Invalid tile interaction.",
                        ephemeral: true,
                    });
                    return;
                }

                const levelClicked = parseInt(parts[1]);
                const tileIndex = parseInt(parts[2]);

                if (levelClicked !== level || isNaN(tileIndex)) {
                    await btn.reply({
                        content: "❌ Invalid tile selected.",
                        ephemeral: true,
                    });
                    return;
                }

                await btn.deferUpdate();

                const dragonTile = Math.floor(Math.random() * 3);
                const isDragon = Math.random() < dragonChance && tileIndex === dragonTile;

                if (isDragon) {
                    tower[level][tileIndex] = '💣';
                    await interaction.editReply({
                        content: `💥 You hit a dragon on level ${level + 1}! You lost **${bet} chips**.`,
                        components: buildTowerMessage()
                    });
                    collector.stop();
                    return;
                } else {
                    tower[level][tileIndex] = '✅';
                    winnings += bet * perLevelMultiplier;
                    currentMultiplier += perLevelMultiplier;
                    level++;
                    updateLevel();
                    collector.stop();
                }
            });

            collector.on('end', c => {
                if (c.size === 0 && !cashedOut) {
                    interaction.editReply({ content: `⌛ You didn't pick in time. Game over.`, components: [] });
                }
            });
        };

        await interaction.reply({ content: '🧱 Setting up your tower...', components: [] });
        updateLevel();
    }
}
