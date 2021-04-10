const AWS = require('./aws.config');

module.exports = class SqsService {
    constructor() {
        this.sqs = new AWS.SQS();
    }

    async sendMessage(sqsQueueUrl, data) {
        const params = {
            DelaySeconds: 10,
            MessageBody: JSON.stringify(data),
            QueueUrl: sqsQueueUrl
        };

        const request = this.sqs.sendMessage(params);
        return await request.promise().catch((e) => {
            console.log("send message error", e);
        });
    }

    async receiveMessage(sqsQueueUrl) {
        const params = {
            AttributeNames: [
                "SentTimestamp"
            ],
            MaxNumberOfMessages: 10,
            MessageAttributeNames: [
                "All"
            ],
            QueueUrl: sqsQueueUrl,
            VisibilityTimeout: 30,
            WaitTimeSeconds: 20
        }
        const request = this.sqs.receiveMessage(params);
        return await request.promise().catch((e) => {
            console.log("receiveMessageError", e);
            return {Messages: []};
        });
    }

    async deleteMessage(sqsQueueUrl, receiptHandle) {
        const deleteParams = {
            QueueUrl: sqsQueueUrl,
            ReceiptHandle: receiptHandle
        };
        const request = this.sqs.deleteMessage(deleteParams);
        return await request.promise().catch((e) => {
            console.log("SQS Delete Message Error", e);
            return {};
        });
    }

}
