const { getBalance, updateBalance } = require('./balance');

function playSlots(userId, betAmount) {
    // Define symbols with adjusted probabilities and payout values
    const symbols = [
        { symbol: "🍒", probability: 0.15, payout: [1, 5, 10] },  // Cherry - reduced probability
        { symbol: "🍋", probability: 0.25, payout: [0, 0, 15] },  // Lemon - common, rewards only for 3
        { symbol: "🍊", probability: 0.2, payout: [0, 0, 20] },   // Orange - less common, rewards only for 3
        { symbol: "⭐", probability: 0.15, payout: [0, 0, 50] },   // Star - moderately rare, high payout for 3
        { symbol: "💎", probability: 0.1, payout: [0, 0, 100] },  // Diamond - rare, high payout for 3
        { symbol: "BAR", probability: 0.05, payout: [0, 0, 500] } // BAR - rare, highest payout for 3
    ];
    
    // Utility function to pick a symbol based on probability
    function pickSymbol() {
        const rand = Math.random();
        let cumulative = 0;
        for (const item of symbols) {
            cumulative += item.probability;
            if (rand < cumulative) {
                return item.symbol;
            }
        }
        return symbols[symbols.length - 1].symbol;
    }

    // Generate a roll of three random symbols based on probability
    const roll = [pickSymbol(), pickSymbol(), pickSymbol()];

    // Calculate winnings based on the rolled symbols
    let winnings = 0;
    const counts = {};

    // Count occurrences of each symbol in the roll
    roll.forEach(symbol => {
        counts[symbol] = (counts[symbol] || 0) + 1;
    });

    // Get balance and deduct the bet amount
    const balance = getBalance(userId);
    updateBalance(userId, -betAmount);

    // Check for payouts based on new pattern requirements
    for (const { symbol, payout } of symbols) {
        const count = counts[symbol] || 0;
        // 3 of the same symbol (except cherry, which also pays for 1 or 2)
        if (count === 3 && payout[2] > 0) {
            winnings = betAmount * payout[2];
            break;
        } else if (symbol === "🍒" && count > 0 && payout[count - 1] > 0) {
            winnings = betAmount * payout[count - 1];
            break;
        }
    }

    // Update balance and return result
    if (winnings > 0) {
        updateBalance(userId, winnings);
        const newBalance = getBalance(userId);
        return {
            display: roll.join(" "),
            message: `🎉 **You won \`${winnings}\` chips!**\n**New Balance:** \`${newBalance} chips\``
        };
    } else {
        const newBalance = getBalance(userId);
        return {
            display: roll.join(" "),
            message: `😢 **You lost \`${betAmount}\` chips.**\n**New Balance:** \`${newBalance} chips\``
        };
    }
}


const redNumbers = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const blackNumbers = new Set([2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35]);
const greenNumber = 0;

function playRoulette(userId, betType, betAmount) {
    const balance = getBalance(userId);

    // Check if the user has enough balance for the bet
    if (balance < betAmount) {
        return {
            error: true,
            message: `❌ You don't have enough chips to place this bet. Your balance is \`${balance}\` chips.`
        };
    }

    // Deduct the bet amount from the user's balance
    updateBalance(userId, -betAmount);

    // Generate a random spin outcome (0-36)
    const outcome = Math.floor(Math.random() * 37);

    let winnings = 0;
    let winType = null;

    // Determine winnings based on the bet type
    if (betType === 'red' || betType === 'black') {
        const isRed = redNumbers.has(outcome);
        const isBlack = blackNumbers.has(outcome);

        if ((betType === 'red' && isRed) || (betType === 'black' && isBlack)) {
            winnings = betAmount * 2;
            winType = 'color';
        }
    } else if (Number.isInteger(betType) && betType >= 0 && betType <= 36) {
        if (betType === outcome) {
            winnings = betAmount * 36;
            winType = 'number';
        }
    } else {
        return {
            error: true,
            message: '❌ Invalid bet type. Please choose "red", "black", or a number between 0 and 36.'
        };
    }

    // Update balance if the user won
    if (winnings > 0) {
        updateBalance(userId, winnings);
    }

    const newBalance = getBalance(userId);

    let outcomeEmoji = ' ';
    if (outcome === greenNumber) outcomeEmoji = '🟢';
    else if (redNumbers.has(outcome)) outcomeEmoji = '🔴';
    else if (blackNumbers.has(outcome)) outcomeEmoji = '⚫';

    let message;
    if (winnings > 0) {
        message = `🎉 **You won \`${winnings}\` chips!**\nThe ball landed on ${outcomeEmoji} \`${outcome}\`.\n**New Balance:** \`${newBalance} chips\``;
    } else {
        message = `😢 **You lost \`${betAmount}\` chips.**\nThe ball landed on ${outcomeEmoji} \`${outcome}\`.\n**New Balance:** \`${newBalance} chips\``;
    }

    return {
        error: false,
        outcome,
        winnings,
        newBalance,
        message,
        outcomeEmoji,
        winType
    };
}

module.exports = {
    playSlots,
    playRoulette,
    redNumbers, blackNumbers, greenNumber
};
