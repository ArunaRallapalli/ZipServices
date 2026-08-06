'use strict';
/**
 * update-regression-results.js
 * Usage: npm run test:report   (from backend/)
 *
 * 2026-08-06: Playwright was removed from this project entirely (it only ever
 * automated a handful of UI-only scenarios, and duplicating effort across two
 * frameworks wasn't worth it). This script runs Jest and writes the results
 * into a NEW, timestamped file — it only ever READS Latest-RegressionTesting.xlsx
 * (the user's hand-maintained master), never writes to it. Each run produces:
 *   Regression-Test-Results/regression-run-jest-YYYY-MM-DD-HH-MM.xlsx
 *
 * The output is one row per scenario ID (the master spreads each ID across
 * multiple raw rows — one per bullet point, with the ID set only on the first
 * row — this script forward-fills and collapses those into a single row,
 * step-numbering Test Scenario / Expected Result when a scenario has more than
 * one part). Columns:
 *   ID | Test Scenario | Expected Result | Status | Automated Steps (Passed) | Manual Testing Required
 * Status is a short, filterable value (Pass / Fail / Not Automated (Frontend) /
 * Partial). The pass/fail detail for partially-automated IDs and the failure
 * reason for failing suites live in the two dedicated columns instead, each as
 * a numbered list — not crammed into the Status cell.
 *
 * AutoFilter is enabled on the header row across all columns.
 */

const { execSync } = require('child_process');
const XLSX = require('xlsx');
const fs   = require('fs');
const path = require('path');

const DIR          = path.join(__dirname, '..', '..', '..', 'Regression TestScenarios');
const RESULTS_DIR  = path.join(DIR, 'Regression-Test-Results');
const MASTER_XLSX  = path.join(DIR, 'Latest-RegressionTesting.xlsx');

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
  34: 'messages.test.ts', 54: 'messages.test.ts', 61: 'messages.test.ts',
  41: 'orders.test.ts', 44: 'orders.test.ts', 51: 'orders.test.ts', 52: 'orders.test.ts',
  // 42, 50, 59 are only PARTIALLY covered — see PARTIAL_DETAILS below for the
  // exact breakdown of what orders.test.ts automates vs. what's still UI-only.
  42: 'orders.test.ts', 50: 'orders.test.ts', 59: 'orders.test.ts',
};

const PARTIAL_DETAILS = {
  42: {
    automated: [
      'Order-confirmation email sent to buyer, provider, and admin (includes buyer timezone)',
      'Second buyer blocked from an already-reserved photo slot (multi-customer race)',
      'Stock reverts when a provider cancels an order',
    ],
    manual: [
      'Shipping amount displaying correctly in the order summary screen',
    ],
  },
  50: {
    automated: [
      'Stock deducts on order placement',
      'Stock auto-reverts when the expiry sweep runs on an unpaid order',
    ],
    manual: [
      'Order Report screen layout and fields (photo, title, product ID, QTY, price, deliver-to block, disclaimer, done button)',
    ],
  },
  59: {
    automated: [
      'Deterministic product ID format (#P<post_id>-<photo_index+1>)',
      'Reserved photo slot is unavailable to other buyers',
      'Stock decrements on order and reverts via the expiry sweep',
    ],
    manual: [
      'Photo variant selector click interaction',
      'Order-history screen displaying product ID with image',
    ],
  },
};
const PARTIAL_IDS = new Set(Object.keys(PARTIAL_DETAILS).map(Number));

// IDs with no backend logic to assert against — pure UI navigation/layout/
// copy, permanently out of reach for Jest (not "not yet automated").
const FRONTEND_ONLY_IDS = new Set([3, 4, 5, 6, 38, 39, 40, 48, 49, 55, 56, 60]);

const numberedList = items => items.map((t, i) => `${i + 1}. ${t}`).join('\n');
const stepText     = parts => parts.length <= 1 ? (parts[0] || '') : parts.map((t, i) => `Step ${i + 1}: ${t}`).join('\n');

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

// Collapse the master's raw per-step rows into one block per scenario ID,
// forward-filling the ID down through blank/non-numeric ID cells.
function groupMasterRowsById(masterRows) {
  const blocks = [];
  const byId = new Map();
  let lastId = null;

  // Row 0-2 (raw index) are the master's multi-row header; data starts at index 3.
  for (let i = 3; i < masterRows.length; i++) {
    const row = masterRows[i];
    const idCell = row[0];
    const numericId = Number(idCell);
    const startsNewId = idCell !== undefined && idCell !== null && idCell !== '' && Number.isFinite(numericId);
    const id = startsNewId ? numericId : lastId;
    if (startsNewId) lastId = id;
    if (id == null) continue; // stray rows before the first real ID, if any

    if (!byId.has(id)) {
      const block = { id, scenarios: [], expected: [] };
      byId.set(id, block);
      blocks.push(block);
    }
    const block = byId.get(id);
    const scenario = row[1];
    const expected = row[2];
    if (scenario) block.scenarios.push(String(scenario).trim());
    if (expected) block.expected.push(String(expected).trim());
  }
  return blocks;
}

