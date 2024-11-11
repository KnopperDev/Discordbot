const fs = require('fs');
const balances = {};
const activeGames = {};

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
    if (!balances[userId]) {
        balances[userId] = 1000;
        saveBalances();
    }
    return balances[userId];
}

function updateBalance(userId, amount) {
    getBalance(userId);
    balances[userId] += amount;
    saveBalances();
}

module.exports = {
    loadBalances,
    saveBalances,
    getBalance,
    updateBalance
};
