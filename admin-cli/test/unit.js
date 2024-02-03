const helpers = require('../lib/helpers');
const assert = require('assert');
const logs = require('../lib/logs');

// Holder for Unit Tests
const unit = {};

/*
 * Helpers tests
 */
unit['helpers.getANumber should return a number'] = (done) => {
  const val = helpers.getANumber();
  assert.equal(typeof val, 'number');
  done();
};

unit['helpers.getANumber should return 1'] = (done) => {
  const val = helpers.getANumber();
  assert.equal(val, 1);
  done();
};

unit['helpers.getANumber should return 2 (should fail)'] = (done) => {
  const val = helpers.getANumber();
  assert.equal(val, 2);
  done();
};

/*
 * Logs Tests
 */
unit['logs.list should callback a false error and an array of log names'] = (done) => {
  logs.list(true, (err, logFileNames) => {
    assert.equal(err, false);
    assert.ok(Array.isArray(logFileNames));
    assert.ok(logFileNames.length > 1);
    done();
  });
};

unit['logs.truncate should not throw if the logId does not exist, should callback an error instead'] = (done) => {
  assert.doesNotThrow(() => {
    logs.truncate('Fake ID', (err) => {
      assert.ok(err);
      done();
    });
  }, TypeError);
};

module.exports = unit;
