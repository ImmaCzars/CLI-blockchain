const fs = require('fs');
const path = require('path');
const axios = require('axios');
const Block = require('../chain/block.js');
const Transaction = require('../transaction/transaction.js');

class Blockchain {
    constructor() {
       this.filePath = path.join(__dirname, 'blockchain.json');
       this.difficulty = 2;
       this.pendingTransactions = [];
       this.rates = {};
       this.chain = this.loadChain();
       if(this.chain.length === 0) {
            this.chain = [this.createGenesisBlock()];
       }
    }

    createGenesisBlock() {
        try {
            return new Block(Date.now().toString(), [], '0');
        } catch (error) {
            console.error('Error occurred :', error.message);
        }
    }

    saveChain(){
        const data = {
            chain: this.chain,
            pendingTransactions: this.pendingTransactions
        }
        try {
            fs.writeFileSync(this.filePath, JSON.stringify(data, null, 5));
            console.log("✅Block saved to file");
        } catch (error) {
            console.error("Error, Block didn't saved to file", error.message);
        }
    }

    loadChain(){
        try {
            if (fs.existsSync(this.filePath)) {
                const data = JSON.parse(
                    fs.readFileSync(this.filePath)
                );
                console.log("✅Chain loaded from file");
                this.pendingTransactions = data.pendingTransactions || [];
                return data.chain || [];
            }
            return [];
        } catch (error) {
            console.error('Error occurred : ', error.message);
            // this.pendingTransactions = data.pendingTransactions || []; /* fallback */
        }
    }

    async updateRatesUsd () {
        try {
            const url = "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether,solana,pepe,tron&vs_currencies=usd"
            const response = await axios.get(url);
            this.rates = {
                BTC : {USD : response.data.bitcoin.usd},
                ETH : {USD : response.data.ethereum.usd},
                USDT : {USD : response.data.tether.usd},
                SOL : {USD : response.data.solana.usd},
                TRX : {USD : response.data.tron.usd},
                PEPE : {USD : response.data.pepe.usd},
            }
            console.log("✔️ Rates updated: ", this.rates);
        } catch(error) {
            console.error("❌Failed to fetch rates: ", error.message);
        }
    }

    async updateRateIdr () {
        try {
            const url = "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether,solana,pepe,tron&vs_currencies=idr"
            const response = await axios.get(url);
            this.rates = {
                BTC : {IDR : response.data.bitcoin.idr},
                ETH : {IDR : response.data.ethereum.idr},
                USDT : {IDR : response.data.tether.idr},
                SOL : {IDR : response.data.solana.idr},
                TRX : {IDR : response.data.tron.idr},
                PEPE : {IDR : response.data.pepe.idr},
            }
            console.log("✔️ Rates updated: ", this.rates);
        } catch (error) {
            console.error("❌Failed to fetch rates: ", error.message);
        }
    }

    getLatestBlock() {
        try {
            return this.chain[this.chain.length - 1];
        } catch (error) {
            console.error("failed to get latest block", error.message);
        }
    }

    addTransaction(transaction){
        try {
            if(!transaction.sender || !transaction.reciever || !transaction.amount || !transaction.coin){
                throw new Error("❌Invalid transaction data");
            }   
            this.pendingTransactions.push(transaction);
            this.saveChain();
        } catch (error) {
            console.error("Error occurred :", error.message);
        }
    }

    async minePendingTransaction() {
        if(this.pendingTransactions.length === 0 ) {
            console.log("No transactions to mine. ");
            return;
        }
        try {
             const block = new Block(Date.now().toString(), this.pendingTransactions, this.getLatestBlock().hash);
             block.mineBlock(this.difficulty);
             this.chain.push(block);
             this.pendingTransactions = [];
             console.log("✅Block mined and added to chain");
             this.saveChain();
        } catch (error) {
            console.error("Error failed to mine transaction :", error.message);
            this.pendingTransactions = [];  //callback
        }
    }
    
    async isChainValid() {
        for (let i = 1; i < this.chain.length; i++) {
            const current = this.chain[i];
            const prev = this.chain[i - 1];
            if(current.hash !== this.calculateHashFromObject(current)) return false;
            if(current.previousHash !== prev.hash) return false;
        }
        return false;
    }

    async calculateHashFromObject(block) {
        const data = await block.previousHash + block.timestamp + JSON.stringify(block.transaction) + block.nonce;
        return require('crypto').createHash('sha256').update(data).digest('hex');
    }

    async balanceOfAddress()  {
       try {
            let balance = 0 ;
            for await (const block of this.chain) {
                if(!block.transaction) continue;
                for await (const tx of block.transaction) {
                    if(tx.sender === address ) balance -= tx.amount;
                    if(tx.reciever === address ) balance -= tx.amount;
                }
            }
        return balance;
       } catch (error) {
            console.error("Error occurred : ", error.message);
       }
    }

    convertUSDToCoin(usdAmount, coinType = "BTC" ) {
        if(!this.rates[coinType]) throw new Error("Rates are not available. Update rates first.");
        return usdAmount / this.rates[coinType].USD;
    } 
    convertIDRToCoin(idrAmount, coinType = "BTC" ) {
           if(!this.rates[coinType]) throw new Error("Rates are not available. Update rates first.");
        return idrAmount / this.rates[coinType].IDR;
    } 

    swapCurrency(amount, fromCoin, toCoin) {
        if(!this.rates[fromCoin] || !this.rates[toCoin]) {
            throw new Error("Rates are not available. Update rates first. ");
        }
        const usdValue = amount * this.rates[fromCoin].USD;
        const idrValue = amount * this.rates[fromCoin].IDR;

        return usdValue / this.rates[toCoin].USD || idrValue / this.rates[toCoin].IDR;
    }

    
}


module.exports = Blockchain;
