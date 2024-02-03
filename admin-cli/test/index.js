// Override the NODE_ENV variable
process.env.NODE_ENV = 'testing';

// Application logic for the test runner
const tests = {
  unit: require('./unit'),
  api: require('./api'),
};

// Count all the tests
const countTests = () => {
  let counter = 0;
  Object.keys(tests).forEach((key) => {
    counter += Object.keys(tests[key]).length;
  });
  return counter;
};

// Run all the tests, collecting the errors and successes
const runTests = () => {
  const errors = [];
  let successes = 0;
  const limit = countTests();
  let counter = 0;

  Object.keys(tests).forEach((key) => {
    const subTests = tests[key];
    Object.keys(subTests).forEach((testName) => {
      const tmpTestName = testName;
      const testValue = subTests[testName];

      // Call the test
      try {
        testValue(() => {
          // If success, log it in green
          console.log('\x1b[32m%s\x1b[0m', tmpTestName);
          counter++;
          successes++;
          if (counter === limit) {
            produceTestReport(limit, successes, errors);
          }
        });
      } catch (e) {
        // If failure, put it in red and log the error
        errors.push({
          name: testName,
          error: e,
        });
        console.log('\x1b[31m%s\x1b[0m', tmpTestName);
        counter++;
        if (counter === limit) {
          produceTestReport(limit, successes, errors);
        }
      }
    });
  });
};

// Product a test outcome report
const produceTestReport = (limit, successes, errors) => {
  console.log('');
  console.log('--------BEGIN TEST REPORT--------');
  console.log('');
  console.log('Total Tests: ', limit);
  console.log('Pass: ', successes);
  console.log('Fail: ', errors.length);
  console.log('');

  // If errors, print them in detail
  if (errors.length > 0) {
    console.log('--------BEGIN ERROR DETAILS--------');
    console.log('');
    errors.forEach((testError) => {
      console.log('\x1b[31m%s\x1b[0m', testError.name);
      console.log(testError.error);
      console.log('');
    });
    console.log('');
    console.log('--------END ERROR DETAILS--------');
  }

  console.log('');
  console.log('--------END TEST REPORT--------');

  // Kill the process after the tests are done
  process.exit(0);
};

// Run the tests
runTests();
