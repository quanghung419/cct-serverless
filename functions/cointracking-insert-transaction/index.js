const CoinTrackingService = require('/opt/nodejs/service/coin-tracking.service');
const { responseTemplate } = require('/opt/nodejs/utils/response.template');
const AwsDynamoService = require('/opt/nodejs/aws-sdk/dynamodb.service');
const SqsService = require('/opt/nodejs/aws-sdk/sqs.service');
const _ = require('lodash');
const { SQS_QUEUE_URL, PORTFOLIO_TABLE_NAME } = process.env;

exports.handler = async (event) => {
    try {
        console.log("Event ", event);
        const { body, receiptHandle } = event.Records[0];
        const sqsData = JSON.parse(body);
        const { transactionType, data } = sqsData;

        const coinMap = await getCoinMap();
        console.log("COin map", coinMap);
        switch (transactionType) {
            case "INCOME":
                await cointrackingInsertIncome(data, coinMap);
                break;
            case "TRANSFER":
                console.log("TRANSFER request", data);
                await cointrackingInsertTransfer(data, coinMap);
                break;
            default: // TRADE
                // await insertTransactionIntoDynamoDb(data);
                await cointrackingInsertTransaction(data, coinMap);
                break;
        }
        await deleteSqsMessage(receiptHandle);
        return responseTemplate(200, data);
    } catch (error) {
        console.log("Handle insert Cointracking error", error);
    }
};

const getCoinMap = async () => {
    const awsDynamoService = new AwsDynamoService();
    const scanParams = {
        ProjectionExpression: "coinKey, cointrackingId, symbol",
        TableName: PORTFOLIO_TABLE_NAME,
    };
    const scanResult = await awsDynamoService.scanItem(scanParams);
    return _.keyBy(scanResult.Items, 'symbol');
}

const deleteSqsMessage = async (sqsReceiptHandle) => {
    const sqsService = new SqsService();
    const data = await sqsService.deleteMessage(SQS_QUEUE_URL, sqsReceiptHandle);
    console.log("Delete SQS message result", data);
}

const cointrackingInsertIncome = async (distributions, coinMap) => {
    const coinTrackingService = new CoinTrackingService();
    for (const distr of distributions) {
        const params = {};
        const buyCoin = coinMap[distr.asset] ? coinMap[distr.asset].cointrackingId : distr.asset;
        params.buyAmount = distr.amount;
        params.buyCoin = buyCoin;
        params.exchangeName = 'Binance';
        params.comment = `${distr.enInfo}: ${distr.tranId}`;
        params.transactionDate = distr.divTime;
        const result = await coinTrackingService.addIncome(params);
        console.log('cointrackingInsertTransaction result:', result);
    }
}

const cointrackingInsertTransfer = async (transfers, coinMap) => {
    const coinTrackingService = new CoinTrackingService();
    for (const tran of transfers) {
        const params = {};
        const transferedCoin = coinMap[tran.currency] ? coinMap[tran.currency].cointrackingId : tran.currency;
        const feeCurrency = coinMap[tran.feeCurrency] ? coinMap[tran.feeCurrency].cointrackingId : tran.feeCurrency;
        params.amount = tran.amount;
        params.transferedCoin = transferedCoin;
        params.from = tran.from || shortenAddress(tran.fromAddress);
        params.to = tran.to || shortenAddress(tran.toAddress);
        params.comment = `${tran.txId}${tran.is_group ? ' - group' : ''}`;
        params.transactionDate = tran.date;
        params.fee = tran.fee;
        params.feeCurrency = feeCurrency;
        const resultWithdraw = await coinTrackingService.addWithdraw(params);
        const resultDeposit = await coinTrackingService.addDeposit(params);
        console.log('cointrackingInsert transfer resultWithdraw:', resultWithdraw);
        console.log('cointrackingInsert transfer resultDeposit:', resultDeposit);
    }
}

const cointrackingInsertTransaction = async (transactions, coinMap) => {
    const coinTrackingService = new CoinTrackingService();
    for (const tran of transactions) {
        const params = {};
        const baseAssetMapping = coinMap[tran.base_asset] ? coinMap[tran.base_asset].cointrackingId : tran.base_asset;
        const quoteAssetMapping = coinMap[tran.quote_asset] ? coinMap[tran.quote_asset].cointrackingId : tran.quote_asset;
        const feeAssetMapping = coinMap[tran.fee_asset] ? coinMap[tran.fee_asset].cointrackingId : tran.quote_asset;

        if (tran.side === "buy") {
            params.buyAmount = tran.filled_amount;
            params.buyCoin = baseAssetMapping;
            params.sellAmount = tran.cost_amount;
            params.sellCoin = quoteAssetMapping;
        } else {
            params.buyAmount = tran.cost_amount;
            params.buyCoin = quoteAssetMapping;
            params.sellAmount = tran.filled_amount;
            params.sellCoin = baseAssetMapping;
        }
        params.feeAmount = tran.fee_amount;
        params.feeCoin = feeAssetMapping;
        params.exchangeName = tran.exchange;
        params.comment = `trade_id:${tran.trade_id} - order_id:${tran.order_id}${tran.is_group ? ' - group' : ''}`;
        params.transactionDate = tran.datetime;
        const result = await coinTrackingService.addTransaction(params);
        console.log('cointrackingInsertTransaction result:', result);
    }
}

const shortenAddress = (address) => {
    if (!address || !address.length) {
        return address;
    }
    return `${address.substring(0, 8)}...${address.substring(address.length - 8, address.length)}`.toLowerCase();
}