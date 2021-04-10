const AwsDynamoService = require('/opt/nodejs/aws-sdk/dynamodb.service');
const { responseTemplate } = require('/opt/nodejs/utils/response.template');
const _ = require('lodash');

exports.handler = async (event) => {
    try {
        if (!event.body) {
            return responseTemplate(500, 'Request body is empty');
        }
        const { projectionExpression, tableName } = JSON.parse(event.body);
        const data = await getTableData(projectionExpression, tableName);
        return responseTemplate(200, data);
    } catch (error) {
        console.log("Scan DynamoDB table error", error);
    }
};

const getTableData = async (projectionExpression, tableName) => {
    const awsDynamoService = new AwsDynamoService();
    const scanParams = {
        ProjectionExpression: projectionExpression, //"coinKey, cointrackingId, symbol",
        TableName: tableName,
    };
    console.log("scanParams", scanParams);
    const scanResult = await awsDynamoService.scanItem(scanParams);
    return _.keyBy(scanResult.Items, 'symbol');
}
