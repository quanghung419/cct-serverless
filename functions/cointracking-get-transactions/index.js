const CoinTrackingService = require('/opt/nodejs/service/coin-tracking.service');
const { responseTemplate } = require('/opt/nodejs/utils/response.template');
const _ = require('lodash');
const CryptoUtilities = require('/opt/nodejs/utils/crypto-utilities');

exports.handler = async (event) => {
    try {
        const coinTrackingService = new CoinTrackingService();
        const transactions = await coinTrackingService.getTransactionFromApi();
        console.log("all transactions", transactions);

        for (const tran of transactions) {
            const { buy_amount, buy_currency, sell_amount, sell_currency, fee_amount, fee_currency, type, exchange, group, comment, time } = tran;
            const dataKey = `${buy_amount}|${buy_currency}|${sell_amount}|${sell_currency}|${fee_amount}|${fee_currency}|${type}|${exchange}|${group}|${comment}|${time}`;
            tran.hash = CryptoUtilities.generateHash(dataKey);
        }
        const group = _.groupBy(transactions, function (tran) {
            return tran.hash;
        });
        const keys = Object.keys(group);

        let deleteRowArr = [];
        for (const key of keys) {
            const rowDuplicated = group[key];
            if (rowDuplicated.length > 1) {
                deleteRowArr = deleteRowArr.concat(rowDuplicated.slice(1));
            }
        }

        return responseTemplate(200, {deleteRowArr, transactions});
    } catch (error) {
        console.log("Handle insert Cointracking error", error);
    }
};