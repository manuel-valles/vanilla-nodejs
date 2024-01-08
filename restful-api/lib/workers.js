const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const url = require('url');
const _data = require('./data');
const { trimStringIfValid, isValidProtocol, isValidMethod, isValidTimeoutSeconds, isValidState, isValidInteger, sendTwilioSms, isValidArray } = require('./helpers');


const alertUserToStatusChange = newCheckData => {
    const { state, lastChecked, protocol, url, method, successCodes } = newCheckData;
    const msg = `Alert: Your check for ${method.toUpperCase()} ${protocol}://${url} is currently ${state}. Last checked: ${lastChecked}`;
    sendTwilioSms(newCheckData.phone, msg, err => {
        if (err) return console.error('Could not send sms alert to user who had a state change in their check.', err);
        console.info('Success: User was alerted to a status change in their check via sms', msg);
    });
}

const processCheckOutcome = ({ error, responseCode }, originalCheckData) => {
    // Decide if the check is considered up or down
    const state = !error && responseCode && originalCheckData.successCodes.includes(responseCode) ? 'up' : 'down';

    // Decide if an alert is warranted
    const alertWarranted = originalCheckData.lastChecked && originalCheckData.state !== state;

    // Update the check data
    const newCheckData = originalCheckData;
    newCheckData.state = state;
    newCheckData.lastChecked = Date.now();

    // Save the updates
    _data.update('checks', newCheckData.id, newCheckData, err => {
        if (err) return console.error('Error trying to save updates to one of the checks');
        if (alertWarranted) return alertUserToStatusChange(newCheckData);
        console.info('Check outcome has not changed, no alert needed');
    });
}

const performCheck = originalCheckData => {
    const { protocol, url: originalUrl, method, timeoutSeconds } = originalCheckData;

    // Initial check outcome
    const checkOutcome = {
        error: false,
        responseCode: false
    };

    // Mark that the outcome has not been sent yet
    let outcomeSent = false;

    // Parse the hostname and path out of the original check data
    const parsedUrl = url.parse(`${protocol}://${originalUrl}`, true);
    const { hostname, path } = parsedUrl;

    const requestDetails = {
        protocol: `${protocol}:`,
        hostname,
        method: method.toUpperCase(),
        path,
        timeout: timeoutSeconds * 1000
    };

    // Instantiate the request object depending on the protocol
    const moduleToUse = protocol === 'http' ? http : https;

    const req = moduleToUse.request(requestDetails, ({ statusCode }) => {
        // Update the checkOutcome and pass the data along
        checkOutcome.responseCode = statusCode;
        if (!outcomeSent) {
            processCheckOutcome(checkOutcome, originalCheckData);
            outcomeSent = true;
        }
    });

    // Bind to the error event so it doesn't get thrown
    req.on('error', (e) => {
        // Update the checkOutcome and pass the data along
        checkOutcome.error = {
            error: true,
            value: e
        }
        if (!outcomeSent) {
            processCheckOutcome(checkOutcome, originalCheckData);
            outcomeSent = true;
        }
    });

    // Bind to the timeout event
    req.on('timeout', (e) => {
        // Update the checkOutcome and pass the data along
        checkOutcome.error = {
            error: true,
            value: 'timeout'
        }
        if (!outcomeSent) {
            processCheckOutcome(checkOutcome, originalCheckData);
            outcomeSent = true;
        }
    });

    // End the request
    req.end();
}


const validateCheckData = originalCheckData => {
    originalCheckData = typeof (originalCheckData) === 'object' && originalCheckData !== null ? originalCheckData : {};
    originalCheckData.id = trimStringIfValid(originalCheckData.id);
    originalCheckData.phone = trimStringIfValid(originalCheckData.phone, 9, 10);
    originalCheckData.protocol = isValidProtocol(originalCheckData.protocol) && originalCheckData.protocol;
    originalCheckData.url = trimStringIfValid(originalCheckData.url);
    originalCheckData.method = isValidMethod(originalCheckData.method) && originalCheckData.method;
    originalCheckData.successCodes = isValidArray(originalCheckData.successCodes) && originalCheckData.successCodes;
    originalCheckData.timeoutSeconds = isValidTimeoutSeconds(originalCheckData.timeoutSeconds) && originalCheckData.timeoutSeconds;

    // Set the keys that may not be set (if the workers have never seen this check before)
    originalCheckData.state = isValidState(originalCheckData.state) ? originalCheckData.state : 'down';
    originalCheckData.lastChecked = isValidInteger(originalCheckData.lastChecked) && originalCheckData.lastChecked;

    const requiredKeys = ['id', 'phone', 'protocol', 'url', 'method', 'successCodes', 'timeoutSeconds'];

    // If all the checks pass, pass the data along to the next step in the process
    if (requiredKeys.some(key => !originalCheckData[key])) return console.error('One of the checks is not properly formatted. Skipping it!');

    performCheck(originalCheckData);
}

const startWorkers = () => setInterval(() =>
    // Get all the checks
    _data.list('checks', (err, checks) => {
        if (err || !checks || checks.length === 0) return console.error('Could not find any checks to process');
        checks.forEach(check => {
            // Read in the check data
            _data.read('checks', check, (err, originalCheckData) => {
                if (err || !originalCheckData) return console.error('Could not read check data');
                // Pass it to the check validator, and let that function continue or log errors as needed
                validateCheckData(originalCheckData);
            });
        });
    }), 60 * 1000); // 1 minute



module.exports = { startWorkers };
