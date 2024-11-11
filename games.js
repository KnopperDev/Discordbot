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


function playRoulette(userId, bet, choice) {
    const balance = getBalance(userId);
    if (balance < bet) {
        return "You don’t have enough chips to place this bet!";
    }

    // Deduct the bet amount
    updateBalance(userId, -bet);

    const outcomeNumber = Math.floor(Math.random() * 37); // Numbers from 0 to 36
    const outcomeColor = outcomeNumber % 2 === 0 ? "red" : "black"; // Simplified color assignment

    let winnings = 0;
    if (choice === "red" || choice === "black") {
        if (choice === outcomeColor) {
            winnings = bet * 2; // Color bet pays 2:1
        }
    } else if (parseInt(choice) === outcomeNumber) {
        winnings = bet * 35; // Exact number pays 35:1
    }

    updateBalance(userId, winnings);
    const newBalance = balance - bet + winnings;
    return `The roulette landed on ${outcomeNumber} (${outcomeColor}). You ${winnings > 0 ? 'won' : 'lost'} ${Math.abs(winnings) || bet} chips. Your new balance is ${newBalance} chips.`;
}


const activeBlackjackGames = {}; // Track active games for each user

function startBlackjack(userId) {
    const balance = getBalance(userId);
    if (balance < 100) {
        return { message: "You don't have enough chips to start a Blackjack game. (Minimum 100 chips)" };
    }

    // Deduct entry fee
    updateBalance(userId, -100);

    const playerHand = [drawCard(), drawCard()];
    const dealerHand = [drawCard(), drawCard()];

    activeBlackjackGames[userId] = {
        playerHand,
        dealerHand,
        status: 'ongoing'
    };

    return {
        message: `Your cards: ${playerHand.join(", ")}. Dealer's visible card: ${dealerHand[0]}. Type '!hit' to draw another card or '!stand' to hold.`
    };
}

// Helper function to draw a card (between 1-11)
function drawCard() {
    return Math.floor(Math.random() * 11) + 1;
}

// Helper function to calculate hand value
function calculateHand(hand) {
    return hand.reduce((total, card) => total + card, 0);
}


function hitBlackjack(userId) {
    const game = activeBlackjackGames[userId];
    if (!game || game.status !== 'ongoing') {
        return { message: "You don't have an active Blackjack game. Start a new game with !blackjack." };
    }

    // Draw a new card and add to player's hand
    const newCard = drawCard();
    game.playerHand.push(newCard);
    const playerTotal = calculateHand(game.playerHand);

    if (playerTotal > 21) {
        game.status = 'lost';
        return { message: `You drew a ${newCard}. Your total is now ${playerTotal}. You bust! Game over.` };
    } else {
        return { message: `You drew a ${newCard}. Your total is now ${playerTotal}. Type '!hit' to draw again or '!stand' to hold.` };
    }
}


function standBlackjack(userId) {
    const game = activeBlackjackGames[userId];
    if (!game || game.status !== 'ongoing') {
        return { message: "You don't have an active Blackjack game. Start a new game with !blackjack." };
    }

    const dealerHand = game.dealerHand;
    while (calculateHand(dealerHand) < 17) {
        dealerHand.push(drawCard());
    }

    const playerTotal = calculateHand(game.playerHand);
    const dealerTotal = calculateHand(dealerHand);
    game.status = 'finished';

    if (dealerTotal > 21 || playerTotal > dealerTotal) {
        const winnings = 200;
        updateBalance(userId, winnings);
        return { message: `Dealer's hand: ${dealerHand.join(", ")} (Total: ${dealerTotal}). You win! You receive ${winnings} chips.` };
    } else if (playerTotal < dealerTotal) {
        return { message: `Dealer's hand: ${dealerHand.join(", ")} (Total: ${dealerTotal}). You lose.` };
    } else {
        updateBalance(userId, 100); // refund the bet in case of a draw
        return { message: `Dealer's hand: ${dealerHand.join(", ")} (Total: ${dealerTotal}). It's a draw! You get your bet back.` };
    }
}


module.exports = {
    playSlots,
    playRoulette,
    startBlackjack,
    hitBlackjack,
    standBlackjack
};
