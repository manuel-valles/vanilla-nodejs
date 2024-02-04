const dgram = require('dgram');

const PORT = 6000;
const client = dgram.createSocket('udp4');

// Define the message and pull it into a buffer
const message = Buffer.from('Hello, World!');
client.send(message, PORT, 'localhost', (err) => {
  client.close();
});
