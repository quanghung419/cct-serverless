const LatestFetchTransactionTime = require('/opt/nodejs/utils/latest-fetch-transaction-time');
const BinaceExchange = require('/opt/nodejs/service/binance.exchange.service');
const { responseTemplate } = require("/opt/nodejs/utils/response.template");
const { getWalletBook } = require('/opt/nodejs/dynamodb/wallet-book');
const SqsService = require("/opt/nodejs/aws-sdk/sqs.service");
const MergeTrade = require('/opt/nodejs/utils/merge-trade');
const moment = require('moment');
const _ = require('lodash');

const { SQS_QUEUE_URL } = process.env;
const exchangeName = "Binance";
const subKey = "_WITHDRAW";

exports.handler = async (event) => {
    const binanceExchange = new BinaceExchange();

    if (!event.body) {
        return responseTemplate(500, 'Request body is empty');
    }

    const body = JSON.parse(event.body);
    console.info('fetchWithdraw request', JSON.stringify(body));
    const referenceUnixTimestamp = await LatestFetchTransactionTime.getLatestFetchTimeFromParamOrDatabase(event, exchangeName, subKey);

    if (referenceUnixTimestamp) {
        console.log("referenceUnixTimestamp", referenceUnixTimestamp);
        const result = await binanceExchange.getWithdrawtHistory(referenceUnixTimestamp);

        const walletBook = await getWalletBook();
        console.log("walletBook", walletBook);
        const tranDateArr = [];
        const finalResult = _.map(result, (item) => {
            const { info } = item;
            const { network, txId } = info;
            tranDateArr.push(new moment(item.timestamp).valueOf());

            const walletTo = walletBook[item.address.toLowerCase()];
            console.log("walletTo", walletTo);
            const tranferRecord = {};
            tranferRecord.id = item.id;
            tranferRecord.date = new Date(item.timestamp);
            tranferRecord.amount = item.amount;
            tranferRecord.currency = item.currency;
            tranferRecord.toAddress = item.address;
            tranferRecord.from = 'Binance';
            tranferRecord.txId = txId;
            tranferRecord.network = network;
            tranferRecord.tag = item.tag;
            tranferRecord.fee = item.fee.cost;
            tranferRecord.feeCurrency = item.fee.currency;
            tranferRecord.to = walletTo ? walletTo[0].exchange : null;
            return tranferRecord;
        });

        if (finalResult.length > 0) {
            console.log("tranDateArr", tranDateArr, Math.max(...tranDateArr));
            await LatestFetchTransactionTime.addLatestFetchTime(exchangeName, subKey, Math.max(...tranDateArr) + 1000);
        }

        const mergedTrans = MergeTrade.mergeTransfer(finalResult);
        console.log("mergedTrans", JSON.stringify(mergedTrans));

        await sendOrderToSqs(mergedTrans);
        return responseTemplate(200, finalResult);
    }

    return responseTemplate(500, "Start time is empty");
};

const sendOrderToSqs = async (transfers) => {
    if (transfers.length > 0) {
        const sqsService = new SqsService();
        const result = await sqsService.sendMessage(SQS_QUEUE_URL, {
            transactionType: "TRANSFER",
            data: transfers,
        });
        console.log("sendOrderToSqs", result);
    }
};
