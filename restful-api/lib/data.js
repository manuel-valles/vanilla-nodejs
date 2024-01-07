const fs = require('fs');
const path = require('path');
const { parseJsonToObject } = require('./helpers');

const create = (dir, file, data, callback) => {
    // Open the file for writing
    fs.open(path.join(__dirname, '../.data', dir, `${file}.json`), 'wx', (err, fileDescriptor) => {
        if (err || !fileDescriptor) return callback(err);
        // Convert data to string
        const stringData = JSON.stringify(data);
        // Write to file and close it
        fs.writeFile(fileDescriptor, stringData, err => {
            if (err) return callback(err);
            fs.close(fileDescriptor, err => {
                if (err) return callback(err);
                callback(false);
            });
        });
    });
}

const read = (dir, file, callback) => fs.readFile(path.join(__dirname, '../.data', dir, `${file}.json`), 'utf8', (err, data) => {
    if (err || !data) return callback(err);
    const parsedData = parseJsonToObject(data);
    callback(false, parsedData)
});

const update = (dir, file, data, callback) => {
    // Open the file for writing
    fs.open(path.join(__dirname, '../.data', dir, `${file}.json`), 'r+', (err, fileDescriptor) => {
        if (err || !fileDescriptor) return callback(err);
        // Convert data to string
        const stringData = JSON.stringify(data);
        // Truncate the file
        fs.ftruncate(fileDescriptor, err => {
            if (err) return callback(err);
            // Write to file and close it
            fs.writeFile(fileDescriptor, stringData, err => {
                if (err) return callback(err);
                fs.close(fileDescriptor, err => {
                    if (err) return callback(err);
                    callback(false);
                });
            });
        });
    });
}

const remove = (dir, file, callback) => {
    // Unlink the file
    fs.unlink(path.join(__dirname, '../.data', dir, `${file}.json`), err => {
        if (err) return callback(err);
        callback(false);
    });
}

module.exports = {
    create,
    read,
    update,
    remove,
};;
