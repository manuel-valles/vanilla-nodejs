const net = require('net');

const PORT = 6000;
const server = net.createServer((socket) => {
  const outboundMessage = 'Hello, client!';
  socket.write(outboundMessage);

  socket.on('data', (inboundMessage) => {
    console.log(`I wrote '${outboundMessage}' and I received '${inboundMessage}'`);
  });

  socket.on('end', () => {
    console.log('Client disconnected');
  });
});

server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
