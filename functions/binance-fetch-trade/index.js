const BinaceExchange = require('/opt/nodejs/service/binance.exchange.service');
const { responseTemplate } = require('/opt/nodejs/utils/response.template');
const { SQS_QUEUE_URL } = process.env;
const SqsService = require('/opt/nodejs/aws-sdk/sqs.service');
const _ = require('lodash');
const moment = require('moment');
const MergeTrade = require('/opt/nodejs/utils/merge-trade');
const LatestFetchTransactionTime = require('/opt/nodejs/utils/latest-fetch-transaction-time');

const exchangeName = "Binance";

exports.handler = async (event) => {
    try {
        // Support both input data from SQS and POST request
        const body = event.body ? JSON.parse(event.body) : JSON.parse(event.Records[0].body).data;
        const transactions = await fetchTradeTransaction(body);
        console.log("transactions", JSON.stringify(transactions));
        const orders = MergeTrade.mergeTradeIntoOrder(transactions);
        console.log("orderTrades", orders);
        // const orders = transactions;

        const sendResult = await sendOrderToSqs(orders);
        console.log("sendResult", sendResult);
        return responseTemplate(200, orders);
    } catch (error) {
        return responseTemplate(500, error);
    }
};

const fetchTradeTransaction = async (body) => {
    const { symbols } = body;
    console.log("fetchTradeTransaction", symbols);
    if (!symbols) {
        throw new Error('symbol params is mandatory');
    }

    const symbolArr = [...new Set(symbols.split(","))];
    let transactions = [];
    const promiseArr = [];

    const binanceExchange = new BinaceExchange();
    for (const symbol of symbolArr) {
        const latestDate = await LatestFetchTransactionTime.getLatestFetchTime(exchangeName, symbol);
        const promise = binanceExchange.fetchMyTrades(symbol, latestDate);
        promiseArr.push(promise);
    }

    for (const promise of promiseArr) {
        const result = await promise;
        transactions = transactions.concat(result);
        if (result.length > 0) {
            const symbol = result[0].symbol;
            const tranDateArr = _.map(result, function (item) {
                return new moment(item.datetime).valueOf()
            })
            await LatestFetchTransactionTime.addLatestFetchTime(exchangeName, symbol, Math.max(...tranDateArr) + 1000);
        }
    }

    return transactions;
}

const sendOrderToSqs = async (orders) => {
    if (orders.length > 0) {
        const sqsService = new SqsService();
        return await sqsService.sendMessage(SQS_QUEUE_URL, {
            transactionType: "TRADE",
            data: orders
        });
    }
}
