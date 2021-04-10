const axios = require('axios');
const { JSDOM } = require('jsdom');
const { window } = new JSDOM('');
const $ = require('jquery')(window);
const crypto = require('crypto');
const fetch = require('node-fetch');
const moment = require('moment');
const FormData = require('form-data');
const queryString = require('query-string');
const _ = require('lodash');

const {
    COINTRACKING_COOKIE,
    COINTRACKING_ADD_TRANSACTION_URL,
    COINTRACKING_API_KEY,
    COINTRACKING_API_SECRET,
} = process.env;

const DateUtilities = require('/opt/nodejs/utils/date-utilities');

const cointrackingPostRequest = async (params) => {
    const { url, data } = params;
    return await axios(
        {
            method: 'post',
            url,
            withCredentials: true,
            crossdomain: true,
            data: $.param(data),
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Cache-Control": "no-cache",
                "cookie": COINTRACKING_COOKIE
            }
        }
    );
}

const cointrackingGetRequest = async (url) => {
    return await axios(
        {
            method: 'get',
            url,
            withCredentials: true,
            crossdomain: true,
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Cache-Control": "no-cache",
                "cookie": COINTRACKING_COOKIE
            }
        }
    );
}

module.exports.TRANSACTION_TYPE = {
    TRADE: 0,
    INCOME: 3
}

