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
const trimStringIfValid = (field, minLength = 0) => typeof (field) === 'string' && field.trim().length > minLength && field.trim();
const isValidArray = (field) => typeof (field) === 'object' && field instanceof Array && field.length > 0;
const isValidProtocol = (protocol) => typeof (protocol) === 'string' && ['http', 'https'].includes(protocol);
const isValidMethod = (method) => typeof (method) === 'string' && ['post', 'get', 'put', 'delete'].includes(method);
const isValidTimeoutSeconds = (timeoutSeconds) => typeof (timeoutSeconds) === 'number' && timeoutSeconds % 1 === 0 && timeoutSeconds >= 1 && timeoutSeconds <= 5;
const isValidUUID = (uuid) => typeof (uuid) === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(uuid);

module.exports = {
    hash,
    parseJsonToObject,
    trimStringIfValid,
    isValidProtocol,
    isValidMethod,
    isValidArray,
    isValidTimeoutSeconds,
    isValidUUID
};
