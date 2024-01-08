const crypto = require('crypto');
const https = require('https');
const querystring = require('querystring');
const { hashingSecret, twilio } = require('./config');

const hash = (str) => typeof (str) === 'string' && str.length > 0 && crypto.createHmac('sha256', hashingSecret).update(str).digest('hex');
const parseJsonToObject = (str) => {
    try {
        return JSON.parse(str);
    } catch (e) {
        return {};
    }
}
const sendTwilioSms = (phone, msg, callback) => {
    phone = trimStringIfValid(phone, 9, 10);
    msg = trimStringIfValid(msg, 0, 1600);

    if (!phone || !msg) return callback('Given parameters were missing or invalid');

    const payload = {
        From: twilio.fromPhone,
        To: `+44${phone}`,
        Body: msg
    };

    const stringPayload = querystring.stringify(payload);

    const requestDetails = {
        protocol: 'https:',
        hostname: 'api.twilio.com',
        method: 'POST',
        path: `/2010-04-01/Accounts/${twilio.accountSid}/Messages.json`,
        auth: `${twilio.accountSid}:${twilio.authToken}`,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(stringPayload)
        }
    }

    const req = https.request(requestDetails, ({ statusCode }) => statusCode === 200 || statusCode === 201 ? callback(false) : callback(`Status code returned was ${statusCode}`));

    // Bind to the error event so it doesn't get thrown
    req.on('error', (e) => callback(e));

    // Add the payload
    req.write(stringPayload);

    // End the request
    req.end();
};


const trimStringIfValid = (field, minLength = 0, maxLength = 0) => isValidString(field, minLength, maxLength) && field.trim();
const isValidString = (field, minLength, maxLength) => typeof field === 'string' && field.trim().length > minLength && (maxLength > 0 ? field.trim().length <= maxLength : true);



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
    isValidUUID,
    sendTwilioSms
};
