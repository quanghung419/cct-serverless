const _ = require('lodash');
const DateUtilities = require('./date-utilities');
const CryptoUtilities = require('./crypto-utilities');
const moment = require('moment');
const Big = require('big.js');

module.exports = class MergeTrade {

    static mergeTradeIntoOrder(transactions) {
        if (!transactions || !transactions.length) {
            return [];
        }

        const group = _.groupBy(transactions, function (tran) {
            return `Order:${tran.order_id}-Fee:${tran.fee_asset}-Day:${tran.datetime.split(" ")[0]}`;
        });
        const orderTrades = [];
        const keys = Object.keys(group);
        for (const key of keys) {
            const trades = group[key];
            if (trades.length === 1) {
                orderTrades.push(trades[0]);
                continue;
            } else {
                const groupTrade = Object.assign({}, trades[0]);
                groupTrade.combine_trades = `${groupTrade.trade_id} - `;

                let tmpFilledAmount = new Big(groupTrade.filled_amount || 0);
                let tmpFeeAmount = new Big(groupTrade.fee_amount || 0);
                let tmpCostAmount = new Big(groupTrade.cost_amount || 0);

                for (let i = 1; i < trades.length; i++) {
                    const subTrade = trades[i];
                    tmpFilledAmount = tmpFilledAmount.plus(subTrade.filled_amount || 0);
                    tmpFeeAmount = tmpFeeAmount.plus(subTrade.fee_amount || 0);
                    tmpCostAmount = tmpCostAmount.plus(subTrade.cost_amount || 0);
                    groupTrade.is_group = true;
                    groupTrade.combine_trades += `${subTrade.trade_id} - `;
                }
                groupTrade.filled_amount = tmpFilledAmount.valueOf();
                groupTrade.fee_amount = tmpFeeAmount.valueOf();
                groupTrade.cost_amount = tmpCostAmount.valueOf();
                orderTrades.push(groupTrade);
            }
        }
        orderTrades.sort(function (a, b) {
            return new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
        });
        return orderTrades;
    }

    static mergeTransfer(transactions) {
        if (!transactions || !transactions.length) {
            return [];
        }

        const group = _.groupBy(transactions, function (tran) {
            const key = `${tran.currency}|${tran.feeCurrency}|${tran.toAddress}|${tran.fromAddress}|${DateUtilities.convertUnixTimestampToDateStr(new moment(tran.date).valueOf(), "YYYY/MM/DD")}`;
            console.log("mergeTransfer key", key);
            return CryptoUtilities.generateHash(key);
        });

        console.log("group", JSON.stringify(group));

        const finalTrans = [];
        const keys = Object.keys(group);
        for (const key of keys) {
            const trans = group[key];
            if (trans.length === 1) {
                finalTrans.push(trans[0]);
                continue;
            } else {
                const groupTrans = Object.assign({}, trans[0]);
                let tmpAmount = new Big(groupTrans.amount || 0);
                let feeAmount = new Big(groupTrans.fee || 0);
                for (let i = 1; i < trans.length; i++) {
                    const subTrans = trans[i];
                    tmpAmount = tmpAmount.plus(subTrans.amount || 0);
                    feeAmount = feeAmount.plus(subTrans.fee || 0);
                    groupTrans.is_group = true;
                }
                groupTrans.amount = tmpAmount.valueOf();
                groupTrans.fee = feeAmount.valueOf();
                finalTrans.push(groupTrans);
            }
        }
        return finalTrans;
    }
}
