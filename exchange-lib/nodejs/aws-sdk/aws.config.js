const AWS = require('aws-sdk');

AWS.config.apiVersions = {
    dynamodb: '2012-08-10',
    sqs: '2012-11-05',
};

module.exports = AWS;