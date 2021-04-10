const axios = require('axios');
const { BSCSCAN_API_KEY, ETHERSCAN_API_KEY } = process.env;

module.exports = class TransactionMetadataApi {
    static async bscscan(txid) {
        if (!BSCSCAN_API_KEY) {
            return null;
        }
        const url = `https://api.bscscan.com/api?module=proxy&action=eth_getTransactionByHash&txhash=${txid}&apikey=${BSCSCAN_API_KEY}`;
        const response = await axios.get(url);
        if (response.data && response.data.result) {
            const { from, to } = response.data.result;
            return {
                from, to
            }
        }
        return null;
    }

    static async etherscan(txid) {
        if (!ETHERSCAN_API_KEY) {
            return null;
        }
        const url = `https://api.etherscan.io/api?module=proxy&action=eth_getTransactionByHash&txhash=${txid}&apikey=${ETHERSCAN_API_KEY}`;
        const response = await axios.get(url);
        if (response.data && response.data.result) {
            const { from, to } = response.data.result;
            return {
                from, to
            }
        }
        return null;
    }
}
