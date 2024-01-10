const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const url = require('url');
const util = require('util');
const debug = util.debuglog('workers');
const _data = require('./data');
const _logs = require('./logs');
const { trimStringIfValid, isValidProtocol, isValidMethod, isValidTimeoutSeconds, isValidState, isValidInteger, sendTwilioSms, isValidArray } = require('./helpers');

const log = (originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck) => {
    // Form the log data
    const logData = {
        check: originalCheckData,
        outcome: checkOutcome,
        state,
        alert: alertWarranted,
        time: timeOfCheck
    };

    // Convert data to a string
    const logString = JSON.stringify(logData);

    // Determine the name of the log file
    const logFileName = originalCheckData.id;

    // Append the log string to the file
    _logs.append(logFileName, logString, err => {
        if (err) return debug('\x1b[31m%s\x1b[0m', 'Logging to file failed');
        debug('\x1b[32m%s\x1b[0m', 'Logging to file succeeded');
    });
}

const alertUserToStatusChange = newCheckData => {
    const { state, lastChecked, protocol, url, method, successCodes } = newCheckData;
    const msg = `Alert: Your check for ${method.toUpperCase()} ${protocol}://${url} is currently ${state}. Last checked: ${lastChecked}`;
    sendTwilioSms(newCheckData.phone, msg, err => {
        if (err) return debug('\x1b[31m%s\x1b[0m', 'Could not send sms alert to user who had a state change in their check.', err);
        debug('Success: User was alerted to a status change in their check via sms', msg);
    });
}

const processCheckOutcome = (checkOutcome, originalCheckData) => {
    const { error, responseCode } = checkOutcome;
    // Decide if the check is considered up or down
    const state = !error && responseCode && originalCheckData.successCodes.includes(responseCode) ? 'up' : 'down';

    // Decide if an alert is warranted
    const alertWarranted = originalCheckData.lastChecked && originalCheckData.state !== state;

    // Log the outcome
    const timeOfCheck = Date.now();
    log(originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck);

    // Update the check data
    const newCheckData = originalCheckData;
    newCheckData.state = state;
    newCheckData.lastChecked = timeOfCheck;

    // Save the updates
    _data.update('checks', newCheckData.id, newCheckData, err => {
        if (err) return debug('\x1b[31m%s\x1b[0m', 'Error trying to save updates to one of the checks');
        if (alertWarranted) return alertUserToStatusChange(newCheckData);
        debug('\x1b[33m%s\x1b[0m', 'Check outcome has not changed, no alert needed');
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
    if (requiredKeys.some(key => !originalCheckData[key])) return debug('\x1b[31m%s\x1b[0m', 'One of the checks is not properly formatted. Skipping it!');

    performCheck(originalCheckData);
}

const allChecks = () => _data.list('checks', (err, checks) => {
    if (err || !checks || checks.length === 0) return debug('\x1b[31m%s\x1b[0m', 'Could not find any checks to process');
    checks.forEach(check => {
        // Read in the check data
        _data.read('checks', check, (err, originalCheckData) => {
            if (err || !originalCheckData) return debug('\x1b[31m%s\x1b[0m', 'Could not read check data');
            // Pass it to the check validator, and let that function continue or log errors as needed
            validateCheckData(originalCheckData);
        });
    });
});

const compressLogs = () => {
    // List all the (non compressed) log files
    _logs.list(false, (err, logs) => {
        if (err || !logs || logs.length === 0) return debug('\x1b[31m%s\x1b[0m', 'Could not find any logs to compress');
        logs.forEach(log => {
            const logId = log.replace('.log', '');
            const newFileId = `${logId}-${Date.now()}`;
            _logs.compress(logId, newFileId, err => {
                if (err) return debug('\x1b[31m%s\x1b[0m', 'Error compressing one of the log files', err);
                _logs.truncate(logId, err => {
                    if (err) return debug('\x1b[31m%s\x1b[0m', 'Error truncating log file', err);
                    debug('\x1b[32m%s\x1b[0m', 'Success truncating log file');
                });
            });
        });
    });
}


const startWorkers = () => {
    console.log('\x1b[33m%s\x1b[0m', 'Background workers are running')
    // Execute all the checks immediately
    allChecks();

    // Execute all checks periodically (every minute)
    setInterval(() => allChecks, 60 * 1000);

    // Compress all the logs immediately
    compressLogs();

    // Compress all logs periodically (every 24 hours)
    setInterval(() => compressLogs, 24 * 60 * 60 * 1000);
}



module.exports = { startWorkers };
