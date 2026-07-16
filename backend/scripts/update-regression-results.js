'use strict';
/**
 * update-regression-results.js
 * Usage: npm run test:report   (from backend/)
 *
 * Runs the full Jest test suite with --json output, then writes
 * Test Status / Failure Reason / Last Run Date into regression-scenarios.csv
 * for every row whose "Automated Steps" references a test file.
 *
 * Status values written:
 *   Pass          - all tests in that suite passed
 *   Fail          - one or more tests in that suite failed
 *   Partial Pass  - Partial coverage row and suite passed (manual steps still needed)
 *   N/A - Manual  - Automation Coverage = None
 */

const { execSync } = require('child_process');
const fs   = require('fs');
const path = require('path');

// ── RFC 4180 CSV parser/writer ───────────────────────────────────────────────
function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQ = false, i = 0;
  const n = text.length;
  while (i < n) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; }
        else { inQ = false; i++; }
      } else { field += c; i++; }
    } else {
      if      (c === '"') { inQ = true; i++; }
      else if (c === ',') { row.push(field); field = ''; i++; }
      else if (c === '\r' && text[i + 1] === '\n') {
        row.push(field); field = ''; rows.push(row); row = []; i += 2;
      }
      else if (c === '\n') {
        row.push(field); field = ''; rows.push(row); row = []; i++;
      }
      else { field += c; i++; }
    }
  }
  if (row.length > 0 || field !== '') { row.push(field); rows.push(row); }
  return rows;
}

function stringifyCSV(rows) {
  return rows.map(row =>
    row.map(f => {
      if (/[,"\r\n]/.test(f)) return '"' + f.replace(/"/g, '""') + '"';
      return f;
    }).join(',')
  ).join('\r\n') + '\r\n';
}

// ── Run Jest and return structured results ───────────────────────────────────
function runJest() {
  const jsonFile = path.join(__dirname, '_jest_results_tmp.json');
  try {
    execSync(
      `cross-env NODE_ENV=test NODE_TLS_REJECT_UNAUTHORIZED=0 npx jest --forceExit --json --outputFile="${jsonFile}"`,
      { cwd: path.join(__dirname, '..'), stdio: 'inherit' }
    );
  } catch (_) {
    // Jest exits non-zero when tests fail — that's expected, continue
  }

  if (!fs.existsSync(jsonFile)) {
    console.error('Jest did not produce JSON output. Aborting.');
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
  fs.unlinkSync(jsonFile);
  return raw;
}

// Build map: basename → { passed: bool, failures: [{name, message}] }
// Jest JSON uses suite.name for the file path and suite.assertionResults for individual tests
function buildSuiteMap(jestOutput) {
  const map = {};
  for (const suite of jestOutput.testResults) {
    const filePath = suite.name || suite.testFilePath;
    if (!filePath) continue;
    const name = path.basename(filePath);
    const assertions = suite.assertionResults || suite.testResults || [];
    const failures = assertions
      .filter(t => t.status === 'failed')
      .map(t => ({
        name: t.fullName,
        message: ((t.failureMessages || [])[0] || '').split('\n')[0].replace(/^\s+/, '').slice(0, 120),
      }));
    map[name] = { passed: suite.status === 'passed', failures };
  }
  return map;
}

// ── Column index helpers ─────────────────────────────────────────────────────
function colIndex(header, name) {
  const idx = header.indexOf(name);
  if (idx === -1) throw new Error(`Column "${name}" not found. Run setup-regression-columns.js first.`);
  return idx;
}

// Extract test file name from "Automated Steps" value, e.g. "auth.test.ts → ..."
function extractFile(automatedSteps) {
  const m = automatedSteps.match(/(\w+\.test\.ts)/);
  return m ? m[1] : null;
}

// ── Main ─────────────────────────────────────────────────────────────────────
const CSV_PATH = path.join(__dirname, '..', '..', '..', 'Regression TestScenarios', 'regression-scenarios.csv');

if (!fs.existsSync(CSV_PATH)) {
  console.error('CSV not found at:', CSV_PATH);
  console.error('Run: node scripts/setup-regression-columns.js first.');
  process.exit(1);
}

console.log('\n🧪 Running test suite...\n');
const jestOutput = runJest();
const suiteMap   = buildSuiteMap(jestOutput);

const totalPass = jestOutput.numPassedTests;
const totalFail = jestOutput.numFailedTests;
console.log(`\n📊 Jest summary: ${totalPass} passed, ${totalFail} failed\n`);

const rows   = parseCSV(fs.readFileSync(CSV_PATH, 'utf8'));
const header = rows[0];

// Locate columns (fail fast if setup hasn't been run)
const COL_COVERAGE = colIndex(header, 'Automation Coverage');
const COL_STEPS    = colIndex(header, 'Automated Steps');
const COL_STATUS   = colIndex(header, 'Test Status');
const COL_REASON   = colIndex(header, 'Failure Reason');
const COL_DATE     = colIndex(header, 'Last Run Date');

const runDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
let rowsUpdated = 0;

for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  if (!row || row.length < COL_STATUS + 1) {
    // Ensure row is long enough
    while (row.length <= COL_DATE) row.push('');
  }

  const coverage = row[COL_COVERAGE] || '';
  const steps    = row[COL_STEPS]    || '';

  if (coverage === 'None') {
    row[COL_STATUS] = 'N/A - Manual';
    row[COL_REASON] = '';
    row[COL_DATE]   = runDate;
    rowsUpdated++;
    continue;
  }

  const file = extractFile(steps);
  if (!file || !suiteMap[file]) {
    // Test file not found in results (suite may not have run)
    if (coverage !== 'None') {
      row[COL_STATUS] = 'Not Run';
      row[COL_REASON] = file ? `Suite ${file} not in jest output` : 'No test file referenced';
      row[COL_DATE]   = runDate;
      rowsUpdated++;
    }
    continue;
  }

  const suite = suiteMap[file];

  if (!suite.passed) {
    const msgs = suite.failures.map(f => `${f.name}: ${f.message}`).join(' | ');
    row[COL_STATUS] = 'Fail';
    row[COL_REASON] = msgs.slice(0, 250);
  } else if (coverage === 'Partial') {
    row[COL_STATUS] = 'Partial Pass';
    row[COL_REASON] = 'API tests pass; manual steps still required (see Manual Steps Required column)';
  } else {
    row[COL_STATUS] = 'Pass';
    row[COL_REASON] = '';
  }

  row[COL_DATE] = runDate;
  rowsUpdated++;
}

fs.writeFileSync(CSV_PATH, stringifyCSV(rows), 'utf8');

const passRows    = rows.slice(1).filter(r => r[COL_STATUS] === 'Pass').length;
const failRows    = rows.slice(1).filter(r => r[COL_STATUS] === 'Fail').length;
const partialRows = rows.slice(1).filter(r => r[COL_STATUS] === 'Partial Pass').length;
const manualRows  = rows.slice(1).filter(r => r[COL_STATUS] === 'N/A - Manual').length;

console.log(`✅ CSV updated: ${CSV_PATH}`);
console.log(`   Pass: ${passRows}  |  Fail: ${failRows}  |  Partial Pass: ${partialRows}  |  N/A - Manual: ${manualRows}`);
if (failRows > 0) {
  console.log('\n⚠️  Failed rows:');
  rows.slice(1)
    .filter(r => r[COL_STATUS] === 'Fail')
    .forEach(r => console.log(`   Row ${r[0]} (ID ${r[1]}) — ${r[2]}: ${r[COL_REASON]}`));
}
