'use strict';
/**
 * free-port.js
 * Runs automatically before starting the Expo/web dev server (see "predev" /
 * "preweb" / "prestart" scripts) so a leftover orphaned process doesn't either
 * crash startup or, worse, silently push Expo onto a different port than the
 * 8081 hardcoded everywhere (apiConfig.ts).
 */
const { execSync } = require('child_process');

const PORT = process.argv[2] || process.env.PORT || 8081;

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
