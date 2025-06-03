const { SlashCommandBuilder, AttachmentBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('servers')
    .setDescription('Toont een gedetailleerde lijst van servers waarin de bot zich bevindt, inclusief uitnodigingslinks.'),
  async execute(interaction) {
    const ownerId = '657984997478629400'; // Replace this with your Discord user ID

    if (interaction.user.id !== ownerId) {
      return interaction.reply({
        content: 'Je hebt geen toestemming om dit commando te gebruiken.',
        ephemeral: true,
      });
    }

    // Defer the reply to avoid timeout
    await interaction.deferReply({ ephemeral: true });

    const lines = [];

    for (const guild of interaction.client.guilds.cache.values()) {
      try {
        const channels = guild.channels.cache.filter(c =>
          c.isTextBased() &&
          c.permissionsFor(guild.members.me).has(PermissionFlagsBits.CreateInstantInvite)
        );

        let inviteLink = '❌ Geen toegestane kanalen gevonden';

        if (channels.size > 0) {
          const channel = channels.first();
          const invite = await channel.createInvite({
            maxAge: 0,
            maxUses: 0,
            reason: 'Generated via /servers command',
          });
          inviteLink = `https://discord.gg/${invite.code}`;
        }

        lines.push([
          `📌 **${guild.name}**`,
          `• ID: ${guild.id}`,
          `• Owner ID: ${guild.ownerId}`,
          `• Members: ${guild.memberCount}`,
          `• Channels: ${guild.channels.cache.size}`,
          `• Roles: ${guild.roles.cache.size}`,
          `• Created: ${guild.createdAt.toISOString().split('T')[0]}`,
          `• Invite: ${inviteLink}`,
          `-------------------------------------`
        ].join('\n'));
      } catch (err) {
        lines.push(`⚠️ Fout bij ${guild.name}: ${err.message}`);
      }
    }

    const content = lines.join('\n\n');

    try {
      if (content.length > 1900) {
        const buffer = Buffer.from(content, 'utf-8');
        const attachment = new AttachmentBuilder(buffer, { name: 'servers_with_invites.txt' });
        await interaction.user.send({ files: [attachment] });
      } else {
        await interaction.user.send({ content });
      }
      await interaction.editReply({
        content: 'Ik heb je een DM gestuurd met de serverinformatie en uitnodigingen.',
      });
    } catch (err) {
      await interaction.editReply({
        content: `Kon geen DM sturen: ${err.message}`,
      });
    }
  },
}
