const { randomUUID } = require('crypto');
const urlModule = require('url');
const dns = require('dns');
const performance = require('perf_hooks').performance;
const util = require('util');
const debug = util.debuglog('performance');
const { maxChecks } = require('./config');
const _data = require('./data');
const _helpers = require('./helpers');

/*
 * HTML handlers
 */
const index = (data, callback) => {
  if (data.method !== 'get') return callback(405, undefined, 'html');

  // Prepare data for interpolation
  const templateData = {
    'head.title': 'Uptime Monitoring',
    'head.description': 'This is a simple uptime monitoring application made with Node.js',
    'body.class': 'index',
  };

  _helpers.getTemplate('index', templateData, (err, str) => {
    if (err || !str) return callback(500, undefined, 'html');

    // Add the universal header and footer
    _helpers.addUniversalTemplates(str, templateData, (err, str) => {
      if (err || !str) return callback(500, undefined, 'html');

      callback(200, str, 'html');
    });
  });
};

/*
 * JSON API handlers
 */
const _users = {};
_users.post = (data, callback) => {
  const { firstName, lastName, phone, password, tosAgreement } = data.payload;
  const _firstName = _helpers.trimStringIfValid(firstName);
  const _lastName = _helpers.trimStringIfValid(lastName);
  const _phone = _helpers.trimStringIfValid(phone, 9, 10);
  const _password = _helpers.trimStringIfValid(password);

  if (!_firstName || !_lastName || !_phone || !_password || tosAgreement !== true)
    return callback(400, { error: 'Missing required fields' });

  _data.read('users', _phone, (err, data) => {
    if (!err) return callback(400, { error: 'A user with that phone number already exists' });

    const hashedPassword = _helpers.hash(_password);
    if (!hashedPassword) return callback(500, { error: 'Not able to hash the password' });
    const user = {
      firstName: _firstName,
      lastName: _lastName,
      phone: _phone,
      hashedPassword,
      tosAgreement,
    };
    _data.create('users', _phone, user, (err) =>
      !err ? callback(200) : callback(500, { error: 'Could not create the new user' }),
    );
  });
};

_users.get = (data, callback) => {
  const { phone } = data.queryStringObject;
  const { token } = data.headers;
  const _phone = _helpers.trimStringIfValid(phone, 9, 10);

  if (!_phone) return callback(400, { error: 'Missing phone number field' });

  const _token = typeof token === 'string' && token;
  _tokens.verifyToken(_token, _phone, (tokenIsValid) => {
    if (!tokenIsValid) return callback(403, { error: 'Missing required token in header, or token is invalid' });
    _data.read('users', _phone, (err, data) => {
      if (err || !data) return callback(404);
      // Remove sensitive data from response
      delete data.hashedPassword;
      callback(200, data);
    });
  });
};

_users.put = (data, callback) => {
  const { firstName, lastName, phone, password } = data.payload;
  const { token } = data.headers;
  const _firstName = _helpers.trimStringIfValid(firstName);
  const _lastName = _helpers.trimStringIfValid(lastName);
  const _phone = _helpers.trimStringIfValid(phone, 9, 10);
  const _password = _helpers.trimStringIfValid(password);

  if (!_phone) return callback(400, { error: 'Missing phone number field' });
  if (!_firstName && !_lastName && !_password) return callback(400, { error: 'Missing fields to update' });

  const _token = typeof token === 'string' && token;
  _tokens.verifyToken(_token, _phone, (tokenIsValid) => {
    if (!tokenIsValid) return callback(403, { error: 'Missing required token in header, or token is invalid' });

    _data.read('users', _phone, (err, userData) => {
      if (err || !userData) return callback(400, { error: 'The specified user does not exist' });

      if (_firstName) userData.firstName = _firstName;
      if (_lastName) userData.lastName = _lastName;
      if (_password) userData.hashedPassword = _helpers.hash(_password);

      _data.update('users', _phone, userData, (err) =>
        !err ? callback(200) : callback(500, { error: 'Could not update the user' }),
      );
    });
  });
};

