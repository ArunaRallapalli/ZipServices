'use strict';
/**
 * update-regression-results.js
 * Usage: npm run test:report   (from backend/)
 *
 * Runs Jest then creates a NEW dated results file:
 *   regression-run-YYYY-MM-DD-HH-MM.xlsx
 *
 * Each run is a separate file so history is clean and easy to archive/share.
 * The master regression-scenarios.xlsx is never modified.
 */

const { execSync } = require('child_process');
const XLSX = require('xlsx');
const fs   = require('fs');
const path = require('path');

const DIR      = path.join(__dirname, '..', '..', '..', 'Regression TestScenarios');
const CSV_PATH  = path.join(DIR, 'regression-scenarios.csv');
const XLSX_PATH = path.join(DIR, 'regression-scenarios.xlsx');

// ── RFC 4180 CSV parser ──────────────────────────────────────────────────────
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

// ── Run Jest ─────────────────────────────────────────────────────────────────
function runJest() {
  const jsonFile = path.join(__dirname, '_jest_results_tmp.json');
  try {
    execSync(
      `cross-env NODE_ENV=test NODE_TLS_REJECT_UNAUTHORIZED=0 npx jest --forceExit --json --outputFile="${jsonFile}"`,
      { cwd: path.join(__dirname, '..'), stdio: 'inherit' }
    );
  } catch (_) { /* non-zero exit on failures is expected */ }

  if (!fs.existsSync(jsonFile)) {
    console.error('Jest did not produce JSON output. Aborting.');
    process.exit(1);
  }
  const raw = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
  fs.unlinkSync(jsonFile);
  return raw;
}

// Build map: test file basename → { passed, failures }
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
        message: ((t.failureMessages || [])[0] || '').split('\n')[0].replace(/^\s+/, '').slice(0, 150),
      }));
    map[name] = { passed: suite.status === 'passed', failures };
  }
  return map;
}

function extractFile(steps) {
  const m = (steps || '').match(/(\w+\.test\.ts)/);
  return m ? m[1] : null;
}

function colIdx(header, name) {
  const idx = header.indexOf(name);
  if (idx === -1) throw new Error(`Column "${name}" not found. Run: npm run regression:setup first.`);
  return idx;
}

// ── Load reference data ───────────────────────────────────────────────────────
function loadReference() {
  if (fs.existsSync(XLSX_PATH)) {
    const wb = XLSX.readFile(XLSX_PATH);
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  }
  if (fs.existsSync(CSV_PATH)) {
    console.log('ℹ️  No xlsx found — reading from CSV');
    return parseCSV(fs.readFileSync(CSV_PATH, 'utf8'));
  }
  console.error(`Reference file not found in: ${DIR}`);
  process.exit(1);
}

// ── Main ─────────────────────────────────────────────────────────────────────
console.log('\n🧪 Running test suite...\n');
const jestOutput = runJest();
const suiteMap   = buildSuiteMap(jestOutput);

console.log(`\n📊 Jest summary: ${jestOutput.numPassedTests} passed, ${jestOutput.numFailedTests} failed\n`);

const refRows  = loadReference();
const header   = refRows[0];

const COL_COVERAGE = colIdx(header, 'Automation Coverage');
const COL_STEPS    = colIdx(header, 'Automated Steps');

// Timestamp for filename and column
const now        = new Date();
const pad        = n => String(n).padStart(2, '0');
const timestamp  = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
const fileStamp  = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}-${pad(now.getHours())}-${pad(now.getMinutes())}`;
const outputPath = path.join(DIR, `regression-run-${fileStamp}.xlsx`);

// Build result rows: Row | ID | Module | Test Scenario | Automation Coverage | Test Status | Failure Reason
const resultHeader = ['Row', 'ID', 'Module', 'Test Scenario', 'Automation Coverage', 'Test Status', 'Failure Reason'];
const resultRows   = [resultHeader];

let passCount = 0, failCount = 0, partialCount = 0, naCount = 0;

for (let i = 1; i < refRows.length; i++) {
  const row      = refRows[i];
  const coverage = String(row[COL_COVERAGE] || '');
  const steps    = String(row[COL_STEPS]    || '');

  // Pull identifying columns from reference
  const rowId    = String(row[0] || '');
  const id       = String(row[1] || '');
  const module   = String(row[2] || '');
  const scenario = String(row[3] || '');

  let status = '', reason = '';

  if (coverage === 'None') {
    status = 'N/A - Manual';
    naCount++;
  } else {
    const file  = extractFile(steps);
    const suite = file ? suiteMap[file] : null;

    if (!suite) {
      status = 'Not Run';
      reason = file ? `Suite ${file} not in results` : 'No test file referenced';
    } else if (!suite.passed) {
      status = 'Fail';
      reason = suite.failures.map(f => `${f.name}: ${f.message}`).join(' | ').slice(0, 250);
      failCount++;
    } else if (coverage === 'Partial') {
      status = 'Partial Pass';
      reason = 'API tests pass; manual steps still required';
      partialCount++;
    } else {
      status = 'Pass';
      passCount++;
    }
  }

  resultRows.push([rowId, id, module, scenario, coverage, status, reason]);
}

// Write results xlsx
const ws = XLSX.utils.aoa_to_sheet(resultRows);
ws['!cols'] = [
  { wch: 5  }, // Row
  { wch: 5  }, // ID
  { wch: 25 }, // Module
  { wch: 45 }, // Test Scenario
  { wch: 18 }, // Automation Coverage
  { wch: 15 }, // Test Status
  { wch: 60 }, // Failure Reason
];
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, timestamp);
XLSX.writeFile(wb, outputPath);

console.log(`✅ Results saved: ${path.basename(outputPath)}`);
console.log(`   Pass: ${passCount}  |  Fail: ${failCount}  |  Partial Pass: ${partialCount}  |  N/A - Manual: ${naCount}`);

if (failCount > 0) {
  console.log('\n⚠️  Failed rows:');
  resultRows.slice(1)
    .filter(r => r[5] === 'Fail')
    .forEach(r => console.log(`   Row ${r[0]} (ID ${r[1]}) — ${r[2]}: ${r[6]}`));
}
