const HuobiExchange = require('/opt/nodejs/service/huobipro.exchange.service');
const BinaceExchange = require('/opt/nodejs/service/binance.exchange.service');
const FtxExchange = require("/opt/nodejs/service/ftx.exchange.service");

const { responseTemplate } = require('/opt/nodejs/utils/response.template');
const { SQS_BINANCE_REQUEST_QUEUE_URL, SQS_HUOBI_REQUEST_QUEUE_URL, SQS_FTX_REQUEST_QUEUE_URL, PORTFOLIO_TABLE_NAME } = process.env;
const SqsService = require('/opt/nodejs/aws-sdk/sqs.service');
const _ = require('lodash');
const AwsDynamoService = require('/opt/nodejs/aws-sdk/dynamodb.service');

exports.handler = async (event) => {
    try {
        console.log("Init request fetch trade", event.body);
        if (!event.body) {
            return responseTemplate(500, 'Request body is empty');
        }

        const { quoteAsset, exchangeName } = JSON.parse(event.body);
        const { exchangeApi, sqsQueueUrl } = getExchangeApi(exchangeName);
        const allValidSymbol = await getAllValidSymbol(exchangeApi, quoteAsset);

        const maxChunk = Math.ceil(allValidSymbol.length / 10);
        let start = 0;
        for (let i = 0; i < maxChunk; i++) {
            const end = (start + 10) > allValidSymbol.length ? allValidSymbol.length : start + 10;
            const request = {
                quoteAsset,
                symbols: allValidSymbol.slice(start, end).join(","),
            }
            console.log(`request ${exchangeName}`, start, end, request);
            const sendResult = await sendOrderToSqs(request, sqsQueueUrl);
            console.log("sendResult", sendResult);
            start += 10;
        }

        console.log("baseAssetArr", JSON.stringify(allValidSymbol));
        return responseTemplate(200, allValidSymbol);
    } catch (error) {
        return responseTemplate(500, error);
    }
};

const getExchangeApi = (exchangeName) => {
    switch (exchangeName) {
        case "Binance":
            return {
                exchangeApi: new BinaceExchange(),
                sqsQueueUrl: SQS_BINANCE_REQUEST_QUEUE_URL
            };
        case "Huobi":
            return {
                exchangeApi: new HuobiExchange(),
                sqsQueueUrl: SQS_HUOBI_REQUEST_QUEUE_URL
            };
        case "FTX":
            return {
                exchangeApi: new FtxExchange(),
                sqsQueueUrl: SQS_FTX_REQUEST_QUEUE_URL
            };
        default:
            throw new Error("Exchange API not found");
    }
}

const getAllValidSymbol = async (exchangeApi, quoteAsset) => {
    console.log("exchangeApi", exchangeApi);
    const coinList = await getAllCoins();
    const baseAssets = _.map(coinList, 'symbol').join(",");
    const baseAssetArr = [...new Set(baseAssets.split(","))];
    console.log('baseAssetArr', baseAssetArr);
    const allPairArr = await exchangeApi.getAllPair();
    console.log("allPairArr", JSON.stringify(allPairArr));
    const validBaseAssetArr = [];

    for (const baseAsset of baseAssetArr) {
        const symbol = `${baseAsset}/${quoteAsset}`;
        if (allPairArr.includes(symbol)) {
            validBaseAssetArr.push(symbol);
        }
    }
    return validBaseAssetArr;
}

const sendOrderToSqs = async (request, sqsQueueUrl) => {
    const sqsService = new SqsService();
    return await sqsService.sendMessage(sqsQueueUrl, {
        data: request
    });
}

const getAllCoins = async () => {
    const awsDynamoService = new AwsDynamoService();
    const scanParams = {
        ProjectionExpression: "coinKey, cointrackingId, symbol",
        TableName: PORTFOLIO_TABLE_NAME,
    };
    const scanResult = await awsDynamoService.scanItem(scanParams);
    return scanResult.Items;
};