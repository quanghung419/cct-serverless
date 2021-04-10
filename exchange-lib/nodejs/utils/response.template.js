module.exports.responseTemplate = function (httpCode, dataInJson) {
    const response = {};
    response.statusCode = httpCode;
    response.body = JSON.stringify(dataInJson);
    return response;
}