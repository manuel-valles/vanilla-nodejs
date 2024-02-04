const net = require('net');

const PORT = 6000;
const outboundMessage = 'Hello, server!';
const client = new net.createConnection({ port: PORT }, () => {
  client.write(outboundMessage);
});

client.on('data', (inboundMessage) => {
  console.log(`I wrote '${outboundMessage}' and I received '${inboundMessage}'`);
  client.end();
});
