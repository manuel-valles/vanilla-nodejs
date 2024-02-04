const repl = require('repl');

const replServer = repl.start({
  prompt: '>',
  eval: (str) => {
    console.log('At the evaluation stage:', str);

    if (str.includes('foo')) {
      console.log('bar');
    }
  },
});
