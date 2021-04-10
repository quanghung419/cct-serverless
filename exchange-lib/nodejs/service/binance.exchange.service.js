const { binance } = require('../config/exchanges.config');
const DateUtilities = require('../utils/date-utilities');
const moment = require('moment');
const { EXCHANGE_NAME } = process.env;

module.exports = class BinaceExchange {
    constructor() {
    }

    async getAllPair() {
        const result = await binance.fetchTickers();
        return Object.keys(result);
    }

    async fetchBalance() {
        try {
            const result = await binance.fetchBalance();
            console.info("fetchDistribution", result);
            const { total: data } = result;

            return Object.keys(data).map((key) => {
                const obj = {};
                obj.asset = key;
                obj.balance = data[key];
                return obj;
            });
        } catch (error) {
            console.log('fetch distribution error', error);
            throw error;
        }
    }

    async fetchDistribution(startTime) {
        try {
            const option = {
                limit: 200
            };

            if (startTime && startTime !== "") {
                option.startTime = startTime;
                option.endTime = moment().valueOf();
            }
            const result = await binance.sapiGetAssetAssetDividend(option);
            console.info("sapiGetAssetAssetDividend", result);
            const { rows: data } = result;
            return data;
        } catch (error) {
            console.log('fetch distribution error', error);
            throw error;
        }
    }

    async fetchMyTrades(symbol, lastTransactionTime) {
        try {
            const result = await binance.fetchMyTrades(symbol, lastTransactionTime);
            const tradeToImport = [];
            result.forEach(item => {
                const symbols = item.symbol.split('/');
                tradeToImport.push({
                    trade_id: item.id,
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
                    datetime: DateUtilities.convertUnixTimestampToExcelDate(item.datetime),
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

    async getCurrentPrice(symbol) {
        try {
            const result = await binance.fetchTicker(symbol);
            return result;
        } catch (error) {
            console.log('get current price by call method fetchTicker got error', error);
            return {};
        }
    }

    async getDepositHistory(since) {
        try {
            const currency = undefined;
            return await binance.fetchDeposits(currency, since);
        } catch (error) {
            console.log('An error occur when fetch deposit history', error);
            return [];
        }
    }

    async getWithdrawtHistory(since) {
        try {
            const currency = undefined;
            return await binance.fetchWithdrawals(currency, since);
        } catch (error) {
            console.log('An error occur when fetch withdraw history', error);
            return [];
        }
    }

}
