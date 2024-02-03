const { startServer } = require('./lib/server');
const { startWorkers } = require('./lib/workers');

const init = () => {
  startServer();
  startWorkers();
};

const app = {
  init,
};

app.init();

module.exports = app;
