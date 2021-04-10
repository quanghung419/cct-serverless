const AwsDynamoService = require("../aws-sdk/dynamodb.service");
const { WALLET_BOOK_TABLE_NAME } = process.env;
const _ = require('lodash');

module.exports.getWalletBook = async () => {
    const awsDynamoService = new AwsDynamoService();
    const scanParams = {
        ProjectionExpression: "address, exchange, network",
        TableName: WALLET_BOOK_TABLE_NAME,
    };
    const scanResult = await awsDynamoService.scanItem(scanParams);
    return _.groupBy(scanResult.Items, (item) => {
        return item.address.toLowerCase()
    });
};