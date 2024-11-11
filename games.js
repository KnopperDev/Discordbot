// Contains logic for each game
const { getBalance, updateBalance } = require('./balance');

function playSlots(userId) {
    const symbols = ["🍒", "🍋", "🍊", "🍉", "⭐", "💎"];
    const roll = [
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
    ];

    const balance = getBalance(userId);
    const betAmount = 50; // cost per spin
    updateBalance(userId, -betAmount);

    // Check if all three symbols match
    if (roll[0] === roll[1] && roll[1] === roll[2]) {
        const winnings = 500;
        updateBalance(userId, winnings);
        return {
            display: roll.join(" "),
            message: `Jackpot! You won ${winnings} chips! Your balance is now ${balance + winnings - betAmount} chips.`
        };
    } else {
        return {
            display: roll.join(" "),
            message: `You lost ${betAmount} chips. Your balance is now ${balance - betAmount} chips.`
        };
    }
}

module.exports = {
    playSlots
};
