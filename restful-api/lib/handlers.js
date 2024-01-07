const { randomUUID } = require('crypto');
const _data = require('./data');
const { hash, trimFieldIfValid, isValidUUID } = require('./helpers');


const _users = {};
_users.post = (data, callback) => {
    const { firstName, lastName, phone, password, tosAgreement } = data.payload;
    const _firstName = trimFieldIfValid(firstName);
    const _lastName = trimFieldIfValid(lastName);
    const _phone = trimFieldIfValid(phone, 9);
    const _password = trimFieldIfValid(password);

    if (!_firstName || !_lastName || !_phone || !_password || tosAgreement !== true) return callback(400, { error: 'Missing required fields' });

    _data.read('users', _phone, (err, data) => {
        if (!err) return callback(400, { error: 'A user with that phone number already exists' });

        const hashedPassword = hash(_password);
        if (!hashedPassword) return callback(500, { error: 'Not able to hash the password' });
        const user = {
            firstName: _firstName,
            lastName: _lastName,
            phone: _phone,
            hashedPassword,
            tosAgreement
        };
        _data.create('users', _phone, user, (err) => !err ? callback(200) : callback(500, { error: 'Could not create the new user' }));
    });
}

_users.get = (data, callback) => {
    const { phone } = data.queryStringObject;
    const _phone = trimFieldIfValid(phone, 9);

    if (!_phone) return callback(400, { error: 'Missing phone number field' });

    _data.read('users', _phone, (err, data) => {
        if (err || !data) return callback(404);
        // Remove sensitive data from response
        delete data.hashedPassword;
        callback(200, data);
    });
}

_users.put = (data, callback) => {
    const { firstName, lastName, phone, password } = data.payload;
    const _firstName = trimFieldIfValid(firstName);
    const _lastName = trimFieldIfValid(lastName);
    const _phone = trimFieldIfValid(phone, 9);
    const _password = trimFieldIfValid(password);

    if (!_phone) return callback(400, { error: 'Missing phone number field' });
    if (!_firstName && !_lastName && !_password) return callback(400, { error: 'Missing fields to update' });

    _data.read('users', _phone, (err, userData) => {
        if (err || !userData) return callback(400, { error: 'The specified user does not exist' });

        if (_firstName) userData.firstName = _firstName;
        if (_lastName) userData.lastName = _lastName;
        if (_password) userData.hashedPassword = hash(_password);

        _data.update('users', _phone, userData, (err) => !err ? callback(200) : callback(500, { error: 'Could not update the user' }));
    });
}

_users.delete = (data, callback) => {
    const { phone } = data.queryStringObject;
    const _phone = trimFieldIfValid(phone, 9);

    if (!_phone) return callback(400, { error: 'Missing phone number field' });

    _data.read('users', _phone, (err, data) => {
        if (err || !data) return callback(400, { error: 'The specified user does not exist' });

        _data.remove('users', _phone, (err) => !err ? callback(200) : callback(500, { error: 'Could not delete the specified user' }));
    });
}


const users = (data, callback) => {
    allowedMethods = ['post', 'get', 'put', 'delete'];
    if (allowedMethods.indexOf(data.method) > -1) {
        _users[data.method](data, callback);
    } else {
        callback(405);
    }
}

const _tokens = {};

_tokens.post = (data, callback) => {
    const { phone, password } = data.payload;
    const _phone = trimFieldIfValid(phone, 9);
    const _password = trimFieldIfValid(password);

    if (!_phone || !_password) return callback(400, { error: 'Missing required fields' });

    _data.read('users', _phone, (err, userData) => {
        if (err || !userData) return callback(400, { error: 'Could not find the specified user' });

        const hashedPassword = hash(_password);
        if (hashedPassword !== userData.hashedPassword) return callback(400, { error: 'Invalid credentials' });

        const id = randomUUID();
        const expires = Date.now() + 60 * 60 * 1000; // 1 hour
        const token = {
            id,
            expires,
            phone: _phone
        };

        _data.create('tokens', id, token, (err) => !err ? callback(200, token) : callback(500, { error: 'Could not create a token' }));
    });
}

_tokens.get = (data, callback) => {
    const { id } = data.queryStringObject;
    if (!isValidUUID(id)) return callback(400, { error: 'Missing ID field' });

    _data.read('tokens', id, (err, data) => !err && data ? callback(200, data) : callback(404));
}

_tokens.put = (data, callback) => {
    const { id, extend } = data.payload;

    if (!isValidUUID(id) || extend !== true) return callback(400, { error: 'Missing required fields or invalid fields' });

    _data.read('tokens', id, (err, tokenData) => {
        if (err || !tokenData) return callback(400, { error: 'The specified token does not exist' });

        if (tokenData.expires < Date.now()) return callback(400, { error: 'The token has already expired and cannot be extended' });

        tokenData.expires = Date.now() + 60 * 60 * 1000;

        _data.update('tokens', id, tokenData, (err) => !err ? callback(200) : callback(500, { error: 'Could not update the token' }));
    });
}

_tokens.delete = (data, callback) => {
    const { id } = data.queryStringObject;
    if (!isValidUUID(id)) return callback(400, { error: 'Missing ID field' });

    _data.read('tokens', id, (err, data) => {
        if (err || !data) return callback(400, { error: 'The specified token does not exist' });

        _data.remove('tokens', id, (err) => !err ? callback(200) : callback(500, { error: 'Could not delete the specified token' }));
    });
}

const tokens = (data, callback) => {
    allowedMethods = ['post', 'get', 'put', 'delete'];
    if (allowedMethods.indexOf(data.method) > -1) {
        _tokens[data.method](data, callback);
    } else {
        callback(405);
    }
}

const ping = (data, callback) => callback(200);
const notFound = (data, callback) => callback(404);

module.exports = { users, tokens, ping, notFound };