_users.delete = (data, callback) => {
  const { phone } = data.queryStringObject;
  const _phone = _helpers.trimStringIfValid(phone, 9, 10);

  if (!_phone) return callback(400, { error: 'Missing phone number field' });

  const { token } = data.headers;
  const _token = typeof token === 'string' && token;
  if (!_token) return callback(403, { error: 'Missing required token in headers' });

  _tokens.verifyToken(_token, _phone, (tokenIsValid) => {
    if (!tokenIsValid) return callback(403, { error: 'Invalid token' });

    _data.read('users', _phone, (err, data) => {
      if (err || !data) return callback(400, { error: 'The specified user does not exist' });

      _data.remove('users', _phone, (err) => {
        if (err) return callback(500, { error: 'Could not delete the specified user' });

        const userChecks = _helpers.isValidArray(data.checks) ? data.checks : [];
        const checksToDelete = userChecks.length;
        if (checksToDelete === 0) return callback(200);

        let checksDeleted = 0;
        let deletionErrors = false;
        userChecks.forEach((checkId) => {
          _data.remove('checks', checkId, (err) => {
            if (err) deletionErrors = true;
            checksDeleted++;
            if (checksDeleted === checksToDelete) {
              if (!deletionErrors) return callback(200);
              callback(500, { error: "Errors encountered while attempting to delete all of the user's checks" });
            }
          });
        });
      });
    });
  });
};

const users = (data, callback) => {
  allowedMethods = ['post', 'get', 'put', 'delete'];
  if (allowedMethods.indexOf(data.method) > -1) {
    _users[data.method](data, callback);
  } else {
    callback(405);
  }
};

const _tokens = {};

_tokens.post = (data, callback) => {
  performance.mark('entered function');
  const { phone, password } = data.payload;
  const _phone = _helpers.trimStringIfValid(phone, 9, 10);
  const _password = _helpers.trimStringIfValid(password);
  performance.mark('inputs validated');

  if (!_phone || !_password) return callback(400, { error: 'Missing required fields' });

  performance.mark('beginning user lookup');
  _data.read('users', _phone, (err, userData) => {
    performance.mark('user lookup complete');
    if (err || !userData) return callback(400, { error: 'Could not find the specified user' });

    performance.mark('beginning password hashing');
    const hashedPassword = _helpers.hash(_password);
    performance.mark('password hashing complete');
    if (hashedPassword !== userData.hashedPassword) return callback(400, { error: 'Invalid credentials' });

    performance.mark('creating data for token');
    const id = randomUUID();
    const expires = Date.now() + 60 * 60 * 1000; // 1 hour
    const token = {
      id,
      expires,
      phone: _phone,
    };

    performance.mark('beginning storing token');
    _data.create('tokens', id, token, (err) => {
      performance.mark('storing token complete');

      // Gather measurements
      performance.measure('Beginning to end', 'entered function', 'storing token complete');
      performance.measure('Validating user inputs', 'entered function', 'inputs validated');
      performance.measure('User lookup', 'beginning user lookup', 'user lookup complete');
      performance.measure('Password hashing', 'beginning password hashing', 'password hashing complete');
      performance.measure('Token data creation', 'creating data for token', 'beginning storing token');
      performance.measure('Token storing', 'beginning storing token', 'storing token complete');

      // Log out them
      const measurements = performance.getEntriesByType('measure');
      measurements.forEach((measurement) => {
        debug('\x1b[33m%s\x1b[0m', `${measurement.name} ${measurement.duration}`);
      });

      !err ? callback(200, token) : callback(500, { error: 'Could not create a token' });
    });
  });
};

_tokens.get = (data, callback) => {
  const { id } = data.queryStringObject;
  if (!_helpers.isValidUUID(id)) return callback(400, { error: 'Missing ID field' });

  _data.read('tokens', id, (err, data) => (!err && data ? callback(200, data) : callback(404)));
};

_tokens.put = (data, callback) => {
  const { id, extend } = data.payload;

  if (!_helpers.isValidUUID(id) || extend !== true)
    return callback(400, { error: 'Missing required fields or invalid fields' });

  _data.read('tokens', id, (err, tokenData) => {
    if (err || !tokenData) return callback(400, { error: 'The specified token does not exist' });

    if (tokenData.expires < Date.now())
      return callback(400, { error: 'The token has already expired and cannot be extended' });

    tokenData.expires = Date.now() + 60 * 60 * 1000;

    _data.update('tokens', id, tokenData, (err) =>
      !err ? callback(200) : callback(500, { error: 'Could not update the token' }),
    );
  });
};

_tokens.delete = (data, callback) => {
  const { id } = data.queryStringObject;
  if (!_helpers.isValidUUID(id)) return callback(400, { error: 'Missing ID field' });

  _data.read('tokens', id, (err, data) => {
    if (err || !data) return callback(400, { error: 'The specified token does not exist' });

    _data.remove('tokens', id, (err) =>
      !err ? callback(200) : callback(500, { error: 'Could not delete the specified token' }),
    );
  });
};

