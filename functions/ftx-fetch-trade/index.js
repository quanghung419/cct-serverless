const LatestFetchTransactionTime = require('/opt/nodejs/utils/latest-fetch-transaction-time');
const { responseTemplate } = require("/opt/nodejs/utils/response.template");
const FtxExchange = require("/opt/nodejs/service/ftx.exchange.service");
const SqsService = require("/opt/nodejs/aws-sdk/sqs.service");
const MergeTrade = require('/opt/nodejs/utils/merge-trade');
const { SQS_QUEUE_URL } = process.env;
const _ = require("lodash");

const EXCHANGE_NAME = "FTX";

exports.handler = async (event) => {
    try {
        const body = event.body ? JSON.parse(event.body) : JSON.parse(event.Records[0].body).data;
        const transactions = await fetchTradeTransaction(body);
        const orders = MergeTrade.mergeTradeIntoOrder(transactions);
        console.log("orderTrades", orders, "body", body);
        await sendOrderToSqs(orders);
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

    const ftxExchange = new FtxExchange();
    for (const symbol of symbolArr) {
        const latestDate = await LatestFetchTransactionTime.getLatestFetchTime(EXCHANGE_NAME, symbol);
        const promise = ftxExchange.fetchMyTrades(symbol, latestDate);
        promiseArr.push(promise);
    }

    for (const promise of promiseArr) {
        const result = await promise;
        transactions = transactions.concat(result);
        await updateSyncTimeByPair(result);
    }

    return transactions;
}

const updateSyncTimeByPair = async (transactions) => {
    if (!transactions || transactions.length === 0) {
        console.log("Transaction is empty => skip update latest sync time");
        return;
    }
    const symbol = transactions[0].symbol;
    console.log("updateSyncTimeByPair", transactions, symbol);
    const transactionDateArr = _.map(transactions, (item) => {
        return item.datetime.valueOf()
    });
    const latestDatetime = Math.max(...transactionDateArr) + 1000;
    await LatestFetchTransactionTime.addLatestFetchTime(EXCHANGE_NAME, symbol, latestDatetime);
}

const sendOrderToSqs = async (orders) => {
    if (orders.length > 0) {
        const sqsService = new SqsService();
        const result = await sqsService.sendMessage(SQS_QUEUE_URL, {
            transactionType: "TRADE",
            data: orders
        });
        console.log("sendOrderToSqs", result);
    }
}
