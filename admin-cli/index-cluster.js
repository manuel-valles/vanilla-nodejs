const { startServer } = require('./lib/server');
const { startWorkers } = require('./lib/workers');
const { startCli } = require('./lib/cli');
const cluster = require('cluster');
const os = require('os');

const init = (callback) => {
  // If the current thread is the master, start the workers and the CLI
  if (cluster.isMaster) {
    startWorkers();
    // CLI must start after the workers
    setTimeout(() => {
      startCli();
      callback();
    }, 100);

    // Fork the process for each CPU
    console.log(`Master cluster setting up ${os.cpus().length} workers...`);
    for (let i = 0; i < os.cpus().length; i++) {
      cluster.fork();
    }
  } else {
    // If the current thread is a fork, start the HTTP server
    startServer();
  }
};

const app = {
  init,
};

// Self invoking only if required directly (e.g. for testing)
if (require.main === module) {
  app.init(() => {});
}

module.exports = app;
