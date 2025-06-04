const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('balancetop')
        .setDescription('Display the top 10 users with the highest balances'),

    async execute(interaction) {
        try {
            await interaction.deferReply();

            // Load balances from file
            const balancesPath = path.join(__dirname, '..', 'balances.json');
            let balances = {};
            if (fs.existsSync(balancesPath)) {
                balances = JSON.parse(fs.readFileSync(balancesPath, 'utf8'));
            }

            // Get top 10 balances
            const sorted = Object.entries(balances)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10);

            if (sorted.length === 0) {
                return await interaction.editReply('No users found with balances.');
            }

            // No full fetch! Just try cache, then fallback to user tag or ID
            const leaderboard = await Promise.all(sorted.map(async ([userId, balance], idx) => {
                let displayName = 'Unknown User';
                const member = interaction.guild.members.cache.get(userId);
                if (member) {
                    displayName = member.displayName;
                } else {
                    try {
                        const user = await interaction.client.users.fetch(userId);
                        if (user) displayName = user.tag;
                    } catch {
                        displayName = userId; // fallback to userId
                    }
                }
                return `**${idx + 1}. ${displayName}** — \`${balance}\` chips`;
            }));

            await interaction.editReply(`🏆 **Top 10 Users by Balance:**\n\n${leaderboard.join('\n')}`);
        } catch (error) {
            console.error('Error in /balancetop:', error);
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply('❌ Something went wrong while fetching the balance leaderboard.');
            } else {
                await interaction.reply({ content: '❌ Something went wrong while fetching the balance leaderboard.', ephemeral: true });
            }
        }
    }
};
