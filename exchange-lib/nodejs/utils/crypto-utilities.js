const crypto = require('crypto');

module.exports = class CryptoUtilities {
    static generateHash(data) {
        const hash = crypto.createHash('sha256');
        return hash.update(data).digest("hex");
    }
}
