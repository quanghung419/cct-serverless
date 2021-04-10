const HuobiExchange = require('/opt/nodejs/service/huobipro.exchange.service');
const { responseTemplate } = require('/opt/nodejs/utils/response.template');
const { SQS_QUEUE_URL, HUOBI_PAST_WINDOW } = process.env;
const SqsService = require('/opt/nodejs/aws-sdk/sqs.service');
const _ = require('lodash');
const DateUtilities = require('/opt/nodejs/utils/date-utilities');
const LatestFetchTransactionTime = require('/opt/nodejs/utils/latest-fetch-transaction-time');
const MergeTrade = require('/opt/nodejs/utils/merge-trade');

const exchangeName = "Huobi";

exports.handler = async (event) => {
    try {
        const body = event.body ? JSON.parse(event.body) : JSON.parse(event.Records[0].body).data;
        console.log("Fetch trade HUOBI", body);
        const transactions = await fetchTradeTransaction(body);
        const orders = MergeTrade.mergeTradeIntoOrder(transactions);
        console.log("orderTrades", orders, "body", body);

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

    const huobiExchange = new HuobiExchange();
    for (const symbol of symbolArr) {
        const latestDate = await LatestFetchTransactionTime.getLatestFetchTime(exchangeName, symbol);
        console.log('latestDate', latestDate);
        console.log('getLatestDateWithLowerBound', getLatestDateWithLowerBound(latestDate));
        const promise = huobiExchange.fetchMyTrades(symbol, getLatestDateWithLowerBound(latestDate));
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
    await LatestFetchTransactionTime.addLatestFetchTime(exchangeName, symbol, getLatestDateWithLowerBound(latestDatetime));
}

const getLatestDateWithLowerBound = (timestamp) => {
    const minDate = DateUtilities.getUnixTimestampFromNow(-1 * HUOBI_PAST_WINDOW, 'd');
    console.log("minDate", minDate, "timestamp", timestamp);
    return Math.max(timestamp, minDate);
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