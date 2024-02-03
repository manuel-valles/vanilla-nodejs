const readline = require('readline');
const util = require('util');
const debug = util.debuglog('cli');
const os = require('os');
const v8 = require('v8');
const events = require('events');
class CliEvents extends events {}
const cliEvents = new CliEvents();

// Create a vertical space
const verticalSpace = (lines = 1) => console.log('\n'.repeat(lines));

// Create a horizontal line across the screen
const horizontalLine = () => {
    // Get screen size
    const width = process.stdout.columns || 80;
    // Fill the line with dashes
    const line = '-'.repeat(width);
    console.log(line);
};

// Create centered text on the screen
const centered = (str) => {
    str = typeof (str) === 'string' && str.trim().length > 0 ? str.trim() : '';
    // Get screen size
    const width = process.stdout.columns || 80;
    // Calculate the left padding
    const leftPadding = Math.floor((width - str.length) / 2);
    // Put in left padded spaces before the string itself
    console.log(' '.repeat(leftPadding), str);
};

// Input handlers
cliEvents.on('help', () => responsers.help());
cliEvents.on('man', () => responsers.help());
cliEvents.on('exit', () => responsers.exit());
cliEvents.on('stats', () => responsers.stats());
cliEvents.on('list users', () => responsers.listUsers());
cliEvents.on('more user info', (str) => responsers.moreUserInfo(str));
cliEvents.on('list checks', (str) => responsers.listChecks(str));
cliEvents.on('more check info', (str) => responsers.moreCheckInfo(str));
cliEvents.on('list logs', () => responsers.listLogs());
cliEvents.on('more log info', (str) => responsers.moreLogInfo(str));

// Responders
const responsers = {
    help: () => {
        const commands = {
            'help': 'Show this help page',
            'man': 'Alias of the "help" command',
            'exit': 'Kill the CLI and the app',
            'stats': 'Get statistics on the underlying operating system and resource utilization',
            'list users': 'Show a list of all the registered users in the system',
            'more user info --{userId}': 'Show details of a specific user',
            'list checks --up --down': 'Show a list of all the active checks in the system, including their state. The flag --up and --down are optional',
            'more check info --{checkId}': 'Show details of a specified check',
            'list logs': 'Show a list of all the log files available to be read',
            'more log info --{filename}': 'Show details of a specified log file'
        };

        // Show a header for help page that is as wide as the screen
        horizontalLine();
        centered('CLI Manual');
        horizontalLine();
        verticalSpace(2);

        // Show each command, followed by its explanation
        Object.entries(commands).forEach(([key, value]) => {
            const line = `\x1b[33m${key}\x1b[0m`;
            const padding = 60 - line.length;
            console.log(`${line}${' '.repeat(padding)}${value}`);
            verticalSpace();
        });

        verticalSpace(1);
        horizontalLine();
    },
    exit: () => process.exit(0),
    stats: () => {
        // Compile an object of stats
        const stats = {
            'Load Average': os.loadavg().join(' | '),
            'CPU Count': os.cpus().length,
            'Free Memory': os.freemem(),
            'Current Malloced Memory': v8.getHeapStatistics().malloced_memory,
            'Peak Malloced Memory': v8.getHeapStatistics().peak_malloced_memory,
            'Allocated Heap Used (%)': Math.round((v8.getHeapStatistics().used_heap_size / v8.getHeapStatistics().total_heap_size) * 100),
            'Available Heap Allocated (%)': Math.round((v8.getHeapStatistics().total_heap_size / v8.getHeapStatistics().heap_size_limit) * 100),
            'Uptime': os.uptime() + ' Seconds'

        };

        // Create a header for the stats
        horizontalLine();
        centered('SYSTEM Statistics');
        horizontalLine();
        verticalSpace(2);

        // Log out each stat
        Object.entries(stats).forEach(([key, value]) => {
            const line = `\x1b[33m${key}\x1b[0m`;
            const padding = 60 - line.length;
            console.log(`${line}${' '.repeat(padding)}${value}`);
            verticalSpace();
        });
    },
    listUsers: () => {
        console.log('You asked for list users');
    },
    moreUserInfo: (str) => {
        console.log('You asked for more user info', str);
    },
    listChecks: (str) => {
        console.log('You asked for list checks', str);
    },
    moreCheckInfo: (str) => {
        console.log('You asked for more check info', str);
    },
    listLogs: () => {
        console.log('You asked for list logs');
    },
    moreLogInfo: (str) => {
        console.log('You asked for more log info', str);
    }
};

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
            console.log('Command not found, please try again');
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