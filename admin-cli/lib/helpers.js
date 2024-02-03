const crypto = require('crypto');
const https = require('https');
const querystring = require('querystring');
const path = require('path');
const fs = require('fs');
const { hashingSecret, templateGlobals, twilio } = require('./config');

/*
 * Helper functions
 */

// Create a SHA256 hash
const hash = (str) =>
  typeof str === 'string' && str.length > 0 && crypto.createHmac('sha256', hashingSecret).update(str).digest('hex');

// Parse a JSON string to an object in all cases, without throwing
const parseJsonToObject = (str) => {
  try {
    return JSON.parse(str);
  } catch (e) {
    return {};
  }
};

// Send an SMS via Twilio
const sendTwilioSms = (phone, msg, callback) => {
  phone = trimStringIfValid(phone, 9, 10);
  msg = trimStringIfValid(msg, 0, 1600);

  if (!phone || !msg) return callback('Given parameters were missing or invalid');

  const payload = {
    From: twilio.fromPhone,
    To: `+44${phone}`,
    Body: msg,
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
      'Content-Length': Buffer.byteLength(stringPayload),
    },
  };

  const req = https.request(requestDetails, ({ statusCode }) =>
    statusCode === 200 || statusCode === 201 ? callback(false) : callback(`Status code returned was ${statusCode}`),
  );

  // Bind to the error event so it doesn't get thrown
  req.on('error', (e) => callback(e));

  // Add the payload
  req.write(stringPayload);

  // End the request
  req.end();
};

// Take a given string and a data object and find/replace all the keys within it
const interpolate = (str, data) => {
  str = trimStringIfValid(str);
  if (!str) return '';

  data = typeof data === 'object' && data !== null ? data : {};

  // Add the templateGlobals to the data object, prepending their key name with 'global.'
  Object.keys(templateGlobals).forEach((keyName) => (data[`global.${keyName}`] = templateGlobals[keyName]));

  // For each key in the data object, insert its value into the string at the corresponding placeholder
  Object.keys(data).forEach((key) => {
    if (typeof data[key] === 'string') {
      const replace = data[key];
      const find = `{${key}}`;
      str = str.replace(find, replace);
    }
  });

  return str;
};

// Get the string content of a template, and use provided data for string interpolation
const getTemplate = (templateName, data, callback) => {
  templateName = trimStringIfValid(templateName);
  data = typeof data === 'object' && data !== null ? data : {};
  if (!templateName) return callback('A valid template name was not specified');

  fs.readFile(path.join(__dirname, '../templates/', `${templateName}.html`), 'utf8', (err, str) => {
    if (err || !str || str.length === 0) return callback('No template could be found');

    // Do interpolation on the string
    const finalString = interpolate(str, data);
    callback(false, finalString);
  });
};

// Add the universal header and footer to a string, and pass provided data object to the header and footer for interpolation
const addUniversalTemplates = (str, data, callback) => {
  str = trimStringIfValid(str);
  if (!str) return callback('A valid string was not specified');

  data = typeof data === 'object' && data !== null ? data : {};

  getTemplate('header', data, (err, headerString) => {
    if (err || !headerString) return callback('Could not find the header template');

    getTemplate('footer', data, (err, footerString) => {
      if (err || !footerString) return callback('Could not find the footer template');

      const fullString = `${headerString}${str}${footerString}`;
      callback(false, fullString);
    });
  });
};

// Get the contents of a static (public) asset
const getStaticAsset = (fileName, callback) => {
  fileName = trimStringIfValid(fileName);
  if (!fileName) return callback('A valid file name was not specified');

  fs.readFile(path.join(__dirname, '../public/', fileName), (err, data) => {
    if (err || !data) return callback('No file could be found');

    callback(false, data);
  });
};

// Sample for testing
const getANumber = () => 1;

/*
 * Validation functions
 */
const trimStringIfValid = (field, minLength = 0, maxLength = 0) =>
  isValidString(field, minLength, maxLength) && field.trim();
const isValidString = (field, minLength, maxLength) =>
  typeof field === 'string' &&
  field.trim().length > minLength &&
  (maxLength > 0 ? field.trim().length <= maxLength : true);
const isValidInteger = (field) => typeof field === 'number' && field % 1 === 0 && field > 0;
const isValidArray = (field) => typeof field === 'object' && field instanceof Array && field.length > 0;
const isValidProtocol = (protocol) => typeof protocol === 'string' && ['http', 'https'].includes(protocol);
const isValidMethod = (method) => typeof method === 'string' && ['post', 'get', 'put', 'delete'].includes(method);
const isValidTimeoutSeconds = (timeoutSeconds) =>
  typeof timeoutSeconds === 'number' && timeoutSeconds % 1 === 0 && timeoutSeconds >= 1 && timeoutSeconds <= 5;
const isValidState = (state) => typeof state === 'string' && ['up', 'down'].includes(state);
const isValidUUID = (uuid) =>
  typeof uuid === 'string' &&
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(uuid);

module.exports = {
  addUniversalTemplates,
  getANumber,
  getTemplate,
  getStaticAsset,
  hash,
  parseJsonToObject,
  trimStringIfValid,
  isValidInteger,
  isValidProtocol,
  isValidMethod,
  isValidArray,
  isValidTimeoutSeconds,
  isValidUUID,
  sendTwilioSms,
  isValidState,
};
