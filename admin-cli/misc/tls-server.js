const tls = require('tls');
const fs = require('fs');
const path = require('path');

const options = {
  key: fs.readFileSync(path.join(__dirname, '../https/key.pem')),
  cert: fs.readFileSync(path.join(__dirname, '../https/cert.pem')),
};

const PORT = 6000;
const server = tls.createServer(options, (connection) => {
  const outboundMessage = 'Hello, client!';
  connection.write(outboundMessage);

  connection.on('data', (inboundMessage) => {
    console.log(`I wrote '${outboundMessage}' and I received '${inboundMessage}'`);
  });

  connection.on('end', () => {
    console.log('Client disconnected');
  });
});

server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
