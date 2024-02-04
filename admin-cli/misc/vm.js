const vm = require('vm');

const context = {
  firstNumber: 8,
};

const script = new vm.Script(`
  firstNumber = firstNumber * 2;
  secondNumber = firstNumber + 1;
  thirdNumber = 50;
`);

script.runInNewContext(context);
console.log(context);
