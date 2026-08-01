'use strict';
/**
 * run-playwright-regression.js
 * Usage: npm run test:regression   (from repo root)
 *
 * Requires the app already running (npm run web) in a separate terminal —
 * Playwright does not start it automatically (see playwright.config.ts baseURL).
 *
 * Runs Playwright, matches each scenario ID to its covering spec file via a
 * hardcoded mapping, and writes a NEW dated results file:
 *   Regression-Test-Results/regression-run-playwright-YYYY-MM-DD-HH-MM.xlsx
 *
 * Regression-Scenarios-Playwright.xlsx itself is never modified.
 */

const { execSync } = require('child_process');
const XLSX = require('xlsx');
const fs   = require('fs');
const path = require('path');

const ROOT         = __dirname.endsWith('scripts') ? path.join(__dirname, '..') : __dirname;
const DIR          = path.join(ROOT, '..', 'Regression TestScenarios');
const RESULTS_DIR  = path.join(DIR, 'Regression-Test-Results');
const SOURCE_XLSX  = path.join(DIR, 'Regression-Scenarios-Playwright.xlsx');

if (!fs.existsSync(RESULTS_DIR)) fs.mkdirSync(RESULTS_DIR, { recursive: true });

// ID -> Playwright spec file. Only scenarios with a confirmed/existing spec are
// listed here; anything not in this map is reported as "Not Yet Automated".
const ID_TO_FILE = {
  3: '02-guest-role.spec.ts',
  4: '02-guest-role.spec.ts',
  5: '02-guest-role.spec.ts',
  6: '02-guest-role.spec.ts',
};

// ── Run Playwright ───────────────────────────────────────────────────────────
function runPlaywright() {
  const jsonFile = path.join(__dirname, '_playwright_results_tmp.json');
  try {
    execSync(
      `npx playwright test --reporter=json > "${jsonFile}"`,
      { cwd: ROOT, stdio: ['inherit', 'ignore', 'inherit'], shell: true }
    );
  } catch (_) { /* non-zero exit on test failures is expected */ }

  if (!fs.existsSync(jsonFile) || fs.statSync(jsonFile).size === 0) {
    console.error('Playwright did not produce JSON output. Is the app running (npm run web)? Aborting.');
    process.exit(1);
  }
  const raw = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
  fs.unlinkSync(jsonFile);
  return raw;
}

// Recursively walk Playwright's JSON reporter suite tree and build a map of
// spec-file basename -> { passed, failures[] }. Playwright nests one level of
// suites per project (Desktop Chrome / Mobile Safari) above the per-file suites,
// so this collects across all projects and treats a file as failed if it fails
// in ANY project.
function buildSuiteMap(playwrightOutput) {
  const map = {};

  function ensure(file) {
    if (!map[file]) map[file] = { passed: true, failures: [] };
    return map[file];
  }

  function walkSuite(suite) {
    const file = suite.file ? path.basename(suite.file) : null;
    if (Array.isArray(suite.specs)) {
      for (const spec of suite.specs) {
        const specFile = file || (spec.file ? path.basename(spec.file) : null);
        if (!specFile) continue;
        const entry = ensure(specFile);
        for (const test of spec.tests || []) {
          const results = test.results || [];
          const lastResult = results[results.length - 1];
          const status = lastResult ? lastResult.status : 'skipped';
          if (status !== 'passed' && status !== 'skipped') {
            entry.passed = false;
            entry.failures.push({
              name: spec.title,
              message: (lastResult && lastResult.error && lastResult.error.message || '').split('\n')[0].slice(0, 200),
            });
          }
        }
      }
    }
    for (const child of suite.suites || []) walkSuite(child);
  }

  for (const suite of playwrightOutput.suites || []) walkSuite(suite);
  return map;
}

// ── Main ─────────────────────────────────────────────────────────────────────
console.log('\nRunning Playwright (app must already be running via npm run web)...\n');
const pwOutput = runPlaywright();
const suiteMap = buildSuiteMap(pwOutput);

console.log(`\nPlaywright stats:`, pwOutput.stats || '(no stats in output)', '\n');

if (!fs.existsSync(SOURCE_XLSX)) {
  console.error(`Source file not found: ${SOURCE_XLSX}`);
  process.exit(1);
}
const wbSrc = XLSX.readFile(SOURCE_XLSX);
const wsSrc = wbSrc.Sheets[wbSrc.SheetNames[0]];
const rows  = XLSX.utils.sheet_to_json(wsSrc, { defval: '' });

const now       = new Date();
const pad       = n => String(n).padStart(2, '0');
const timestamp = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
const fileStamp = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}-${pad(now.getHours())}-${pad(now.getMinutes())}`;
const outputPath = path.join(RESULTS_DIR, `regression-run-playwright-${fileStamp}.xlsx`);

let passCount = 0, failCount = 0, notRunCount = 0, notAutomatedCount = 0;

const resultRows = rows.map(row => {
  const id     = row['ID'];
  const file   = ID_TO_FILE[id] || null;

  let outcome, failureReason = '';

  if (!file) {
    outcome = 'Not Yet Automated';
    notAutomatedCount++;
  } else {
    const suite = suiteMap[file];
    if (!suite) {
      outcome       = 'Not Run';
      failureReason = `Spec ${file} not in Playwright results`;
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
wsOut['!cols'] = [{ wch: 6 }, { wch: 45 }, { wch: 55 }, { wch: 24 }, { wch: 12 }, { wch: 40 }, { wch: 20 }, { wch: 18 }];
const wbOut = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wbOut, wsOut, `Run ${fileStamp}`);
XLSX.writeFile(wbOut, outputPath);

console.log(`Pass: ${passCount}  Fail: ${failCount}  Not Run: ${notRunCount}  Not Yet Automated: ${notAutomatedCount}`);
console.log(`\nResults written to: ${outputPath}\n`);
