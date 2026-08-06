'use strict';
/**
 * free-port.js
 * Runs automatically before `npm run dev` (see "predev" script) so a leftover
 * orphaned server process from a previous session/crash doesn't block startup
 * with EADDRINUSE — killing it here beats requiring a manual PID hunt every time.
 */
const { execSync } = require('child_process');

const PORT = process.env.PORT || 5000;

function freePortWindows(port) {
  let out;
  try {
    out = execSync(`netstat -ano -p tcp`, { encoding: 'utf8' });
  } catch {
    return;
  }
  const pids = new Set();
  for (const line of out.split('\n')) {
    if (line.includes(`:${port} `) && /LISTENING/i.test(line)) {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && pid !== '0') pids.add(pid);
    }
  }
  for (const pid of pids) {
    try {
      execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
      console.log(`🔪 Freed port ${port} (killed leftover PID ${pid})`);
    } catch {
      // Already gone — fine.
    }
  }
}

function freePortUnix(port) {
  let pids;
  try {
    pids = execSync(`lsof -ti tcp:${port}`, { encoding: 'utf8' }).trim();
  } catch {
    return; // Nothing listening — lsof exits non-zero.
  }
  for (const pid of pids.split('\n').filter(Boolean)) {
    try {
      execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
      console.log(`🔪 Freed port ${port} (killed leftover PID ${pid})`);
    } catch {
      // Already gone — fine.
    }
  }
}

if (process.platform === 'win32') {
  freePortWindows(PORT);
} else {
  freePortUnix(PORT);
}
