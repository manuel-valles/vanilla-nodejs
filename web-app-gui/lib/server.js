// Dependencies
const http = require('http');
const https = require('https');
const url = require('url');
const stringDecoder = require('string_decoder').StringDecoder;
const fs = require('fs');
const path = require('path');
const util = require('util');
const debug = util.debuglog('server');
const { httpPort, httpsPort, envName } = require('./config');
const { checks, index, notFound, ping, users, tokens } = require('./handlers');
const { parseJsonToObject } = require('./helpers');

// Instantiate the HTTP server
const httpServer = http.createServer((req, res) => unifiedServer(req, res));

// Instantiate the HTTPS server
const httpsServerOptions = {
    key: fs.readFileSync(path.join(__dirname, '../https/key.pem')),
    cert: fs.readFileSync(path.join(__dirname, '../https/cert.pem'))
};
const httpsServer = https.createServer(httpsServerOptions, (req, res) => unifiedServer(req, res));

// Define a request router (mapping between the path and the handler)
const router = {
    ping,
    '': index,
    'api/checks': checks,
    'api/users': users,
    'api/tokens': tokens,
    // TODO: add handlers for the following routes
    // 'account/create': accountCreate,
    // 'account/edit': accountEdit,
    // 'account/deleted': accountDeleted,
    // 'session/create': sessionCreate,
    // 'session/deleted': sessionDeleted,
    // 'checks/all': checksList,
    // 'checks/create': checksCreate,
    // 'checks/edit': checksEdit,
}


// Handle http and https requests
const unifiedServer = (req, res) => {
    // Get the URL and parse it
    const parsedUrl = url.parse(req.url, true);

    // Get the path
    const path = parsedUrl.pathname;
    const trimmedPath = path.replace(/^\/+|\/+$/g, '');

    // Get the query string as an object
    const queryStringObject = parsedUrl.query;

    // Get the HTTP Method
    const method = req.method.toLowerCase();

    // Get the headers as an object
    const headers = req.headers;

    // Get the payload
    const decoder = new stringDecoder('utf-8');
    let payload = '';
    req.on('data', data => payload += decoder.write(data));
    req.on('end', () => {
        payload += decoder.end();

        // Choose the handler
        const chosenHandler = router[trimmedPath] ?? notFound;

        // Construct the data object to send to the handler
        const data = {
            trimmedPath,
            queryStringObject,
            method,
            headers,
            payload: parseJsonToObject(payload),
        };

        // Route the request to the handler specified in the router
        chosenHandler(data, (statusCode, payload, contentType = 'json') => {
            statusCode = typeof statusCode === 'number' ? statusCode : 200;
            let payloadString = '';

            if (contentType === 'json') {
                res.setHeader('Content-Type', 'application/json');
                payload = typeof payload === 'object' ? payload : {};
                payloadString = JSON.stringify(payload);
            } else if (contentType === 'html') {
                res.setHeader('Content-Type', 'text/html');
                payloadString = typeof payload === 'string' ? payload : '';
            }

            // Send the response
            res.writeHead(statusCode);
            res.end(payloadString);

            statusCode === 200
                ? debug('\x1b[32m%s\x1b[0m', `${method.toUpperCase()} /${trimmedPath} ${statusCode}`)
                : debug('\x1b[31m%s\x1b[0m', `${method.toUpperCase()} /${trimmedPath} ${statusCode}`);

        });
    });
};

const startServer = () => {
    // Start the server
    httpServer.listen(httpPort, () => {
        console.log('\x1b[34m%s\x1b[0m', `Server listening on port ${httpPort} in ${envName} mode`);
    });

    // Start the HTTPS server
    httpsServer.listen(httpsPort, () => {
        console.log('\x1b[30m%s\x1b[0m', `Server listening on port ${httpsPort} in ${envName} mode`);
    });
}

module.exports = { startServer }
