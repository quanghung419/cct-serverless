const AWS = require('./aws.config');

module.exports = class AwsDynamoService {
    constructor() {
        this.dynamodb = new AWS.DynamoDB();
    }

    async addItem(requestParams) {
        const request = this.dynamodb.putItem(requestParams);
        const result = await request.promise().catch((e) => {
            console.log("DynamoDB put item error", e);
        });
        return result;
    }

    async queryItem(requestParams) {
        try {
            const docClient = new AWS.DynamoDB.DocumentClient();
            const request = docClient.query(requestParams);
            const result = await request.promise().catch((e) => {
                console.log("DynamoDB query item error", e);
            });
            return result;
        } catch (error) {
            console.log("DynamoDB query error", error);
        }
    }

    async scanItem(requestParams) {
        try {
            const docClient = new AWS.DynamoDB.DocumentClient();
            const request = docClient.scan(requestParams, onScan);
            const result = await request.promise().catch((e) => {
                console.log("DynamoDB scan item error", e);
            });
            return result;
        } catch (error) {
            console.log("DynamoDB query error", error);
        }
    }

    async deleteItem(params) {
        const request = this.dynamodb.deleteItem(params);
        return await request.promise().catch((e) => {
            console.log("DynamoDB delete item error", e);
        });
    }

}

function onScan(err, data) {
    if (err) {
        console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
    } 
}