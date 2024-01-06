// Dependencies
const http = require('http');
const https = require('https');
const url = require('url');
const stringDecoder = require('string_decoder').StringDecoder;
const fs = require('fs');
const { httpPort, httpsPort, envName } = require('./config');

// Instantiate the HTTP server
const httpServer = http.createServer((req, res) => unifiedServer(req, res));

// Start the server
httpServer.listen(httpPort, () => {
  console.log(`Server listening on port ${httpPort} in ${envName} mode`);
});

// Instantiate the HTTPS server
const httpsServerOptions = {
  key: fs.readFileSync('./https/key.pem'),
  cert: fs.readFileSync('./https/cert.pem'),
};
const httpsServer = https.createServer(httpsServerOptions, (req, res) => unifiedServer(req, res));

// Start the HTTPS server
httpsServer.listen(httpsPort, () => {
  console.log(`Server listening on port ${httpsPort} in ${envName} mode`);
});

// Define the handlers
const handlers = {};
handlers.sample = (data, callback) => {
  // Callback a http status code, and a payload object
  callback(406, { 'name': 'sample handler' })
};
handlers.ping = (data, callback) => callback(200);
handlers.notFound = (data, callback) => callback(404);

// Define a request router (mapping between the path and the handler)
const router = {
  sample: handlers.sample,
  ping: handlers.ping,
};

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
    const chosenHandler = router[trimmedPath] ?? handlers.notFound;

    // Construct the data object to send to the handler
    const data = {
      trimmedPath,
      queryStringObject,
      method,
      headers,
      payload
    };

    // Route the request to the handler specified in the router
    chosenHandler(data, (statusCode, payload) => {
      statusCode = typeof statusCode === 'number' ? statusCode : 200;
      payload = typeof payload === 'object' ? payload : {};
      const payloadString = JSON.stringify(payload);
      // Send the response
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(statusCode);
      res.end(payloadString);

      console.log('Returning this response:', statusCode, payloadString);
    });

    console.log('Request received with the headers:', headers);
    console.log('Request received with the payload:', payload);
    console.log(
      `Request received on path '${trimmedPath}' with method '${method}' and query string:`,
      queryStringObject
    );
  });
};
