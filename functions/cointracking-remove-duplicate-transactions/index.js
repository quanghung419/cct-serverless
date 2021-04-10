const CoinTrackingService = require('/opt/nodejs/service/coin-tracking.service');
const CryptoUtilities = require('/opt/nodejs/utils/crypto-utilities');
const { responseTemplate } = require('/opt/nodejs/utils/response.template');
const _ = require('lodash');

exports.handler = async (event) => {
    try {
        const coinTrackingService = new CoinTrackingService();
        const response = await coinTrackingService.getTransaction();
        const transactions = response.data.data;

        console.log("all transactions", transactions);
        for (const tran of transactions) {
            const { buy, buy_coin, sell, sell_coin, fee, fee_coin, csv2, trade_group, kommentar, eintrag, tt } = tran;
            const dataKey = `${buy}|${buy_coin}|${sell}|${sell_coin}|${fee}|${fee_coin}|${csv2}|${trade_group}|${kommentar}|${tt}`;
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

        console.log("all transactions group", group);

        const removeResult = await coinTrackingService.removeTransaction(deleteRowArr);
        console.log("removeResult", removeResult);

        return responseTemplate(200, {
            deleteRowArr,
            group,
            transactions
        });
    } catch (error) {
        console.log("Handle insert Cointracking error", error);
    }
};