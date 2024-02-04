const tls = require('tls');
const fs = require('fs');
const path = require('path');

const options = {
  // This is required only because we are using a self-signed certificate
  ca: fs.readFileSync(path.join(__dirname, '../https/cert.pem')),
};

const PORT = 6000;
const outboundMessage = 'Hello, server!';
const client = new tls.connect(PORT, options, () => {
  client.write(outboundMessage);
});

client.on('data', (inboundMessage) => {
  console.log(`I wrote '${outboundMessage}' and I received '${inboundMessage}'`);
  client.end();
});
