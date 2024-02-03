const assert = require('assert');
const http = require('http');
const app = require('../index');
const config = require('../lib/config');

// Holder for the API/integration tests
const api = {};

// Helpers
const makeGetRequest = (path, callback) => {
  // Configure the request details
  const requestDetails = {
    protocol: 'http:',
    hostname: 'localhost',
    port: config.httpPort,
    method: 'GET',
    path,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // Send the request
  const req = http.request(requestDetails, (res) => callback(res));
  req.end();
};

/*
 * API tests
 */
api['app.init should start without throwing'] = (done) => {
  assert.doesNotThrow(() => {
    app.init((_) => done());
  }, TypeError);
};

api['/ping should respond to GET with 200'] = (done) => {
  makeGetRequest('/ping', ({ statusCode }) => {
    assert.equal(statusCode, 200);
    done();
  });
};

api['/api/users should respond to GET with 400'] = (done) => {
  makeGetRequest('/api/users', ({ statusCode }) => {
    assert.equal(statusCode, 400);
    done();
  });
};

api['A random path should respond to GET with 404'] = (done) => {
  makeGetRequest('/non-existing-path', ({ statusCode }) => {
    assert.equal(statusCode, 404);
    done();
  });
};

// Export the API tests to the runner
module.exports = api;
