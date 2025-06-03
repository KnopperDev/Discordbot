const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getBalance, updateBalance } = require('../balance');

const activeGames = new Map(); // Map to keep track of active games by user ID

module.exports = {
    data: new SlashCommandBuilder()
        .setName('higherorlower')
        .setDescription('Play a Higher or Lower game!')
        .addIntegerOption(option => 
            option.setName('bet')
            .setDescription('Amount of chips to bet')
            .setRequired(true)
            .setMinValue(1)
        ),
    
    async execute(interaction) {
        const userId = interaction.user.id;
        const userName = interaction.user.username;

        // Check if a game is already active for this user
        if (activeGames.has(userId)) {
            await interaction.reply({ content: '🚫 You already have an active game! Finish it before starting a new one.', ephemeral: true });
            return;
        }

        const betAmount = interaction.options.getInteger('bet');
        let balance = getBalance(userId);

        // Check if the user has enough balance for the bet
        if (balance < betAmount) {
            await interaction.reply({ content: `❌ You don't have enough chips to place this bet. Your balance is \`${balance}\` chips.`, ephemeral: true });
            return;
        }

        // Mark the game as active for the user
        activeGames.set(userId, true);

        // Deduct the bet amount from the user's balance
        updateBalance(userId, -betAmount);
        balance = getBalance(userId);

        // Generate the initial random number between 1 and 100
        let currentNumber = Math.floor(Math.random() * 100) + 1;

        let remainingTime = 15; // Time in seconds

        // Casino-style visual for the number
        function getNumberVisual(num) {
            return `🟦 \`Current: ${num}\``;
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('higher')
                .setLabel('Higher')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('lower')
                .setLabel('Lower')
                .setStyle(ButtonStyle.Primary)
        );

        await interaction.reply({
            content: `🎲 **Higher or Lower** 🎲\n\n**Bet:** \`${betAmount} chips\`\n${getNumberVisual(currentNumber)}\nWill the next number be **Higher** or **Lower**?\n⏳ Time remaining: \`${remainingTime}\` seconds`,
            ephemeral: true,
            components: [row]
        });

        // Update the countdown every second
        const countdownInterval = setInterval(async () => {
            remainingTime--;
            if (remainingTime > 0) {
                try {
                    await interaction.editReply({
                        content: `🎲 **Higher or Lower** 🎲\n\n**Bet:** \`${betAmount} chips\`\n${getNumberVisual(currentNumber)}\nWill the next number be **Higher** or **Lower**?\n⏳ Time remaining: \`${remainingTime}\` seconds`
                    });
                } catch (e) {}
            }
        }, 1000);

        // Set up a message collector to handle the user's choice
        const filter = i => i.user.id === userId;
        const collector = interaction.channel.createMessageComponentCollector({ filter, max: 1, time: 15000 });

        collector.on('collect', async i => {
            clearInterval(countdownInterval); // Stop the countdown when user makes a choice
            activeGames.delete(userId); // Remove user from active games

            const guess = i.customId;
            
            // Generate a new random number that is not equal to currentNumber
            let nextNumber;
            do {
                nextNumber = Math.floor(Math.random() * 100) + 1;
            } while (nextNumber === currentNumber);

            let resultMessage = `🎲 **Higher or Lower** 🎲\n\n**Bet:** \`${betAmount} chips\`\n${getNumberVisual(currentNumber)}\n**Your Guess:** \`${guess.charAt(0).toUpperCase() + guess.slice(1)}\`\n**Next Number:** 🟦 \`${nextNumber}\`\n\n`;
            let won = false;

            if ((guess === 'higher' && nextNumber > currentNumber) || (guess === 'lower' && nextNumber < currentNumber)) {
                won = true;
            }

            if (won) {
                const winnings = betAmount * 2;
                updateBalance(userId, winnings);
                balance = getBalance(userId);
                resultMessage += `🟩 **You guessed correctly and won \`${winnings}\` chips!**\n**New Balance:** \`${balance} chips\``;
            } else {
                resultMessage += `😢 **You guessed incorrectly and lost \`${betAmount}\` chips.**\n**New Balance:** \`${balance} chips\``;
            }

            // Reply with the result message
            await i.update({ content: resultMessage, components: [] });
        });

        collector.on('end', collected => {
            clearInterval(countdownInterval); // Stop countdown when time runs out
            activeGames.delete(userId); // Remove user from active games if time ran out
            if (collected.size === 0) {
                interaction.editReply({ content: '⌛ **Time ran out!** No guess was made, you lost your bet.', components: [] });
            }
        });
    }
};
