const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const baseDir = path.join(__dirname, '../.logs');

// Append a string to a file. Create the file if it does not exist
const append = (file, str, callback) => {
    // Open the file for appending
    fs.open(`${baseDir}/${file}.log`, 'a', (err, fileDescriptor) => {
        if (err || !fileDescriptor) return callback('Could not open file for appending');
        // Append to file and close it
        fs.appendFile(fileDescriptor, `${str}\n`, err => {
            if (err) return callback('Error appending to file');
            fs.close(fileDescriptor, err => {
                if (err) return callback('Error closing file that was being appended');
                callback(false);
            });
        });
    });
}

// List all the logs, and optionally include the compressed logs
const list = (includeCompressedLogs, callback) => {
    fs.readdir(baseDir, (err, data) => {
        if (err || !data || !data.length) return callback(err, data);
        const trimmedFileNames = [];
        data.forEach(fileName => {
            // Add the .log files
            if (fileName.includes('.log')) trimmedFileNames.push(fileName.replace('.log', ''));
            // Add the .gz files
            if (includeCompressedLogs && fileName.includes('.gz.b64')) trimmedFileNames.push(fileName.replace('.gz.b64', ''));
        });
        callback(false, trimmedFileNames);
    });
}

// Compress the contents of one .log file into a .gz.b64 file within the same directory
const compress = (logId, newFileId, callback) => {
    const sourceFile = `${logId}.log`;
    const destFile = `${newFileId}.gz.b64`;

    // Read the source file
    fs.readFile(`${baseDir}/${sourceFile}`, 'utf8', (err, inputString) => {
        if (err || !inputString) return callback(err);

        // Compress the data using gzip
        zlib.gzip(inputString, (err, buffer) => {
            if (err || !buffer) return callback(err);

            // Send the data to the destination file
            fs.open(`${baseDir}/${destFile}`, 'wx', (err, fileDescriptor) => {
                if (err || !fileDescriptor) return callback(err);

                // Write to the destination file
                fs.writeFile(fileDescriptor, buffer.toString('base64'), err => {
                    if (err) return callback(err);

                    // Close the destination file
                    fs.close(fileDescriptor, err => {
                        if (err) return callback(err);
                        callback(false);
                    });
                });
            });
        });
    });
}

// Decompress the contents of a .gz.b64 file into a string variable
const decompress = (fileId, callback) => {
    const fileName = `${fileId}.gz.b64`;
    fs.readFile(`${baseDir}/${fileName}`, 'utf8', (err, str) => {
        if (err || !str) return callback(err);
        // Decompress the data
        const inputBuffer = Buffer.from(str, 'base64');
        zlib.unzip(inputBuffer, (err, outputBuffer) => {
            if (err || !outputBuffer) return callback(err);

            const str = outputBuffer.toString();
            callback(false, str);
        });
    });
}

// Truncate a log file
const truncate = (logId, callback) => fs.truncate(`${baseDir}/${logId}.log`, 0, err => {
    if (err) return callback(err);
    callback(false);
});


module.exports = { append, list, compress, decompress, truncate };
