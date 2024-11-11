const { Client, Intents } = require('discord.js');
const { playSlots, playRoulette, startBlackjack, hitBlackjack, standBlackjack } = require('./games');
const { getBalance, updateBalance, loadBalances } = require('./balance');
const fs = require('fs');

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });
const prefix = '!';

client.on('messageCreate', async message => {
    if (!message.content.startsWith(prefix) || message.author.bot) return;
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const userId = message.author.id;

    if (command === 'balance') {
        const balance = getBalance(userId);
        message.channel.send(`${message.author}, you have ${balance} chips.`);
    } else if (command === 'slots') {
        const result = playSlots(userId);
        message.channel.send(`${message.author}, you rolled ${result.display} and ${result.message}`);
    } else if (command === 'blackjack') {
        const gameStatus = startBlackjack(userId);
        message.channel.send(gameStatus.message);
    } else if (command === 'hit') {
        const gameStatus = hitBlackjack(userId);
        message.channel.send(gameStatus.message);
    } else if (command === 'stand') {
        const gameStatus = standBlackjack(userId);
        message.channel.send(gameStatus.message);
    }
});

client.once('ready', () => {
    console.log('Casino Bot is ready!');
    loadBalances();
});

client.login('YOUR_BOT_TOKEN');
