const { startServer } = require('./lib/server');
const { startWorkers } = require('./lib/workers');
const { startCli } = require('./lib/cli');

const init = () => {
  startServer();
  startWorkers();
  // CLI must start after the server and workers
  setTimeout(startCli, 100);
};

const app = {
  init,
};

app.init();

module.exports = app;
