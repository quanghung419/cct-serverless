const BinaceExchange = require('/opt/nodejs/service/binance.exchange.service');
const { responseTemplate } = require("/opt/nodejs/utils/response.template");

exports.handler = async (event) => {
    try {
        const binanceExchange = new BinaceExchange();
        const result = await binanceExchange.fetchBalance();
        return responseTemplate(200, result);
    } catch (error) {
        console.error("An error occur when fetchBalance", error);
        return responseTemplate(500, error);
    }
};
