const { getBalance, updateBalance } = require('./balance');

function playSlots(userId) {
    // Define symbols with probabilities and payout values
    const symbols = [
        { symbol: "🍒", probability: 0.3, payout: [1, 5, 10] },  // Cherry - common, variable payout
        { symbol: "🍋", probability: 0.25, payout: [0, 0, 15] }, // Lemon - common, rewards only for 3
        { symbol: "🍊", probability: 0.2, payout: [0, 0, 20] },  // Orange - less common, rewards only for 3
        { symbol: "⭐", probability: 0.15, payout: [0, 0, 50] },  // Star - rare, high payout for 3
        { symbol: "💎", probability: 0.05, payout: [0, 0, 100] }, // Diamond - very rare, high payout for 3
        { symbol: "BAR", probability: 0.05, payout: [0, 0, 500] } // BAR - extremely rare, highest payout for 3
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
        return symbols[symbols.length - 1].symbol; // fallback in case of rounding errors
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
    const betAmount = 50; // Cost per spin
    updateBalance(userId, -betAmount);

    // Check for payouts
    for (const { symbol, payout } of symbols) {
        const count = counts[symbol] || 0;
        if (count > 0 && payout[count - 1] > 0) { // Check if payout exists for 1, 2, or 3 occurrences
            winnings = betAmount * payout[count - 1];
            break;
        }
    }

    // Update balance and return result
    if (winnings > 0) {
        updateBalance(userId, winnings);
        return {
            display: roll.join(" "),
            message: `You won ${winnings} chips! Your balance is now ${balance + winnings - betAmount} chips.`
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
