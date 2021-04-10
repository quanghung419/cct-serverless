const DateUtilities = require('./date-utilities');
const AwsDynamoService = require('../aws-sdk/dynamodb.service');
const { LATEST_SYNC_TRADE_TIME_TABLE, START_DATE } = process.env;

module.exports = class LatestFetchTransactionTime {
    static async getLatestFetchTime(exchange, pair) {
        const requestParams = {
            TableName: LATEST_SYNC_TRADE_TIME_TABLE,
            KeyConditionExpression: "exchange = :e and pair = :q",
            ExpressionAttributeValues: {
                ":e": exchange,
                ":q": pair
            }

        };
        console.log("getLatestFetchTradeTime requestParams", requestParams);
        const awsDynamoService = new AwsDynamoService();
        const result = await awsDynamoService.queryItem(requestParams);
        const { Items } = result;
        if (Items.length === 0) {
            return DateUtilities.convertToVnTimestamp(START_DATE);
        }
        return Items[0].latestSyncTime;
    }

    static async addLatestFetchTime(exchange, pair, latestSyncTime) {
        const requestParams = {
            TableName: LATEST_SYNC_TRADE_TIME_TABLE,
            Item: {
                pair: {
                    S: pair,
                },
                exchange: {
                    S: exchange,
                },
                latestSyncTime: {
                    N: `${latestSyncTime}`,
                },
            },
        };
        console.log("addLatestFetchTradeTime requestParams", requestParams);
        const awsDynamoService = new AwsDynamoService();
        const result = await awsDynamoService.addItem(requestParams);
        console.log("addLatestFetchTradeTime", result);
    };

    static async getLatestFetchTimeFromParamOrDatabase(event, exchangeName, subKey) {
        const body = JSON.parse(event.body);
        console.info('getLatestFetchTimeFromParamOrDatabase request', JSON.stringify(body));
        const { startTime } = body;
        let referenceUnixTimestamp = startTime;
        if (startTime) {
            if (!Number.isInteger(startTime)) {
                referenceUnixTimestamp = DateUtilities.convertExcelDateToUnixTimestamp(startTime, 1);
            }
        } else {
            referenceUnixTimestamp = await LatestFetchTransactionTime.getLatestFetchTime(exchangeName, subKey);
        }
        return referenceUnixTimestamp;
    }
}
