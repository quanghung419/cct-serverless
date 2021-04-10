const AwsDynamoService = require('/opt/nodejs/aws-sdk/dynamodb.service');
const { PORTFOLIO_TABLE_NAME } = process.env;
const { responseTemplate } = require("/opt/nodejs/utils/response.template");

exports.handler = async (event) => {
    try {
        const coinArr = JSON.parse(event.body);
        await clearData();
        const awsDynamoService = new AwsDynamoService();
        for (let i = 0; i < coinArr.length; i++) {
            const coin = coinArr[i];
            const requestParams = {
                TableName: PORTFOLIO_TABLE_NAME,
                Item: {
                    coinKey: {
                        S: coin.coinKey
                    },
                    symbol: {
                        S: coin.symbol
                    },
                    cicGroup: {
                        S: coin.cicGroup
                    },
                    cicId: {
                        S: coin.cicId
                    },
                    cointrackingId: {
                        S: coin.cointrackingId
                    },
                }
            };
            console.log("coin", coin, "requestParams", requestParams);
            const result = await awsDynamoService.addItem(requestParams);
            // console.log("Add DynamoDB", result);
        }
        return responseTemplate(200, "done");
    } catch (error) {
        console.log("An error occur when fetch CIC list", error);
        return responseTemplate(500, error);
    }
};

const clearData = async () => {
    const awsDynamoService = new AwsDynamoService();
    const scanParams = {
        ProjectionExpression: "coinKey",
        TableName: PORTFOLIO_TABLE_NAME,
    };
    const scanResult = await awsDynamoService.scanItem(scanParams);
    for (let item of scanResult.Items) {
        await deleteItem(item, awsDynamoService);
    }
};

const deleteItem = async (item, awsDynamoService) => {
    const params = {
        Key: {
            "coinKey": {
                S: item.coinKey
            }
        },
        TableName: PORTFOLIO_TABLE_NAME
    };
    await awsDynamoService.deleteItem(params);
}