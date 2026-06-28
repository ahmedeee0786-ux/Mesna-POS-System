const fs = require('fs');
const path = require('path');
const readline = require('readline');

const LOG_DIR = path.join(__dirname, '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'pos.log');

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function formatTimestamp(date) {
  return date.toISOString().replace('T', ' ').substring(0, 19);
}

function viewLogs(options = {}) {
  ensureLogDir();

  const {
    lines = 50,
    follow = false,
    grep = null,
    since = null,
    level = null
  } = options;

  if (!fs.existsSync(LOG_FILE)) {
    console.log(`📝 Log file not found: ${LOG_FILE}`);
    console.log(`   The log file will be created when the application starts.`);
    return;
  }

  console.log(`📄 Viewing logs from: ${LOG_FILE}`);
  console.log(`   Showing last ${lines} lines${follow ? ' (follow mode)' : ''}`);
  console.log('='.repeat(60));

  if (follow) {
    // Follow mode - tail -f equivalent
    const tail = require('child_process').spawn('powershell', [
      '-Command',
      `Get-Content -Path "${LOG_FILE}" -Tail ${lines} -Wait`
    ]);

    tail.stdout.on('data', (data) => {
      process.stdout.write(data.toString());
    });

    tail.stderr.on('data', (data) => {
      process.stderr.write(data.toString());
    });

    tail.on('close', (code) => {
      if (code !== 0) {
        console.log(`\n⚠️  Tail process exited with code ${code}`);
      }
    });

    console.log(`\n💡 Press Ctrl+C to stop following...`);
  } else {
    // Static view
    const fileStream = fs.createReadStream(LOG_FILE, { encoding: 'utf8' });
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    const logLines = [];
    let lineCount = 0;

    rl.on('line', (line) => {
      lineCount++;

      // Apply filters
      let include = true;

      if (grep && !line.includes(grep)) {
        include = false;
      }

      if (level && !line.includes(`[${level}]`)) {
        include = false;
      }

      // Since filter would require parsing timestamps - simplified for now
      if (include) {
        logLines.push(line);
      }
    });

    rl.on('close', () => {
      // Show last N lines after filtering
      const startIndex = Math.max(0, logLines.length - lines);
      const linesToShow = logLines.slice(startIndex);

      linesToShow.forEach(line => {
        console.log(line);
      });

      console.log('='.repeat(60));
      console.log(`📊 Showing ${linesToShow.length} of ${lineCount} total log lines`);
      if (grep || level) {
        console.log(`   Filters applied: ${grep ? `grep="${grep}" ` : ''}${level ? `level="${level}"` : ''}`);
      }
    });
  }
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    lines: 50,
    follow: false,
    grep: null,
    since: null,
    level: null
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    switch (arg) {
      case '-n':
      case '--lines':
        options.lines = parseInt(args[++i]) || 50;
        break;
      case '-f':
      case '--follow':
        options.follow = true;
        break;
      case '-g':
      case '--grep':
        options.grep = args[++i];
        break;
      case '-l':
      case '--level':
        options.level = args[++i].toUpperCase();
        break;
      case '-s':
      case '--since':
        options.since = args[++i];
        break;
      case '--help':
      case '-h':
        console.log(`
Mesna POS Log Viewer

Usage:
  node scripts/log-viewer.js [options]

Options:
  -n, --lines <num>   Number of lines to show (default: 50)
  -f, --follow        Follow log output (like tail -f)
  -g, --grep <text>   Only show lines containing text
  -l, --level <level> Only show lines with level (INFO, WARN, ERROR, DEBUG)
  -s, --since <time>  Show lines since time (e.g., "1 hour ago") - NOT IMPLEMENTED YET
  -h, --help          Show this help message

Examples:
  node scripts/log-viewer.js
  node scripts/log-viewer.js -n 100
  node scripts/log-viewer.js -f
  node scripts/log-viewer.js -g "ERROR"
  node scripts/log-viewer.js -l "ERROR"
  node scripts/log-viewer.js -n 20 -f -g "P2P Mesh"
        `);
        process.exit(0);
        break;
      default:
        console.log(`⚠️  Unknown option: ${arg}`);
        console.log('Run "node scripts/log-viewer.js --help" for usage information.');
        process.exit(1);
    }
    i++;
  }

  viewLogs(options);
}

module.exports = { viewLogs, ensureLogDir };