_tokens.verifyToken = (id, phone, callback) =>
  _data.read('tokens', id, (err, tokenData) =>
    !err && tokenData && tokenData.phone === phone && tokenData.expires > Date.now() ? callback(true) : callback(false),
  );

const tokens = (data, callback) => {
  allowedMethods = ['post', 'get', 'put', 'delete'];
  if (allowedMethods.indexOf(data.method) > -1) {
    _tokens[data.method](data, callback);
  } else {
    callback(405);
  }
};

const _checks = {};

_checks.post = (data, callback) => {
  const { protocol, url, method, successCodes, timeoutSeconds } = data.payload;
  const _protocol = _helpers.isValidProtocol(protocol) && protocol;
  const _url = _helpers.trimStringIfValid(url);
  const _method = _helpers.isValidMethod(method) && method;
  const _successCodes = _helpers.isValidArray(successCodes) && successCodes;
  const _timeoutSeconds = _helpers.isValidTimeoutSeconds(timeoutSeconds) && timeoutSeconds;

  if (!_protocol || !_url || !_method || !_successCodes || !_timeoutSeconds)
    return callback(400, { error: 'Missing required inputs or inputs are invalid' });

  const { token } = data.headers;
  const _token = typeof token === 'string' && token;

  if (!_token) return callback(403, { error: 'Missing required token in headers' });

  _data.read('tokens', _token, (err, tokenData) => {
    if (err || !tokenData) return callback(403, { error: 'Invalid token' });

    const { phone } = tokenData;

    _data.read('users', phone, (err, userData) => {
      if (err || !userData) return callback(403);

      const userChecks = _helpers.isValidArray(userData.checks) ? userData.checks : [];
      if (userChecks.length >= maxChecks)
        return callback(400, { error: `The user already has the maximum number of ${maxChecks} checks` });

      // Verify that the URL given has DNS entries to avoid adding checks to invalid domains
      const parsedUrl = urlModule.parse(`${_protocol}://${_url}`, true);
      const hostName = typeof parsedUrl.hostname === 'string' && parsedUrl.hostname.length > 0 && parsedUrl.hostname;
      dns.resolve(hostName, (err, records) => {
        if (err || !records) return callback(400, { error: 'URL did not resolve to any DNS entries' });

        const id = randomUUID();
        const check = {
          id,
          phone,
          protocol: _protocol,
          url: _url,
          method: _method,
          successCodes: _successCodes,
          timeoutSeconds: _timeoutSeconds,
        };

        _data.create('checks', id, check, (err) => {
          if (err) return callback(500, { error: 'Could not create the new check' });

          userData.checks = userChecks;
          userData.checks.push(id);
          _data.update('users', phone, userData, (err) =>
            !err ? callback(200, check) : callback(500, { error: 'Could not update the user with the new check' }),
          );
        });
      });
    });
  });
};

_checks.get = (data, callback) => {
  const { id } = data.queryStringObject;
  if (!_helpers.isValidUUID(id)) return callback(400, { error: 'Missing ID field' });

  const { token } = data.headers;
  const _token = typeof token === 'string' && token;
  if (!_token) return callback(403, { error: 'Missing required token in headers' });

  _data.read('checks', id, (err, checkData) => {
    if (err || !checkData) return callback(404);
    _tokens.verifyToken(_token, checkData.phone, (tokenIsValid) => {
      if (!tokenIsValid) return callback(403, { error: 'Invalid token' });
      callback(200, checkData);
    });
  });
};

