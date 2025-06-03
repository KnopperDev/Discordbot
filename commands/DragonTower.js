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
                    { name: '🟢 Easy', value: 'easy' },
                    { name: '🟡 Medium', value: 'medium' },
                    { name: '🔴 Hard', value: 'hard' }
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

        // Visualize the tower as text for a casino feel
        function getTowerVisual(tower, currentLevel, bombed, cashedOut) {
            let visual = '';
            for (let i = tower.length - 1; i >= 0; i--) {
                for (let j = 0; j < 3; j++) {
                    let tile = tower[i][j];
                    if (tile === '✅') visual += '🟩';
                    else if (tile === '💣') visual += '💥';
                    else if (i === currentLevel && !bombed && !cashedOut) visual += '🟦';
                    else visual += '⬜';
                }
                visual += `  Level ${i + 1}\n`;
            }
            return visual;
        }

        const buildTowerButtons = (highlightLevel = null, bombed = false, cashedOut = false) => {
            // Only current level is enabled, others are disabled
            return [
                new ActionRowBuilder().addComponents(
                    [0, 1, 2].map(j => {
                        let style = ButtonStyle.Secondary;
                        let label = '⬜';
                        if (tower[highlightLevel][j] === '✅') {
                            style = ButtonStyle.Success;
                            label = '🟩';
                        } else if (tower[highlightLevel][j] === '💣') {
                            style = ButtonStyle.Danger;
                            label = '💥';
                        } else if (highlightLevel === level && !bombed && !cashedOut) {
                            style = ButtonStyle.Primary;
                            label = '🟦';
                        }
                        return new ButtonBuilder()
                            .setCustomId(`tile_${highlightLevel}_${j}`)
                            .setLabel(label)
                            .setStyle(style)
                            .setDisabled(bombed || cashedOut || highlightLevel !== level || tower[highlightLevel][j] !== '⬜');
                    })
                )
            ];
        };

        const buildCashoutButton = (disabled = false) => {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('cashout')
                    .setLabel(`💰 Cash Out (x${(1 + currentMultiplier).toFixed(2)} = ${Math.round(bet + winnings)} chips)`)
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(disabled)
            );
        };

        const updateLevel = async (bombed = false) => {
            let content;
            if (bombed) {
                content = `🐲 **Dragon Tower** 🐲\n\n${getTowerVisual(tower, level, true, false)}\n💥 You hit a dragon on level ${level + 1}! You lost **${bet} chips**.`;
            } else if (cashedOut) {
                content = `🐲 **Dragon Tower** 🐲\n\n${getTowerVisual(tower, level, false, true)}\n💰 You cashed out with **${Math.round(bet + winnings)} chips**! (Multiplier: x${(1 + currentMultiplier).toFixed(2)})`;
            } else if (level >= maxLevels) {
                updateBalance(userId, bet + winnings);
                content = `🐲 **Dragon Tower** 🐲\n\n${getTowerVisual(tower, level - 1, false, true)}\n🎉 You reached the top!\nYou won **${Math.round(bet + winnings)} chips**! (Multiplier: x${(1 + currentMultiplier).toFixed(2)})`;
            } else {
                const percent = Math.round(dragonChance * 100);
                content = `🐲 **Dragon Tower** 🐲\n\n**Bet:** \`${bet} chips\` | **Risk:** \`${risk.charAt(0).toUpperCase() + risk.slice(1)}\`\n${getTowerVisual(tower, level, false, false)}\n🗼 **Level ${level + 1}** — Choose a tile!\n**Dragon chance this row:** \`${percent}%\`\n**Current Multiplier:** \`x${(1 + currentMultiplier).toFixed(2)}\`\n**Potential Cashout:** \`${Math.round(bet + winnings)} chips\``;
            }

            let components = [];
            if (!bombed && !cashedOut && level < maxLevels) {
                components = buildTowerButtons(level);
                if (level > 0) components.push(buildCashoutButton());
            } else if (cashedOut && level > 0) {
                components = buildTowerButtons(level - 1, false, true);
            } else if (bombed && level > 0) {
                components = buildTowerButtons(level, true, false);
            }

            await interaction.editReply({
                content,
                components
            });
        };

        await interaction.reply({ content: '🧱 Setting up your tower...', ephemeral: true, components: [] });
        updateLevel();

        const filter = i => i.user.id === userId;
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 20000 });

        collector.on('collect', async btn => {
            if (cashedOut) return;
            if (btn.customId === 'cashout') {
                cashedOut = true;
                await btn.deferUpdate();
                updateBalance(userId, bet + winnings);
                await updateLevel(false, true);
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

            // Only one dragon per row, but only if the random chance triggers
            const dragonTile = Math.floor(Math.random() * 3);
            const isDragon = Math.random() < dragonChance && tileIndex === dragonTile;

            if (isDragon) {
                tower[level][tileIndex] = '💣';
                await updateLevel(true);
                collector.stop();
                return;
            } else {
                tower[level][tileIndex] = '✅';
                winnings += bet * perLevelMultiplier;
                currentMultiplier += perLevelMultiplier;
                level++;
                await updateLevel();
                if (level >= maxLevels) collector.stop();
            }
        });

        collector.on('end', c => {
            if (c.size === 0 && !cashedOut && level < maxLevels) {
                interaction.editReply({ content: `⌛ You didn't pick in time. Game over.`, components: [] });
            }
        });
    }
};
