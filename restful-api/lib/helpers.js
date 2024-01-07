const crypto = require('crypto');
const { hashingSecret } = require('./config');

const hash = (str) => typeof (str) === 'string' && str.length > 0 && crypto.createHmac('sha256', hashingSecret).update(str).digest('hex');
const parseJsonToObject = (str) => {
    try {
        return JSON.parse(str);
    } catch (e) {
        return {};
    }
}
const trimFieldIfValid = (field, minLength = 0) => typeof (field) === 'string' && field.trim().length > minLength && field.trim();

module.exports = { hash, parseJsonToObject, trimFieldIfValid };