_checks.put = (data, callback) => {
  const { id, protocol, url, method, successCodes, timeoutSeconds } = data.payload;
  const _id = _helpers.isValidUUID(id) && id;
  const _protocol = _helpers.isValidProtocol(protocol) && protocol;
  const _url = _helpers.trimStringIfValid(url);
  const _method = _helpers.isValidMethod(method) && method;
  const _successCodes = _helpers.isValidArray(successCodes) && successCodes;
  const _timeoutSeconds = _helpers.isValidTimeoutSeconds(timeoutSeconds) && timeoutSeconds;

  if (!_id) return callback(400, { error: 'Missing required ID field' });
  if (!_protocol && !_url && !_method && !_successCodes && !_timeoutSeconds)
    return callback(400, { error: 'Missing fields to update' });

  const { token } = data.headers;
  const _token = typeof token === 'string' && token;
  if (!_token) return callback(403, { error: 'Missing required token in headers' });

  _data.read('checks', _id, (err, checkData) => {
    if (err || !checkData) return callback(400, { error: 'The specified check does not exist' });

    _tokens.verifyToken(_token, checkData.phone, (tokenIsValid) => {
      if (!tokenIsValid) return callback(403, { error: 'Invalid token' });

      if (_protocol) checkData.protocol = _protocol;
      if (_url) checkData.url = _url;
      if (_method) checkData.method = _method;
      if (_successCodes) checkData.successCodes = _successCodes;
      if (_timeoutSeconds) checkData.timeoutSeconds = _timeoutSeconds;

      _data.update('checks', _id, checkData, (err) =>
        !err ? callback(200) : callback(500, { error: 'Could not update the check' }),
      );
    });
  });
};

_checks.delete = (data, callback) => {
  const { id } = data.queryStringObject;
  if (!_helpers.isValidUUID(id)) return callback(400, { error: 'Missing or invalid ID field' });

  const { token } = data.headers;
  const _token = typeof token === 'string' && token;
  if (!_token) return callback(403, { error: 'Missing required token in headers' });

  _data.read('checks', id, (err, checkData) => {
    if (err || !checkData) return callback(400, { error: 'The specified check does not exist' });

    _tokens.verifyToken(_token, checkData.phone, (tokenIsValid) => {
      if (!tokenIsValid) return callback(403, { error: 'Invalid token' });

      _data.remove('checks', id, (err) => {
        if (err) return callback(500, { error: 'Could not delete the specified check' });

        _data.read('users', checkData.phone, (err, userData) => {
          if (err || !userData) return callback(500, { error: 'Could not find the user who created the check' });

          const userChecks = _helpers.isValidArray(userData.checks) ? userData.checks : [];
          const checkPosition = userChecks.indexOf(id);
          if (checkPosition === -1) return callback(500, { error: 'Could not find the check on the users object' });

          userData.checks.splice(checkPosition, 1);
          _data.update('users', checkData.phone, userData, (err) =>
            !err ? callback(200) : callback(500, { error: 'Could not update the user' }),
          );
        });
      });
    });
  });
};

const checks = (data, callback) => {
  allowedMethods = ['post', 'get', 'put', 'delete'];
  if (allowedMethods.indexOf(data.method) > -1) {
    _checks[data.method](data, callback);
  } else {
    callback(405);
  }
};

const favicon = (data, callback) => {
  if (data.method !== 'get') return callback(405);

  _helpers.getStaticAsset('favicon.ico', (err, data) => {
    if (err || !data) return callback(500);

    callback(200, data, 'favicon');
  });
};

const public = (data, callback) => {
  if (data.method !== 'get') return callback(405);

  // Get requested file name
  const trimmedAssetName = data.trimmedPath.replace('public/', '').trim();

  if (trimmedAssetName.length === 0) return callback(404);

  // Read in the asset's data
  _helpers.getStaticAsset(trimmedAssetName, (err, data) => {
    if (err || !data) return callback(404);
    // Determine the content type (default to plain text)
    let contentType = 'plain';
    switch (trimmedAssetName.split('.').pop()) {
      case 'css':
        contentType = 'css';
        break;
      case 'png':
        contentType = 'png';
        break;
      case 'jpg':
        contentType = 'jpg';
        break;
      case 'ico':
        contentType = 'favicon';
        break;
    }

    callback(200, data, contentType);
  });
};

const accountCreate = (data, callback) => {
  if (data.method !== 'get') return callback(405);

  // Prepare data for interpolation
  const templateData = {
    'head.title': 'Create an Account',
    'head.description':
      'You can create an account here to start monitoring your URLs and receive alerts when they go down.',
    'body.class': 'accountCreate',
  };

  _helpers.getTemplate('accountCreate', templateData, (err, str) => {
    if (err || !str) return callback(500, undefined, 'html');

    // Add the universal header and footer
    _helpers.addUniversalTemplates(str, templateData, (err, str) => {
      if (err || !str) return callback(500, undefined, 'html');

      callback(200, str, 'html');
    });
  });
};

