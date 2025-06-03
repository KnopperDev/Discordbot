const fs = require('fs');
const balances = {};

function loadBalances() {
    if (fs.existsSync('balances.json')) {
        const data = fs.readFileSync('balances.json');
        Object.assign(balances, JSON.parse(data));
    }
}

function saveBalances() {
    fs.writeFileSync('balances.json', JSON.stringify(balances));
}

function getBalance(userId) {
    // Initialize new users with 1000 chips only if they don't have an existing balance
    if (!(userId in balances)) {
        balances[userId] = 5000;  // New users get 1000 chips the first time
        saveBalances();
    }
    return balances[userId];
}

function updateBalance(userId, amount) {
    if (!(userId in balances)) {
        balances[userId] = 1000;  // New users start with 1000 chips
    }
    balances[userId] += amount;

    // Prevent balance from going negative
    if (balances[userId] < 0) {
        balances[userId] = 0;
    }

    saveBalances();
}

module.exports = {
    loadBalances,
    saveBalances,
    getBalance,
    updateBalance
};
