const { SlashCommandBuilder } = require('discord.js');
const { balances, loadBalances } = require('../balance');

loadBalances();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('balancetop')
        .setDescription('Shows the top 10 users with the highest balance.'),

    async execute(interaction) {
        // Defer the reply to avoid interaction timeout
        await interaction.deferReply();

        const sorted = Object.entries(balances)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10);

        if (sorted.length === 0) {
            return interaction.editReply("No balances found.");
        }

        let leaderboard = "**🏆 Top 10 Balances 🏆**\n\n";

        for (let i = 0; i < sorted.length; i++) {
            const [userId, balance] = sorted[i];
            const user = await interaction.client.users.fetch(userId).catch(() => null);
            const username = user ? user.tag : `Unknown User (${userId})`;

            leaderboard += `**#${i + 1}** - ${username}: ${balance} chips\n`;
        }

        // Edit the deferred reply
        await interaction.editReply({ content: leaderboard });
    }
};
