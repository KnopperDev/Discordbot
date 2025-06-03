const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { getBalance, updateBalance } = require('../balance');

const gameStates = {}; // userId: { bet, step, multiplier, active, bombMap, risk }

function getBombChance(step, risk) {
    if (risk === 'easy')    return 0.05 + (step * 0.03);
    if (risk === 'normal')  return 0.10 + (step * 0.05);
    if (risk === 'hard')    return 0.20 + (step * 0.08);
}

function getMultiplier(step, risk) {
    if (risk === 'easy')    return Number((Math.pow(1.3, step)).toFixed(2));
    if (risk === 'normal')  return Number((Math.pow(1.5, step)).toFixed(2));
    if (risk === 'hard')    return Number((Math.pow(1.9, step)).toFixed(2));
}

function makeBombMap(fieldsCount, risk) {
    const bombMap = [];
    for (let i = 0; i < fieldsCount; i++) {
        if (i === 0) {
            bombMap.push(false);
        } else {
            bombMap.push(Math.random() < getBombChance(i, risk));
        }
    }
    return bombMap;
}

// Field visualization with bomb percentage only on the next clickable tile
function getFieldVisual(step, totalFields, bombed, cashedOut, risk) {
    let fields = '';
    for (let i = 0; i < totalFields; i++) {
        let emoji;
        if (bombed && i === step) emoji = '💥';
        else if (cashedOut && i === step) emoji = '💰';
        else if (i < step) emoji = '🟩';
        else if (i === step) emoji = '🟦';
        else emoji = '⬜';

        // Show bomb % only on the next clickable field (current step)
        if (i === step && !bombed && !cashedOut) {
            const percent = Math.round(getBombChance(i, risk) * 100);
            fields += `${emoji}\`F${i + 1} (${percent}%)\` `;
        } else {
            fields += `${emoji}\`F${i + 1}\` `;
        }
    }
    return fields;
}

function makeFieldButtons(currentStep, totalFields, bombed, cashedOut) {
    return [
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`field_${currentStep}`)
                    .setLabel(`Field ${currentStep + 1}`)
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(bombed || cashedOut),
                new ButtonBuilder()
                    .setCustomId('cashout')
                    .setLabel('💰 Cash Out')
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(bombed || cashedOut)
            )
    ];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('crossyroad')
        .setDescription('Play a Crossy Road casino game!')
        .addIntegerOption(option =>
            option.setName('bet')
                .setDescription('Amount of chips to bet')
                .setRequired(true)
                .setMinValue(1)
        )
        .addStringOption(option =>
            option.setName('risk')
                .setDescription('Choose your risk level')
                .setRequired(true)
                .addChoices(
                    { name: '🟢 Easy', value: 'easy' },
                    { name: '🟡 Normal', value: 'normal' },
                    { name: '🔴 Hard', value: 'hard' },
                )
        ),

    async execute(interaction) {
        const userId = interaction.user.id;
        const bet = interaction.options.getInteger('bet');
        const risk = interaction.options.getString('risk');
        const balance = getBalance(userId);

        if (balance < bet) {
            await interaction.reply({ content: `❌ You don't have enough chips. Balance: ${balance}`, ephemeral: true });
            return;
        }

        updateBalance(userId, -bet);

        // Game setup
        const totalFields = 8; // You can change this!
        const bombMap = makeBombMap(totalFields, risk);
        gameStates[userId] = {
            bet,
            step: 0,
            multiplier: 1.0,
            active: true,
            bombMap,
            risk
        };

        await interaction.reply({
            content: `🎰 **Crossy Road Casino** 🎰\n\n**Bet:** \`${bet} chips\`\n**Risk:** \`${risk.charAt(0).toUpperCase() + risk.slice(1)}\`\n${getFieldVisual(0, totalFields, false, false, risk)}\n\nSelect Field 1 to start, or Cash Out anytime!\n**Multiplier:** \`x1.0\``,
            components: makeFieldButtons(0, totalFields, false, false),
            ephemeral: true
        });

        const msg = await interaction.fetchReply();

        const collector = msg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 120000, // 2 mins
            filter: i => i.user.id === userId
        });

        collector.on('collect', async (btnInt) => {
            const state = gameStates[userId];
            if (!state || !state.active) {
                await btnInt.reply({ content: 'Game has ended or expired.', ephemeral: true });
                return;
            }

            if (btnInt.customId === 'cashout') {
                state.active = false;
                const winnings = Math.floor(state.bet * state.multiplier);
                updateBalance(userId, winnings);
                await btnInt.update({
                    content: `💰 **You cashed out!**\n**Winnings:** \`${winnings} chips\`\n**Final Multiplier:** \`x${state.multiplier}\`\n${getFieldVisual(state.step, totalFields, false, true, state.risk)}`,
                    components: makeFieldButtons(state.step, totalFields, false, true)
                });
                collector.stop();
                return;
            }

            // Field selection
            const fieldIdx = parseInt(btnInt.customId.split('_')[1]);
            if (fieldIdx !== state.step) {
                await btnInt.reply({ content: `You must select the next field in order!`, ephemeral: true });
                return;
            }

            // Check for bomb
            if (state.bombMap[fieldIdx]) {
                state.active = false;
                await btnInt.update({
                    content: `💥 **Bomb! You lost your bet.**\nYou reached Field ${fieldIdx + 1}.\n**Final Multiplier:** \`x${state.multiplier}\`\n${getFieldVisual(state.step, totalFields, true, false, state.risk)}`,
                    components: makeFieldButtons(state.step, totalFields, true, false)
                });
                collector.stop();
                return;
            }

            // Safe step, advance
            state.step++;
            state.multiplier = getMultiplier(state.step, state.risk);

            if (state.step >= totalFields) {
                // Player reached end, auto cash out
                state.active = false;
                const winnings = Math.floor(state.bet * state.multiplier);
                updateBalance(userId, winnings);
                await btnInt.update({
                    content: `🏆 **You crossed all fields!**\n**Winnings:** \`${winnings} chips\`\n**Final Multiplier:** \`x${state.multiplier}\`\n${getFieldVisual(state.step - 1, totalFields, false, true, state.risk)}`,
                    components: makeFieldButtons(state.step - 1, totalFields, false, true)
                });
                collector.stop();
                return;
            }

            await btnInt.update({
                content: `✅ **Safe!**\nNow at Field ${state.step + 1}.\n**Current Multiplier:** \`x${state.multiplier}\`\n${getFieldVisual(state.step, totalFields, false, false, state.risk)}\n\nSelect the next field or Cash Out!`,
                components: makeFieldButtons(state.step, totalFields, false, false)
            });
        });

        collector.on('end', (_, reason) => {
            const state = gameStates[userId];
            if (state && state.active) {
                state.active = false;
                interaction.editReply({
                    content: `⏰ Game expired!`,
                    components: []
                });
            }
        });
    }
};
