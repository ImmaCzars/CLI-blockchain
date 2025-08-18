class Transaction {
    constructor(sender, receiver, amount, coin) {
        this.sender = sender;
        this.receiver = receiver;
        this.amount = amount;
        this.coin = coin;
        this.timestamp = new Date().toLocaleDateString();

    }
}

module.export = Transaction;
