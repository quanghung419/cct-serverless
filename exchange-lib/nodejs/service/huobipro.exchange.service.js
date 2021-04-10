const moment = require('moment');
const { huobipro } = require('../config/exchanges.config');
const { EXCHANGE_NAME } = process.env;

module.exports = class HuobiExchange {
    constructor() {
    }

    async getAllPair() {
        const result = await huobipro.fetchTickers();
        return Object.keys(result);
    }

    async fetchMyTrades(symbol, lastTransactionTime) {
        try {
            const result = await huobipro.fetchMyTrades(symbol, lastTransactionTime);
            const tradeToImport = [];
            result.forEach(item => {
                const { info } = item;
                const symbols = item.symbol.split('/');
                tradeToImport.push({
                    trade_id: info.id,
                    symbol: item.symbol,
                    side: item.side,
                    quote_asset: symbols[1],
                    base_asset: symbols[0],
                    fee_asset: item.fee.currency,
                    filled_amount: item.amount,
                    cost_amount: item.cost,
                    fee_amount: item.fee.cost,
                    order_id: item.order,
                    price: item.price,
                    datetime: moment.utc(item.datetime),
                    exchange: EXCHANGE_NAME,
                    is_manual: false,
                });
            });

            return tradeToImport;
        } catch (error) {
            console.log('fetch trade by symbol error', error);
            return [];
        }
    }

}
