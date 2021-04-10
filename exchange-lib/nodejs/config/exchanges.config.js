const ccxt = require('ccxt');

const {
    BINANCE_EXCHANGE_API_KEY,
    BINANCE_EXCHANGE_SECRET_KEY,
    HUOBIPRO_EXCHANGE_API_KEY,
    HUOBIPRO_EXCHANGE_SECRET_KEY,
    FTX_EXCHANGE_API_KEY,
    FTX_EXCHANGE_SECRET_KEY,
} = process.env;

const binance = new ccxt.binance({
    apiKey: BINANCE_EXCHANGE_API_KEY,
    secret: BINANCE_EXCHANGE_SECRET_KEY,
    enableRateLimit: true,
    timeout: 30000,
});

const huobipro = new ccxt.huobipro({
    apiKey: HUOBIPRO_EXCHANGE_API_KEY,
    secret: HUOBIPRO_EXCHANGE_SECRET_KEY,
    enableRateLimit: true,
    timeout: 30000,
});

const ftx = new ccxt.ftx({
    apiKey: FTX_EXCHANGE_API_KEY,
    secret: FTX_EXCHANGE_SECRET_KEY,
    enableRateLimit: true,
    timeout: 30000,
});

module.exports = {
    binance,
    huobipro,
    ftx
};