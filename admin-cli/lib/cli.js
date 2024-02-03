const readline = require('readline');
const util = require('util');
const debug = util.debuglog('cli');
const events = require('events');
class CliEvents extends events { }
const cliEvents = new CliEvents();

const processInput = (str) => {
    str = typeof (str) === 'string' && str.trim().length > 0 && str.trim();
    // Only process the input if the user type something
    if (str) {
        // Codify the unique strings that identify the unique questions allowed to be asked
        const uniqueInputs = [
            'help',
            'man',
            'exit',
            'stats',
            'list users',
            'more user info',
            'list checks',
            'more check info',
            'list logs',
            'more log info'
        ];
        
        const matchFound = uniqueInputs.some((input) => {
            if(str.toLowerCase().includes(input)){
                // Emit event that matches the unique input, and include the full string given
                cliEvents.emit(input, str);
                return true;
            }
        });

        // If no match is found, tell the user to try again
        if(!matchFound){
            console.log('Sorry, try again');
        }
    }
};

const startCli = () => {
    console.log('\x1b[34m%s\x1b[0m', `CLI running`);

    const interface = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: '> '
    });

    // Create an initial prompt
    interface.prompt();

    // Handle each line of input separately
    interface.on('line', (str) => {
        // Send to the input processor
        processInput(str);

        // Re-initialize the prompt afterwards
        interface.prompt();
    });

    // If the user stops the CLI, kill the associated process
    interface.on('close', () => process.exit(0));
};



module.exports = {
    startCli
};