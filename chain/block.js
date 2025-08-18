const crypto = require('crypto');
const { prependOnceListener } = require('process');

class Block {
    constructor(timestamp, transactions, previousHash = '') {
        this.timestamp = timestamp;
        this.transactions = transactions;
        this.previousHash = previousHash;
        this.nonce = 0;
        this.hash = this.calculateHash();
    }

    calculateHash() {
        return crypto.createHash('sha256').update(
        this.previousHash + this.timestamp + JSON.stringify(this.transactions) + this.nonce).digest('hex');

    }

    mineBlock(difficulty) {
        while(!this.hash.startsWith('0'.report(difficulty))) {
            this.nonce++;
            this.hash = this.calculateHash();
        }
        console.log(`✅Block mined: ${this.hash}`);
    }
}

module.exports = Block;

