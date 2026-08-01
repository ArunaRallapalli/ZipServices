'use strict';
/**
 * update-regression-results.js
 * Usage: npm run test:report   (from backend/)
 *
 * 2026-07-31: rewritten to read from Regression-Scenarios-Jest.xlsx (the split
 * generated from the user's master Latest-RegressionTesting.xlsx) instead of the
 * old regression-scenarios.csv, which the user never authored/maintained.
 *
 * Runs Jest, matches each scenario ID to its covering test file via a hardcoded
 * mapping (verified against the "ID-X" comments already in each *.test.ts file),
 * and writes a NEW dated results file:
 *   Regression-Test-Results/regression-run-jest-YYYY-MM-DD-HH-MM.xlsx
 *
 * Regression-Scenarios-Jest.xlsx itself is never modified.
 */

const { execSync } = require('child_process');
const XLSX = require('xlsx');
const fs   = require('fs');
const path = require('path');

const DIR         = path.join(__dirname, '..', '..', '..', 'Regression TestScenarios');
const RESULTS_DIR = path.join(DIR, 'Regression-Test-Results');
const SOURCE_XLSX = path.join(DIR, 'Regression-Scenarios-Jest.xlsx');

if (!fs.existsSync(RESULTS_DIR)) fs.mkdirSync(RESULTS_DIR, { recursive: true });

// ID -> Jest test file, verified against the "ID-X" comments in each *.test.ts file.
const ID_TO_FILE = {
  1: 'auth.test.ts', 2: 'auth.test.ts',
  7: 'posts.test.ts', 14: 'posts.test.ts', 15: 'posts.test.ts', 32: 'posts.test.ts', 33: 'posts.test.ts',
  8: 'thrift.test.ts',
  9: 'photo.test.ts', 35: 'photo.test.ts',
  10: 'admin.test.ts', 11: 'admin.test.ts', 12: 'admin.test.ts', 13: 'admin.test.ts',
  16: 'admin.test.ts', 17: 'admin.test.ts', 18: 'admin.test.ts',
  19: 'booking.test.ts', 20: 'booking.test.ts', 21: 'booking.test.ts',
  22: 'booking.test.ts', 23: 'booking.test.ts', 24: 'booking.test.ts',
  25: 'reviews.test.ts', 26: 'reviews.test.ts', 27: 'reviews.test.ts', 28: 'reviews.test.ts',
  29: 'reviews.test.ts', 30: 'reviews.test.ts', 31: 'reviews.test.ts',
  34: 'messages.test.ts',
  41: 'orders.test.ts', 44: 'orders.test.ts', 51: 'orders.test.ts', 52: 'orders.test.ts',
};

// ── Run Jest ─────────────────────────────────────────────────────────────────
function runJest() {
  const jsonFile = path.join(__dirname, '_jest_results_tmp.json');
  try {
    execSync(
      `cross-env NODE_ENV=test NODE_TLS_REJECT_UNAUTHORIZED=0 npx jest --forceExit --json --outputFile="${jsonFile}"`,
      { cwd: path.join(__dirname, '..'), stdio: 'inherit' }
    );
  } catch (_) { /* non-zero exit on test failures is expected */ }

  if (!fs.existsSync(jsonFile)) {
    console.error('Jest did not produce JSON output. Aborting.');
    process.exit(1);
  }
  const raw = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
  fs.unlinkSync(jsonFile);
  return raw;
}

// Build map: test file basename -> { passed, failures[] }
function buildSuiteMap(jestOutput) {
  const map = {};
  for (const suite of jestOutput.testResults) {
    const filePath = suite.name || suite.testFilePath;
    if (!filePath) continue;
    const name       = path.basename(filePath);
    const assertions = suite.assertionResults || suite.testResults || [];
    const failures   = assertions
      .filter(t => t.status === 'failed')
      .map(t => ({
        name:    t.fullName,
        message: ((t.failureMessages || [])[0] || '').split('\n')[0].replace(/^\s+/, '').slice(0, 200),
      }));
    map[name] = { passed: suite.status === 'passed', failures };
  }
  return map;
}

// ── Main ─────────────────────────────────────────────────────────────────────
console.log('\nRunning Jest...\n');
const jestOutput = runJest();
const suiteMap   = buildSuiteMap(jestOutput);

console.log(`\nJest test assertions: ${jestOutput.numPassedTests} passed, ${jestOutput.numFailedTests} failed\n`);

if (!fs.existsSync(SOURCE_XLSX)) {
  console.error(`Source file not found: ${SOURCE_XLSX}`);
  process.exit(1);
}
const wbSrc  = XLSX.readFile(SOURCE_XLSX);
const wsSrc  = wbSrc.Sheets[wbSrc.SheetNames[0]];
const rows   = XLSX.utils.sheet_to_json(wsSrc, { defval: '' });

const now       = new Date();
const pad       = n => String(n).padStart(2, '0');
const timestamp = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
const fileStamp = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}-${pad(now.getHours())}-${pad(now.getMinutes())}`;
const outputPath = path.join(RESULTS_DIR, `regression-run-jest-${fileStamp}.xlsx`);

let passCount = 0, failCount = 0, notRunCount = 0, notAutomatedCount = 0;

const resultRows = rows.map(row => {
  const id     = row['ID'];
  const file   = ID_TO_FILE[id] || null;
  const status = String(row['Automation Status'] || '');

  let outcome, failureReason = '';

  if (!file) {
    // "Not Yet Automated - Planned" rows (54, 61) — nothing to run yet.
    outcome = 'Not Yet Automated';
    notAutomatedCount++;
  } else {
    const suite = suiteMap[file];
    if (!suite) {
      outcome       = 'Not Run';
      failureReason = `Suite ${file} not in Jest results`;
      notRunCount++;
    } else if (suite.passed) {
      outcome = 'Pass';
      passCount++;
    } else {
      outcome       = 'Fail';
      failureReason = suite.failures.map(f => `${f.name}: ${f.message}`).join(' | ').slice(0, 300);
      failCount++;
    }
  }

  return {
    'ID':                  id,
    'Test Scenario':       row['Test Scenario'],
    'Expected Result':     row['Expected Result'],
    'Test File':           file || row['Covered By'],
    'Run Status':          outcome,
    'Failure Reason':      failureReason,
    'Execution Date/Time': timestamp,
    'Last Manual Result':  row['Last Manual Result'],
  };
});

const wsOut = XLSX.utils.json_to_sheet(resultRows, {
  header: ['ID', 'Test Scenario', 'Expected Result', 'Test File', 'Run Status', 'Failure Reason', 'Execution Date/Time', 'Last Manual Result'],
});
wsOut['!cols'] = [{ wch: 6 }, { wch: 45 }, { wch: 55 }, { wch: 20 }, { wch: 12 }, { wch: 40 }, { wch: 20 }, { wch: 18 }];
const wbOut = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wbOut, wsOut, `Run ${fileStamp}`);
XLSX.writeFile(wbOut, outputPath);

console.log(`Pass: ${passCount}  Fail: ${failCount}  Not Run: ${notRunCount}  Not Yet Automated: ${notAutomatedCount}`);
console.log(`\nResults written to: ${outputPath}\n`);
