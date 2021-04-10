const LatestFetchTransactionTime = require('/opt/nodejs/utils/latest-fetch-transaction-time');
const TransactionMetadataApi = require('/opt/nodejs/utils/transaction-metadata-api');
const BinaceExchange = require('/opt/nodejs/service/binance.exchange.service');
const { responseTemplate } = require("/opt/nodejs/utils/response.template");
const { getWalletBook } = require('/opt/nodejs/dynamodb/wallet-book');
const SqsService = require("/opt/nodejs/aws-sdk/sqs.service");
const moment = require('moment');
const _ = require('lodash');
const MergeTrade = require('/opt/nodejs/utils/merge-trade');

const { SQS_QUEUE_URL } = process.env;
const exchangeName = "Binance";
const subKey = "_DEPOSIT";

exports.handler = async (event) => {
    if (!event.body) {
        return responseTemplate(500, 'Request body is empty');
    }

    const referenceUnixTimestamp = await LatestFetchTransactionTime.getLatestFetchTimeFromParamOrDatabase(event, exchangeName, subKey);
    const binanceExchange = new BinaceExchange();
    console.log("referenceUnixTimestamp", referenceUnixTimestamp, new moment(referenceUnixTimestamp));
    const result = await binanceExchange.getDepositHistory(referenceUnixTimestamp);
    console.log("result", result);
    const tmpResult = await convertBinanceDataToTransferData(result);
    console.log("tmpResult", tmpResult);
    const transferData = MergeTrade.mergeTransfer(tmpResult);
    console.log("mergedTrans", JSON.stringify(transferData));

    if (transferData.length > 0) {
        const walletBook = await getWalletBook();
        const latestTransferDate = await mappingWalletName(transferData, walletBook);
        await LatestFetchTransactionTime.addLatestFetchTime(exchangeName, subKey, latestTransferDate + 1000);
        await sendOrderToSqs(transferData);
    }
    return responseTemplate(200, transferData);
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

const convertBinanceDataToTransferData = async (depositData) => {
    const transferData = _.map(depositData, (item) => {
        console.log("convertBinanceDataToTransferData", item);
        const { info } = item;
        const { network, txId } = info;
        const tranferRecord = {};
        tranferRecord.id = item.id;
        tranferRecord.date = new Date(item.timestamp);
        tranferRecord.amount = item.amount;
        tranferRecord.currency = item.currency;
        tranferRecord.toAddress = item.address;
        tranferRecord.to = 'Binance';
        tranferRecord.txId = txId;
        tranferRecord.network = network;
        tranferRecord.tag = item.tag;
        return tranferRecord;
    });
    return transferData;
}

const mappingWalletName = async (transferData, walletBook) => {
    const tranDateArr = [];
    for (const tran of transferData) {
        tranDateArr.push(new moment(tran.date).valueOf());
        let tranMetadata = await TransactionMetadataApi.bscscan(tran.txId);
        if (!tranMetadata) {
            tranMetadata = await TransactionMetadataApi.etherscan(tran.txId);
        }
        if (tranMetadata) {
            tran.fromAddress = tranMetadata.from;
            const walletFrom = walletBook[tranMetadata.from.toLowerCase()];
            const { exchange } = walletFrom ? walletFrom[0] : {};
            tran.from = exchange;
        }
    }
    return Math.max(...tranDateArr);
}