const sessionCreate = (data, callback) => {
  if (data.method !== 'get') return callback(405);

  // Prepare data for interpolation
  const templateData = {
    'head.title': 'Login to your Account',
    'head.description': 'Please enter your phone number and password to access your account.',
    'body.class': 'sessionCreate',
  };

  _helpers.getTemplate('sessionCreate', templateData, (err, str) => {
    if (err || !str) return callback(500, undefined, 'html');

    // Add the universal header and footer
    _helpers.addUniversalTemplates(str, templateData, (err, str) => {
      if (err || !str) return callback(500, undefined, 'html');

      callback(200, str, 'html');
    });
  });
};

const sessionDeleted = (data, callback) => {
  if (data.method !== 'get') return callback(405);

  const templateData = {
    'head.title': 'Logged Out',
    'head.description': 'You have been logged out of your account.',
    'body.class': 'sessionDeleted',
  };

  _helpers.getTemplate('sessionDeleted', templateData, (err, str) => {
    if (err || !str) return callback(500, undefined, 'html');

    // Add the universal header and footer
    _helpers.addUniversalTemplates(str, templateData, (err, str) => {
      if (err || !str) return callback(500, undefined, 'html');

      callback(200, str, 'html');
    });
  });
};

const accountEdit = (data, callback) => {
  if (data.method !== 'get') return callback(405);

  // No description needed since it is a private page
  const templateData = {
    'head.title': 'Account Settings',
    'body.class': 'accountEdit',
  };

  _helpers.getTemplate('accountEdit', templateData, (err, str) => {
    if (err || !str) return callback(500, undefined, 'html');

    // Add the universal header and footer
    _helpers.addUniversalTemplates(str, templateData, (err, str) => {
      if (err || !str) return callback(500, undefined, 'html');

      callback(200, str, 'html');
    });
  });
};

const accountDeleted = (data, callback) => {
  if (data.method !== 'get') return callback(405);

  const templateData = {
    'head.title': 'Account Deleted',
    'head.description': 'Your account has been deleted.',
    'body.class': 'accountDeleted',
  };

  _helpers.getTemplate('accountDeleted', templateData, (err, str) => {
    if (err || !str) return callback(500, undefined, 'html');

    // Add the universal header and footer
    _helpers.addUniversalTemplates(str, templateData, (err, str) => {
      if (err || !str) return callback(500, undefined, 'html');

      callback(200, str, 'html');
    });
  });
};

const checksCreate = (data, callback) => {
  if (data.method !== 'get') return callback(405);

  // No description needed since it is a private page
  const templateData = {
    'head.title': 'Create a New Check',
    'body.class': 'checksCreate',
  };

  _helpers.getTemplate('checksCreate', templateData, (err, str) => {
    if (err || !str) return callback(500, undefined, 'html');

    // Add the universal header and footer
    _helpers.addUniversalTemplates(str, templateData, (err, str) => {
      if (err || !str) return callback(500, undefined, 'html');

      callback(200, str, 'html');
    });
  });
};

const checksList = (data, callback) => {
  if (data.method !== 'get') return callback(405);

  // No description needed since it is a private page
  const templateData = {
    'head.title': 'Dashboard',
    'body.class': 'checksList',
  };

  _helpers.getTemplate('checksList', templateData, (err, str) => {
    if (err || !str) return callback(500, undefined, 'html');

    // Add the universal header and footer
    _helpers.addUniversalTemplates(str, templateData, (err, str) => {
      if (err || !str) return callback(500, undefined, 'html');

      callback(200, str, 'html');
    });
  });
};

const checksEdit = (data, callback) => {
  if (data.method !== 'get') return callback(405);

  // No description needed since it is a private page
  const templateData = {
    'head.title': 'Check Details',
    'body.class': 'checksEdit',
  };

  _helpers.getTemplate('checksEdit', templateData, (err, str) => {
    if (err || !str) return callback(500, undefined, 'html');

    // Add the universal header and footer
    _helpers.addUniversalTemplates(str, templateData, (err, str) => {
      if (err || !str) return callback(500, undefined, 'html');

      callback(200, str, 'html');
    });
  });
};

const exampleError = (data, callback) => {
  const err = new Error('This is an example error');
  throw err;
};

const ping = (_, callback) => callback(200);
const notFound = (_, callback) => callback(404);

module.exports = {
  accountCreate,
  accountDeleted,
  accountEdit,
  checks,
  checksCreate,
  checksEdit,
  checksList,
  exampleError,
  favicon,
  index,
  notFound,
  ping,
  public,
  sessionCreate,
  sessionDeleted,
  users,
  tokens,
};
