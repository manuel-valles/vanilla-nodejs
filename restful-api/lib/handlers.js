const _data = require('./data');
const { hash, isValidField, trimFieldIfValid } = require('./helpers');


const _users = {};
_users.post = (data, callback) => {
    const { firstName, lastName, phone, password, tosAgreement } = data.payload;
    const _firstName = trimFieldIfValid(firstName);
    const _lastName = trimFieldIfValid(lastName);
    const _phone = trimFieldIfValid(phone, 9);
    const _password = trimFieldIfValid(password);
    const _tosAgreement = typeof (tosAgreement) === 'boolean' && tosAgreement === true;

    if (!_firstName || !_lastName || !_phone || !_password || !_tosAgreement) return callback(400, { error: 'Missing required fields' });

    _data.read('users', _phone, (err, data) => {
        if (!err) return callback(400, { error: 'A user with that phone number already exists' });

        const hashedPassword = hash(_password);
        if (!hashedPassword) return callback(500, { error: 'Not able to hash the password' });
        const user = {
            firstName: _firstName,
            lastName: _lastName,
            phone: _phone,
            hashedPassword,
            tosAgreement: true
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
const ping = (data, callback) => callback(200);
const notFound = (data, callback) => callback(404);

module.exports = { users, ping, notFound };
