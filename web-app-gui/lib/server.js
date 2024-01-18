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
const { accountCreate, accountDeleted, accountEdit, checks, favicon, index, notFound, ping, public, sessionCreate, sessionDeleted, users, tokens } = require('./handlers');
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
    'account/create': accountCreate,
    'account/deleted': accountDeleted,
    'account/edit': accountEdit,
    'api/checks': checks,
    'api/users': users,
    'api/tokens': tokens,
    'favicon.ico': favicon,
    public,
    'session/create': sessionCreate,
    'session/deleted': sessionDeleted,
    // TODO: add handlers for the following routes
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

        // Choose the handler (including the public assets)
        const chosenHandler = trimmedPath.indexOf('public/') > -1 ? public : router[trimmedPath] || notFound;

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

            const setResponse = (contentType) => {
                let payloadString = '';

                if (contentType.includes('json')) {
                    payload = typeof payload === 'object' ? payload : {};
                    payloadString = JSON.stringify(payload);
                } else {
                    payloadString = payload || '';
                }

                // Send the response
                res.setHeader('Content-Type', contentType);
                res.writeHead(statusCode);
                res.end(payloadString);
            };

            switch (contentType) {
                case 'html':
                    setResponse('text/html');
                    break;
                case 'favicon':
                    setResponse('image/x-icon');
                    break;
                case 'css':
                    setResponse('text/css');
                    break;
                case 'png':
                    setResponse('image/png');
                    break;
                case 'jpg':
                    setResponse('image/jpeg');
                    break;
                case 'plain':
                    setResponse('text/plain');
                    break;
                case 'js':
                    setResponse('application/javascript');
                    break;
                default:
                    setResponse('application/json');
                    break;
            }

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
