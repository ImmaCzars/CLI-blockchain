const readline = require('readline-sync');
const Blockchain = require('../wallet-cli/chain/blockchain.js');
const Transaction = require('../wallet-cli/transaction/transaction.js');
const auth = require('../wallet-cli/auth/auth.js');
const { loadUsers, saveUsers } = require('../wallet-cli/auth/auth');

const myCoin = new Blockchain();
let currentUser = null;

async function mainMenu() {
    await myCoin.updateRatesUsd() || await myCoin.updateRateIdr(); // Load rates on start

    while (true) {
        console.log('\n===== Blockchain CLI =====');
        console.log(currentUser ? `✅ Logged in as: ${currentUser.username} (Address: ${currentUser.address})` : `❌ Not logged in`);

        console.log(`
1. Login
2. Register
3. Top Up (USD → Coin)
4. Transfer
5. Swap Currency
6. Check Balance
7. Mine Block
8. View Blockchain
9. Validate Chain
10. View Transaction History
11. Logout
0. Exit
        `);

        const choice = readline.question('Enter choice: ');

        switch (choice) {
            case '1': { // Login
                const user = readline.question('Username: ');
                const pass = readline.question('Password: ', { hideEchoBack: true });
                const result = await auth.login(user, pass);
                console.log(result.message);
                if (result.success) currentUser = result.user;
                break;
            }
            case '2': { // Register
                const user = readline.question('Username: ');
                const pass = readline.question('Password: ', { hideEchoBack: true });
                const confirm = readline.question('Confirm Password: ', { hideEchoBack: true });
                const result = await auth.register(user, pass, confirm);
                console.log(result.message);
                if (result.success) currentUser = result.user;
                break;
            }
            case '3': { // Top Up
                if (!currentUser) { console.log("❌ Login first."); break; }
                await myCoin.updateRatesUsd() || await myCoin.updateRateIdr();
                const coin = readline.question('Choose coin (BTC/ETH/USDT/SOL/TRX): ').toUpperCase();
                if (!['BTC', 'ETH', 'USDT', 'SOL', 'TRX'].includes(coin)) { 
                    console.log("❌ Invalid coin."); 
                    break; 
                }
                // Ask for currency first
                let currency;
                while (true) {
                    currency = readline.question('Top up with currency (USD/IDR): ').toUpperCase();
                    if (currency === 'USD' || currency === 'IDR') break;
                    console.log("❌ Please enter USD or IDR.");
                }
                let amount, coinAmount;
                if (currency === 'USD') {
                    amount = parseFloat(readline.question('Enter amount in USD: '));
                    if (isNaN(amount) || amount <= 0) { console.log("❌ Invalid USD amount."); break; }
                    coinAmount = myCoin.convertUSDToCoin(amount, coin);
                } else { // IDR
                    amount = parseFloat(readline.question('Enter amount in IDR: '));
                    if (isNaN(amount) || amount <= 0) { console.log("❌ Invalid IDR amount."); break; }
                    if (!myCoin.rates || !myCoin.rates[coin] || !myCoin.rates[coin].IDR) { 
                        console.log("❌ Rate not available."); 
                        break; 
                    }
                    coinAmount = amount / myCoin.rates[coin].IDR;
                }
                if (isNaN(coinAmount) || coinAmount <= 0) { 
                    console.log("❌ Conversion failed. Check rates."); 
                    break; 
                }
                const users = await loadUsers();
                const idx = users.findIndex(u => u.username === currentUser.username);
                if (!users[idx].balance[coin]) users[idx].balance[coin] = 0;
                users[idx].balance[coin] += coinAmount;
                await saveUsers(users);
                currentUser = users[idx];
                console.log(`💸 Topped up ${coinAmount.toFixed(6)} ${coin}.`);
                break;
            }
            case '4': { // Transfer
                if (!currentUser) { console.log("❌ Login first."); break; }
                const toAddress = readline.question('Receiver address: ');
                const coin = readline.question('Coin (BTC/ETH/USDT): ').toUpperCase();
                const amount = parseFloat(readline.question('Amount: '));
                if (!currentUser.balance[coin] || currentUser.balance[coin] < amount) { console.log("❌ Insufficient balance."); break; }
                const users = await loadUsers();
                const recipient = users.find(u => u.address === toAddress);
                if (!recipient) { console.log("❌ Recipient not found."); break; }
                myCoin.addTransaction(new Transaction(currentUser.address, toAddress, amount, coin));
                users.find(u => u.username === currentUser.username).balance[coin] -= amount;
                if (!recipient.balance[coin]) recipient.balance[coin] = 0;
                recipient.balance[coin] += amount;
                await saveUsers(users);
                console.log(`✅ Transferred ${amount} ${coin} to ${toAddress}`);
                break;
            }
            case '5': { // Swap Currency
                if (!currentUser) { console.log("❌ Login first."); break; }
                await myCoin.updateRates();
                const fromCoin = readline.question('From (BTC/ETH/USDT): ').toUpperCase();
                const toCoin = readline.question('To (BTC/ETH/USDT): ').toUpperCase();
                const amount = parseFloat(readline.question(`Amount in ${fromCoin}: `));
                if (!currentUser.balance[fromCoin] || currentUser.balance[fromCoin] < amount) { console.log("❌ Insufficient balance."); break; }
                const converted = myCoin.swapCurrency(amount, fromCoin, toCoin);
                const users = await loadUsers();
                const idx = users.findIndex(u => u.username === currentUser.username);
                users[idx].balance[fromCoin] -= amount;
                if (!users[idx].balance[toCoin]) users[idx].balance[toCoin] = 0;
                users[idx].balance[toCoin] += converted;
                await saveUsers(users);
                currentUser = users[idx];
                console.log(`🔄 Swapped ${amount} ${fromCoin} to ${converted.toFixed(6)} ${toCoin}`);
                break;
            }
            case '6': { // Check Balance
                if (!currentUser) { console.log("❌ Login first."); break; }
                console.log(`\n💼 Address: ${currentUser.address}`);
                console.log("💰 Balances:");
                for (let c in currentUser.balance) console.log(`${c}: ${currentUser.balance[c].toFixed(6)}`);
                break;
            }
            case '7': { // Mine Block
                myCoin.minePendingTransactions();
                break;
            }
            case '8': { // View Blockchain
                console.log(JSON.stringify(myCoin.chain, null, 4));
                break;
            }
            case '9': { // Validate Chain
                console.log(`🔍 Chain valid? ${myCoin.isChainValid() ? "✅ YES" : "❌ NO"}`);
                break;
            }
            case '10': { // View Transaction History
                if (!currentUser) { console.log("❌ Login first."); break; }
                const txs = [];
                for (const block of myCoin.chain) {
                    if (!block.transactions) continue;
                    for (const tx of block.transactions) {
                        if (tx.sender === currentUser.address || tx.receiver === currentUser.address) {
                            txs.push(tx);
                        }
                    }
                }
                console.log(txs.length ? txs : "❌ No transactions found.");
                break;
            }
            case '11': { // Logout
                console.log(`👋 Logged out.`);
                currentUser = null;
                break;
            }
            case '0': { // Exit
                console.log("👋 Exiting...");
                return;
            }
            default:
                console.log("❌ Invalid choice");
        }
    }
}

mainMenu();