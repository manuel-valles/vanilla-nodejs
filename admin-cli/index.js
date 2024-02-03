const { startServer } = require('./lib/server');
const { startWorkers } = require('./lib/workers');
const { startCli } = require('./lib/cli');

const init = (callback) => {
  startServer();
  startWorkers();
  // CLI must start after the server and workers
  setTimeout(() => {
    startCli();
    callback();
  }, 100);
};

const app = {
  init,
};

// Self invoking only if required directly (e.g. for testing)
if (require.main === module) {
  app.init(() => {});
}

module.exports = app;