function statusAndDetails(id, suiteMap) {
  if (FRONTEND_ONLY_IDS.has(id)) {
    return {
      status: 'Not Automated (Frontend)',
      automated: '',
      manual: numberedList(['Entire scenario requires manual/frontend testing (no backend logic to automate).']),
    };
  }

  const file = ID_TO_FILE[id];
  if (!file) return { status: 'Not Yet Automated', automated: '', manual: '' };

  const suite = suiteMap[file];
  if (!suite) return { status: 'Not Run', automated: '', manual: '' };

  if (PARTIAL_IDS.has(id)) {
    const { automated, manual } = PARTIAL_DETAILS[id];
    return {
      status: suite.passed ? 'Partial' : 'Fail',
      automated: numberedList(automated),
      manual: numberedList(manual),
    };
  }

  if (!suite.passed) {
    const reason = suite.failures.map(f => `${f.name}: ${f.message}`).join(' | ').slice(0, 400);
    return { status: 'Fail', automated: '', manual: numberedList([`Investigate test failure: ${reason}`]) };
  }

  return { status: 'Pass', automated: '', manual: '' };
}

// ── Main ─────────────────────────────────────────────────────────────────────
console.log('\nRunning Jest...\n');
const jestOutput = runJest();
const suiteMap   = buildSuiteMap(jestOutput);
console.log(`\nJest test assertions: ${jestOutput.numPassedTests} passed, ${jestOutput.numFailedTests} failed\n`);

if (!fs.existsSync(MASTER_XLSX)) {
  console.error(`Master file not found: ${MASTER_XLSX}`);
  process.exit(1);
}
if (!fs.existsSync(RESULTS_DIR)) fs.mkdirSync(RESULTS_DIR, { recursive: true });

// Read-only — this workbook is never written back to MASTER_XLSX.
const wbSrc = XLSX.readFile(MASTER_XLSX);
const wsSrc = wbSrc.Sheets[wbSrc.SheetNames[0]];
const masterRows = XLSX.utils.sheet_to_json(wsSrc, { header: 1, defval: '' });
const blocks = groupMasterRowsById(masterRows);

const now       = new Date();
const pad       = n => String(n).padStart(2, '0');
const fileStamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}-${pad(now.getMinutes())}`;
const outputPath = path.join(RESULTS_DIR, `regression-run-jest-${fileStamp}.xlsx`);

let passCount = 0, failCount = 0, frontendCount = 0, partialCount = 0, otherCount = 0;

const outRows = blocks.map(block => {
  const { status, automated, manual } = statusAndDetails(block.id, suiteMap);
  if (status === 'Pass') passCount++;
  else if (status === 'Fail') failCount++;
  else if (status === 'Not Automated (Frontend)') frontendCount++;
  else if (status === 'Partial') partialCount++;
  else otherCount++;

  return {
    'ID':                        block.id,
    'Test Scenario':             stepText(block.scenarios),
    'Expected Result':           stepText(block.expected),
    'Status':                    status,
    'Automated Steps (Passed)':  automated,
    'Manual Testing Required':   manual,
  };
});

const wsOut = XLSX.utils.json_to_sheet(outRows, {
  header: ['ID', 'Test Scenario', 'Expected Result', 'Status', 'Automated Steps (Passed)', 'Manual Testing Required'],
});
wsOut['!cols'] = [{ wch: 6 }, { wch: 35 }, { wch: 55 }, { wch: 24 }, { wch: 50 }, { wch: 50 }];
wsOut['!autofilter'] = { ref: `A1:F1` }; // xlsx auto-extends this down to the sheet's full row range

const wbOut = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wbOut, wsOut, `Run ${fileStamp}`);
XLSX.writeFile(wbOut, outputPath);

console.log(`Pass: ${passCount}  Fail: ${failCount}  Partial: ${partialCount}  Frontend-only: ${frontendCount}  Other: ${otherCount}`);
console.log(`\nResults written to: ${outputPath}`);
console.log(`(Latest-RegressionTesting.xlsx was only read, never modified.)\n`);
