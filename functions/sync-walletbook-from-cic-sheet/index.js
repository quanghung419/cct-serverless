const AwsDynamoService = require('/opt/nodejs/aws-sdk/dynamodb.service');
const { WALLET_BOOK_TABLE_NAME } = process.env;
const { responseTemplate } = require("/opt/nodejs/utils/response.template");

exports.handler = async (event) => {
    try {
        console.log("SYNC WALLET BOOK", event.body);
        const walletArr = JSON.parse(event.body);
        await clearData();
        const awsDynamoService = new AwsDynamoService();
        for (let i = 0; i < walletArr.length; i++) {
            const wallet = walletArr[i];
            if (!wallet.address) {
                continue;
            }
            const requestParams = {
                TableName: WALLET_BOOK_TABLE_NAME,
                Item: {
                    address: {
                        S: wallet.address
                    },
                    network: {
                        S: wallet.network
                    },
                    exchange: {
                        S: wallet.exchange
                    },
                    isActive: {
                        BOOL: wallet.isActive
                    },
                }
            };
            console.log("wallet", wallet, "requestParams", requestParams);
            const result = await awsDynamoService.addItem(requestParams);
            console.log("Add DynamoDB", result);
        }
        return responseTemplate(200, walletArr);
    } catch (error) {
        console.log("An error occur when fetch Wallet Book", error);
        return responseTemplate(500, error);

    }
};

const clearData = async () => {
    const awsDynamoService = new AwsDynamoService();
    const scanParams = {
        ProjectionExpression: "address",
        TableName: WALLET_BOOK_TABLE_NAME,
    };
    const scanResult = await awsDynamoService.scanItem(scanParams);
    for (let item of scanResult.Items) {
        await deleteItem(item, awsDynamoService);
    }
};

const deleteItem = async (item, awsDynamoService) => {
    const params = {
        Key: {
            "address": {
                S: item.address
            }
        },
        TableName: WALLET_BOOK_TABLE_NAME
    };
    await awsDynamoService.deleteItem(params);
}