module.exports = class CoinTrackingService {
    constructor() {
    }

    async getTransaction() {
        return await cointrackingGetRequest(COINTRACKING_ADD_TRANSACTION_URL);
    }

    async getTransactionFromApi() {
        console.log("COINTRACKING_API_SECRET", COINTRACKING_API_SECRET, "COINTRACKING_API_KEY", COINTRACKING_API_KEY);
        const params = {};
        params.method = 'getTrades';
        params.nonce = moment().unix();
        const post_data = queryString.stringify(params);

        const hash = crypto.createHmac('sha512', COINTRACKING_API_SECRET);
        hash.update(post_data);
        const sign = hash.digest('hex');
        const headers = { 'Key': COINTRACKING_API_KEY, 'Sign': sign };

        const form = new FormData();
        for (const paramKey in params) {
            const value = params[paramKey];
            form.append(paramKey, value);
        }
        const url = "https://cointracking.info/api/v1/";
        const result = await fetch(url, {
            method: 'POST',
            body: form,
            headers: headers,
        });
        const json = await result.json();
        if (json.success) delete json.success;
        if (json.method) delete json.method;
        return _.map(json, item => {
            return item;
        });
    }

    async removeTransaction(transactions) {
        const reqData = {
            "action": "remove",
            "data": {}
        };
        for (const tran of transactions) {
            const {
                DT_RowId, user_id_trade, buy, buy_coin, sell, sell_coin, fee, fee_coin, csv2,
                trade_group, kommentar, eintrag, tt, buy_wert_in_eur, sell_wert_in_eur, ct, time
            } = tran;

            reqData.data[DT_RowId] = {
                DT_RowId,
                user_id_trade,
                buy,
                buy_coin,
                sell,
                sell_coin,
                fee,
                fee_coin,
                csv2,
                trade_group,
                kommentar,
                eintrag,
                tt,
                buy_wert_in_eur,
                sell_wert_in_eur,
                ct,
                time,
            };
        }

        console.log("Cointracking remove request:", JSON.stringify(reqData));
        const params = {
            url: COINTRACKING_ADD_TRANSACTION_URL,
            data: reqData
        }

        return await cointrackingPostRequest(params);
    }

    async addTransaction(transaction) {
        const {
            buyAmount,
            buyCoin,
            sellAmount,
            sellCoin,
            feeAmount,
            feeCoin,
            exchangeName,
            transactionDate,
            comment
        } = transaction;
        const reqData = {
            "action": "create",
            "data": [
                {
                    "tt": 0, // TRADE
                    "buy": buyAmount,
                    "buy_coin": buyCoin,
                    "sell": sellAmount,
                    "sell_coin": sellCoin,
                    "fee": feeAmount,
                    "fee_coin": feeCoin,
                    "csv2": exchangeName,
                    "trade_group": "auto-fetch-trade",
                    "ct": null,
                    "eintrag": DateUtilities.convertExcelDateToUnixTimestamp(transactionDate),
                    "buy_wert_in_eur": null,
                    "sell_wert_in_eur": null,
                    "kommentar": comment,
                    "time": transactionDate
                }
            ]
        };

        console.log("Cointracking request data:", JSON.stringify(reqData));
        const params = {
            url: COINTRACKING_ADD_TRANSACTION_URL,
            data: reqData
        }

        return await cointrackingPostRequest(params);
    }

    async addIncome(transaction) {
        const { buyAmount, buyCoin, exchangeName, transactionDate, comment } = transaction;

        const reqData = {
            "action": "create",
            "data": [
                {
                    "tt": 3, // INCOME
                    "buy": buyAmount,
                    "buy_coin": buyCoin,
                    "sell": null,
                    "sell_coin": null,
                    "fee": null,
                    "fee_coin": null,
                    "csv2": exchangeName,
                    "trade_group": "auto-fetch-income",
                    "ct": null,
                    "eintrag": transactionDate,
                    "buy_wert_in_eur": null,
                    "sell_wert_in_eur": null,
                    "kommentar": comment,
                    "time": DateUtilities.convertUnixTimestampToExcelDate(transactionDate)
                }
            ]
        };

        console.log("Cointracking request data:", JSON.stringify(reqData));
        const params = {
            url: COINTRACKING_ADD_TRANSACTION_URL,
            data: reqData
        }

        return await cointrackingPostRequest(params);
    }

    async addWithdraw(transaction) {
        const { amount, transferedCoin, from, to, transactionDate, comment, fee, feeCurrency } = transaction;
        const timestamp = new moment(transactionDate).valueOf();

        const reqData = {
            "action": "create",
            "data": [
                {
                    "tt": 2, // 999 TRANSFER | 1 DEPOSIT | 2 WITHDRAW
                    "buy": null,
                    "buy_coin": null,
                    "sell": amount,
                    "sell_coin": transferedCoin,
                    "fee": fee,
                    "fee_coin": feeCurrency,
                    "csv2": from,
                    "trade_group": "auto-fetch-transfer",
                    "ct": null,
                    "eintrag": timestamp,
                    "buy_wert_in_eur": null,
                    "sell_wert_in_eur": null,
                    "kommentar": comment,
                    "time": DateUtilities.convertUnixTimestampToExcelDate(timestamp)
                }
            ]
        };

        console.log("Cointracking request data:", JSON.stringify(reqData));
        const params = {
            url: COINTRACKING_ADD_TRANSACTION_URL,
            data: reqData
        }

        return await cointrackingPostRequest(params);
    }

    async addDeposit(transaction) {
        const { amount, transferedCoin, from, to, transactionDate, comment, fee, feeCurrency } = transaction;
        const timestamp = new moment(transactionDate).valueOf();

        const reqData = {
            "action": "create",
            "data": [
                {
                    "tt": 1, // 999 TRANSFER | 1 DEPOSIT | 2 WITHDRAW
                    "buy": feeCurrency === transferedCoin ? amount - fee : amount,
                    "buy_coin": transferedCoin,
                    "sell": null,
                    "sell_coin": null,
                    "fee": null,
                    "fee_coin": null,
                    "csv2": to,
                    "trade_group": "auto-fetch-transfer",
                    "ct": null,
                    "eintrag": timestamp,
                    "buy_wert_in_eur": null,
                    "sell_wert_in_eur": null,
                    "kommentar": comment,
                    "time": DateUtilities.convertUnixTimestampToExcelDate(timestamp)
                }
            ]
        };

        console.log("Cointracking request data:", JSON.stringify(reqData));
        const params = {
            url: COINTRACKING_ADD_TRANSACTION_URL,
            data: reqData
        }

        return await cointrackingPostRequest(params);
    }
}
