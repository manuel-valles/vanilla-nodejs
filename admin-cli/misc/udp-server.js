const dgram = require('dgram');

const PORT = 6000;
const server = dgram.createSocket('udp4');

server.on('message', (msg, sender) => {
  console.log(`Message: '${msg}' from '${sender.address}:${sender.port}'`);
});

server.bind(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
