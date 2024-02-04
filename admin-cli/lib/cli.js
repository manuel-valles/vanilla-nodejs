const readline = require('readline');
const util = require('util');
const debug = util.debuglog('cli');
const os = require('os');
const v8 = require('v8');
const events = require('events');
class CliEvents extends events {}
const cliEvents = new CliEvents();
const childProcess = require('child_process');
const _data = require('./data');
const _logs = require('./logs');
const { parseJsonToObject } = require('./helpers');

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
  str = typeof str === 'string' && str.trim().length > 0 ? str.trim() : '';
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
      help: 'Show this help page',
      man: 'Alias of the "help" command',
      exit: 'Kill the CLI and the app',
      stats: 'Get statistics on the underlying operating system and resource utilization',
      'list users': 'Show a list of all the registered users in the system',
      'more user info --{userId}': 'Show details of a specific user',
      'list checks --up --down':
        'Show a list of all the active checks in the system, including their state. The flag --up and --down are optional',
      'more check info --{checkId}': 'Show details of a specified check',
      'list logs': 'Show a list of all the compressed log files',
      'more log info --{filename}': 'Show details of a specified log file',
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
      'Allocated Heap Used (%)': Math.round(
        (v8.getHeapStatistics().used_heap_size / v8.getHeapStatistics().total_heap_size) * 100,
      ),
      'Available Heap Allocated (%)': Math.round(
        (v8.getHeapStatistics().total_heap_size / v8.getHeapStatistics().heap_size_limit) * 100,
      ),
      Uptime: os.uptime() + ' Seconds',
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
    _data.list('users', (err, userIds) => {
      if (err || !userIds || userIds.length === 0) {
        console.log('\x1b[33mNo users found\x1b[0m');
        return;
      }

      // Create a header for the users
      horizontalLine();
      centered('\x1b[34mUSERS\x1b[0m');
      horizontalLine();
      verticalSpace(2);

      // Log out each user
      userIds.forEach((userId) => {
        _data.read('users', userId, (err, userData) => {
          if (err || !userData) {
            console.log('Error reading user data');
            return;
          }
          const { firstName, lastName, phone, checks } = userData;
          const displayedUser = {
            Name: `${firstName} ${lastName}`,
            Phone: phone,
            Checks: Array.isArray(checks) && checks.length > 0 ? checks.length : 0,
          };

          // Log out each user in the same line
          console.log(
            Object.entries(displayedUser)
              .map(([key, value]) => `\x1b[33m${key}:\x1b[0m \x1b[34m${value}\x1b[0m`)
              .join('   '),
          );
          verticalSpace();
        });
      });
    });
  },
  moreUserInfo: (str) => {
    // Get the ID from the string
    const arr = str.split('--');
    const userId = typeof arr[1] === 'string' && arr[1].trim().length > 0 && arr[1].trim();
    if (!userId) {
      console.log('Invalid user ID');
      return;
    }

    // Lookup the user
    _data.read('users', userId, (err, userData) => {
      if (err || !userData) {
        console.log('User not found');
        return;
      }

      // Remove the hashed password
      delete userData.hashedPassword;

      // Create a header for the user
      horizontalLine();
      centered('USER Info');
      horizontalLine();
      verticalSpace(2);

      // Log out the user (JSON format with colors)
      console.dir(userData, { colors: true });
      verticalSpace();
    });
  },
  listChecks: (str) => {
    _data.list('checks', (err, checkIds) => {
      if (err || !checkIds || checkIds.length === 0) {
        console.log('\x1b[33mNo checks found\x1b[0m');
        return;
      }

      // Create a header for the checks
      horizontalLine();
      centered('\x1b[34mCHECKS\x1b[0m');
      horizontalLine();
      verticalSpace(2);

      // Log out each check
      checkIds.forEach((checkId) => {
        _data.read('checks', checkId, (err, checkData) => {
          if (err || !checkData) {
            console.log('\x1b[31mError reading check data\x1b[0m');
            return;
          }

          const { id, method, protocol, url, state } = checkData;
          const checkState = typeof state === 'string' ? state : 'unknown';

          const displayedCheck = {
            ID: id,
            Method: method.toUpperCase(),
            Protocol: protocol,
            URL: url,
            State: checkState,
          };

          // If the user hasn't specified any state or the state matches the filter
          if (!str.includes('--') || str.toLowerCase().includes('--' + checkState)) {
            // Log out each check in the same line with colors
            console.log(
              Object.entries(displayedCheck)
                .map(([key, value]) => `\x1b[33m${key}:\x1b[0m \x1b[34m${value}\x1b[0m`)
                .join('   '),
            );
            verticalSpace();
          }
        });
      });
    });
  },
  moreCheckInfo: (str) => {
    // Get the ID from the string
    const arr = str.split('--');
    const checkId = typeof arr[1] === 'string' && arr[1].trim().length > 0 && arr[1].trim();
    if (!checkId) {
      console.log('\x1b[33m Invalid Check ID \x1b[0m');
      return;
    }

    // Lookup the check
    _data.read('checks', checkId, (err, checkData) => {
      if (err || !checkData) {
        console.log('\x1b[31m Check not found \x1b[0m');
        return;
      }

      // Create a header for the user
      horizontalLine();
      centered('\x1b[34m CHECK Info \x1b[0m');
      horizontalLine();
      verticalSpace(2);

      // Log out the user (JSON format with colors)
      console.dir(checkData, { colors: true });
      verticalSpace();
    });
  },
  listLogs: () => {
    const ls = childProcess.spawn('ls', ['.logs/']);
    ls.stdout.on('data', (data) => {
      // Explode into separate lines
      const dataStr = data.toString();
      const logFileNames = dataStr.split('\n');
      if (logFileNames.length === 0) {
        console.log('\x1b[33mNo logs found\x1b[0m');
        return;
      }

      // Create a header for the logs
      horizontalLine();
      centered('\x1b[34mLOGS\x1b[0m');
      horizontalLine();
      verticalSpace(2);

      // Log out each log file
      logFileNames.forEach((logFileName) => {
        if (typeof logFileName === 'string' && logFileName.length > 0 && logFileName.includes('.gz.b64')) {
          console.log(logFileName.replace('.gz.b64', ''));
          verticalSpace();
        }
      });

      horizontalLine();
    });
  },
  moreLogInfo: (str) => {
    // Get the ID from the string
    const arr = str.split('--');
    const logFileName = typeof arr[1] === 'string' && arr[1].trim().length > 0 && arr[1].trim();
    if (!logFileName) {
      console.log('\x1b[33m Missing log filename \x1b[0m');
      return;
    }

    // Create a header for the user
    horizontalLine();
    centered('\x1b[34m LOG Info \x1b[0m');
    horizontalLine();
    verticalSpace(2);

    // Decompress the log file
    _logs.decompress(logFileName, (err, strData) => {
      if (err || !strData) {
        console.log('\x1b[31m File not found \x1b[0m');
        return;
      }

      // Split into lines
      const lines = strData.split('\n');

      lines.forEach((jsonString) => {
        const logObject = parseJsonToObject(jsonString);
        if (logObject.check) {
          console.dir(logObject, { colors: true });
          verticalSpace();
        }
      });
    });
  },
};

const processInput = (str) => {
  str = typeof str === 'string' && str.trim().length > 0 && str.trim();
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
      'more log info',
    ];

    const matchFound = uniqueInputs.some((input) => {
      if (str.toLowerCase().includes(input)) {
        // Emit event that matches the unique input, and include the full string given
        cliEvents.emit(input, str);
        return true;
      }
    });

    // If no match is found, tell the user to try again
    if (!matchFound) {
      console.log('Command not found, please try again');
    }
  }
};

const startCli = () => {
  console.log('\x1b[34m%s\x1b[0m', `CLI running`);

  const interface = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '',
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
  startCli,
};
