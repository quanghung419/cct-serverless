const BinaceExchange = require('/opt/nodejs/service/binance.exchange.service');
const LatestFetchTransactionTime = require('/opt/nodejs/utils/latest-fetch-transaction-time');
const { responseTemplate } = require('/opt/nodejs/utils/response.template');
const SqsService = require('/opt/nodejs/aws-sdk/sqs.service');
const { SQS_QUEUE_URL } = process.env;
const _ = require('lodash');
const Big = require('big.js');

const exchangeName = "Binance";
const subKey = "_DISTRIBUTION";

exports.handler = async (event) => {
    if (!event.body) {
        return responseTemplate(500, 'Request body is empty');
    }

    const referenceUnixTimestamp = await LatestFetchTransactionTime.getLatestFetchTimeFromParamOrDatabase(event, exchangeName, subKey);
    console.log("referenceUnixTimestamp", referenceUnixTimestamp);
    const binanceExchange = new BinaceExchange();
    const transactions = await binanceExchange.fetchDistribution(referenceUnixTimestamp);
    await sendItemsToSqs(transactions);
    await updateLatestFetchedDate(transactions);
    return responseTemplate(200, transactions);
};

const sendItemsToSqs = async (items) => {
    if (items.length > 0) {
        const sqsService = new SqsService();
        await sqsService.sendMessage(SQS_QUEUE_URL, {
            transactionType: "INCOME",
            data: mergeDistributionByAsset(items)
        });
    }
}

const mergeDistributionByAsset = (transactions) => {
    const group = _.groupBy(transactions, function (tran) {
        return tran.asset;
    });

    const mergedDistribution = [];
    const keys = Object.keys(group);
    for (const key of keys) {
        const distr = group[key];
        if (distr.length === 1) {
            mergedDistribution.push(distr[0]);
            continue;
        } else {
            const groupDistr = Object.assign({}, distr[0]);
            let tmpSumAmount = new Big(parseFloat(groupDistr.amount || 0));
            for (let i = 1; i < distr.length; i++) {
                const subTrade = distr[i];
                tmpSumAmount.plus(subTrade.amount || 0);
            }
            groupDistr.amount = tmpSumAmount.valueOf();
            mergedDistribution.push(groupDistr);
        }
    }
    return mergedDistribution;
}

const updateLatestFetchedDate = async (transactions) => {
    if (transactions && transactions.length > 0) {
        const dateArr = _.map(transactions, (item) => {
            return item.divTime;
        });
        await LatestFetchTransactionTime.addLatestFetchTime(exchangeName, subKey, Math.max(...dateArr) + 1000);
    }
}