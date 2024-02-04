const http2 = require('http2');

const PORT = 6000;
const client = http2.connect(`http://localhost:${PORT}`);

const req = client.request({
  ':path': '/',
});

let str = '';
req.on('data', (chunk) => {
  str += chunk;
});

req.on('end', () => {
  console.log(str);
});

req.end();
