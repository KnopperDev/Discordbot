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

        // Generate a random crash multiplier between 1.5x and 10x (for increased tension)
        const crashMultiplier = (Math.random() * 8.5 + 1.5).toFixed(2);
        let currentMultiplier = 1.0;
        let increment = 0.1; // Initial increment
        let cashedOut = false;

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

        // Function to update the multiplier and check for crash
        const multiplierInterval = setInterval(async () => {
            increment *= 1.05; // Gradually increase the increment to accelerate the multiplier
            currentMultiplier += increment; // Add the increment to the current multiplier

            if (parseFloat(currentMultiplier.toFixed(2)) >= parseFloat(crashMultiplier)) {
                clearInterval(multiplierInterval);

                // If the player hasn't cashed out when it crashes
                if (!cashedOut) {
                    await interaction.editReply({
                        content: `💥 **Crash!** The multiplier crashed at ${crashMultiplier}x.\nYou lost your bet of ${betAmount} chips.`,
                        components: []
                    });
                }
            } else if (!cashedOut) {
                // Update message with the current multiplier
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
        }, 1000); // Update every second

        // Button interaction collector for "Cash Out"
        const filter = i => i.user.id === userId && i.customId === 'cash_out';
        const collector = interaction.channel.createMessageComponentCollector({ filter, max: 1, time: 15000 });

        collector.on('collect', async i => {
            cashedOut = true;
            clearInterval(multiplierInterval);

            // Calculate winnings
            const winnings = Math.floor(betAmount * currentMultiplier);
            updateBalance(userId, winnings);

            await i.update({
                content: `🎉 You cashed out at ${currentMultiplier.toFixed(2)}x!\nYou won ${winnings} chips! Your balance is now ${getBalance(userId)} chips.`,
                components: []
            });
        });

        collector.on('end', collected => {
            if (collected.size === 0 && !cashedOut) {
                // Handle timeout if the user didn't click "Cash Out"
                clearInterval(multiplierInterval);
                interaction.editReply({
                    content: `Time ran out, and you didn't cash out in time! You lost ${betAmount} chips.`,
                    components: []
                });
            }
        });
    }
};
