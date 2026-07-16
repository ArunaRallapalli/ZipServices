'use strict';
/**
 * setup-regression-columns.js
 * Run ONCE: node scripts/setup-regression-columns.js
 *
 * Transforms regression-scenarios.csv:
 *   - Renames "Automated"      → "Automation Coverage"  (Full / Partial / None)
 *   - Renames "Automation Notes" → "Automated Steps"    (what the test file actually verifies)
 *   - Adds    "Manual Steps Required"                   (what still needs human testing)
 *   - Adds    "Test Status"                             (populated by update-regression-results.js)
 *   - Adds    "Failure Reason"                          (populated by update-regression-results.js)
 *   - Adds    "Last Run Date"                           (populated by update-regression-results.js)
 */

const fs   = require('fs');
const path = require('path');

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

function stringifyCSV(rows) {
  return rows.map(row =>
    row.map(f => {
      if (/[,"\r\n]/.test(f)) return '"' + f.replace(/"/g, '""') + '"';
      return f;
    }).join(',')
  ).join('\r\n') + '\r\n';
}

// ── Content keyed by the "Row" column value ──────────────────────────────────

// What the automated test actually verifies
const AUTOMATED_STEPS = {
  '3':   'auth.test.ts → POST /register → 201; user_id created in DB; password hashed',
  '4':   'None',
  '5':   'auth.test.ts → registers with UPPERCASE email; logs in with lowercase → token returned (201)',
  '6':   'None',
  '7':   'posts.test.ts → GET /api/service-posts/search?category=X&zip=Y returns matching posts',
  '8':   'posts.test.ts → GET /api/service-posts returns list; GET /api/service-posts/:id returns title/description/category/price/in_stock',
  '9':   'None',
  '10':  'None',
  '11':  'None',
  '12':  'posts.test.ts → POST /api/service-posts (201); GET /api/service-posts/search returns the new post',
  '13':  'posts.test.ts → creates one post and confirms it appears in search results',
  '14':  'None',
  '15':  'None',
  '16':  'None',
  '17':  'posts.test.ts → POST /api/service-posts triggers sendNewPostNotification (Resend mocked; call confirmed)',
  '18':  'admin.test.ts → GET /api/service-categories returns category list; POST /api/service-categories creates new category (201)',
  '19':  'admin.test.ts → POST /api/service-categories with new category name → 201',
  '20':  'admin.test.ts → GET /api/service-categories/requests lists pending requests; is_admin guard enforced',
  '21':  'None',
  '22':  'posts.test.ts → GET /api/service-posts/search?category=X&zip=Y returns post with matching category',
  '23':  'None',
  '24':  'admin.test.ts → PUT /business-owners/by-user/:id updates profile (200); 403 returned when updating another user',
  '25':  'admin.test.ts → PUT /business-owners/by-user/:id with updated fields → 200; changes persisted in DB',
  '26':  'None',
  '27':  'booking.test.ts → POST /api/availability/book creates booking (200/201); PATCH to confirmed → 200',
  '28':  'booking.test.ts → PATCH /api/availability/bookings/:id with status=confirmed → 200',
  '29':  'booking.test.ts → PATCH /api/availability/bookings/:id with status=cancelled → 200',
  '30':  'booking.test.ts → POST /api/availability/book with future date → booking created (200/201); booking_id returned',
  '31':  'booking.test.ts → POST /api/availability with dates=[dateStr] + isAvailable=false → date blocked (200/201)',
  '32':  'booking.test.ts → PATCH /api/availability/bookings/:id with status=completed → 200',
  '33':  'None',
  '34':  'reviews.test.ts → POST /api/reviews with rating+comment → 201; reviewer_id matches auth token',
  '35':  'reviews.test.ts → GET /api/reviews/provider/:id returns array of reviews with rating fields',
  '36':  'reviews.test.ts → POST /api/reviews where reviewer_id=provider_id → 403 with cannot-review-yourself error',
  '37':  'booking.test.ts → block date (POST /api/availability with isAvailable=false); cancel booking (PATCH status=cancelled)',
  '38':  'admin.test.ts → GET /api/service-categories/requests returns pending list; admin auth guard tested',
  '39':  'admin.test.ts → GET /api/service-categories/requests returns pending list; admin auth guard tested',
  '40':  'posts.test.ts → PATCH /api/service-posts/:id/inactivate → 200; subsequent search does not return the post',
  '41':  'posts.test.ts → PUT /api/service-posts/:id with new title/description → 200; GET confirms changes persisted',
  '42':  'messages.test.ts → POST /messages (201); GET /messages/:a/:b returns conversation array with both messages',
  '43':  'messages.test.ts → messages sent/received successfully; Resend mock confirms email trigger called',
  '44':  'photo.test.ts → POST /api/service-posts/:id/upload-photo → 200; response contains Supabase storage URL',
  '45':  'photo.test.ts → GET /api/service-posts/search after upload returns the post (photo-linked post discoverable)',
  '46':  'None',
  '48':  'thrift.test.ts → GET /api/service-posts/:id without auth → 200; POST /api/thrift-requests without auth → 401',
  '49':  'thrift.test.ts → POST /api/thrift-requests with buyer token → 201; request_id returned in response',
  '50':  'thrift.test.ts → request created (201); Resend mock confirms seller notification email trigger called',
  '51':  'thrift.test.ts → duplicate request by same buyer → 409 "already have active request"; second buyer request → 201',
  '52':  'thrift.test.ts → GET /api/thrift-requests/provider returns request list with buyer_name enrichment',
  '53':  'thrift.test.ts → PATCH /api/thrift-requests/:id/approve-complete → 200; in_stock verified < original value',
  '54':  'None',
  '55':  'None',
  '56':  'None',
  '57':  'thrift.test.ts → approve-complete decrements in_stock; test verifies in_stock < 2 (original quantity)',
  '60':  'posts.test.ts → POST /api/service-posts with Catering category → 201; response contains no payment-related fields',
  '61':  'None',
  '64':  'None',
  '65':  'orders.test.ts → GET /api/service-posts/:id without auth → 200; Boutique post details including payment fields returned',
  '66':  'None',
  '67':  'None',
  '68':  'None',
  '69':  'None',
  '70':  'None',
  '71':  'None',
  '72':  'None',
  '73':  'None',
  '74':  'orders.test.ts → GET /api/service-posts/:id after order placed → in_stock < 3 (original value)',
  '75':  'orders.test.ts → PATCH /api/orders/:id/status to completed (200); Resend mock confirms completion email trigger called',
  '76':  'None',
  '77':  'orders.test.ts → POST /api/orders with buyer token → 201; order_id returned; full order payload accepted',
  '78':  'None',
  '79':  'None',
  '80':  'None',
  '81':  'None',
  '82':  'None',
  '83':  'orders.test.ts → PATCH /api/orders/:id/status with seller token → completed (200)',
  '84':  'orders.test.ts → POST /api/orders (201) + PATCH /api/orders/:id/status to completed (200); end-to-end order flow',
  '85':  'None',
  '86':  'orders.test.ts → POST /api/orders confirmed (201); Resend mock confirms 3 email triggers (admin/seller/buyer)',
  '87':  'orders.test.ts → POST /api/orders confirmed (201); Resend mock confirms 3 email triggers (admin/seller/buyer)',
  '88':  'orders.test.ts → POST /api/orders confirmed (201); Resend mock confirms 3 email triggers (admin/seller/buyer)',
  '89':  'None',
  '90':  'None',
  '91':  'orders.test.ts → seller creates order on own post → API returns 201 (no server-side self-order block; restriction is UI-only)',
  '92':  'orders.test.ts → POST /api/orders with shipping_address + total_cents including shipping_charge_cents → 201',
  '93':  'orders.test.ts → order placed (201) + marked completed (200); Resend mock confirms email triggers at each stage',
  '94':  'orders.test.ts → PATCH /api/orders/:id/status with seller token → 200; status set to completed',
  '95':  'None',
  '96':  'messages.test.ts → POST /messages send (201); GET conversation returns messages; Resend mock confirms email trigger',
  '97':  'None',
  '98':  'None',
  '99':  'None',
  '100': 'None',
  '102': 'None',
  '104': 'None',
  '105': 'None',
  '106': 'None',
  '107': 'None',
};

// What a human tester must still do manually
const MANUAL_STEPS = {
  '3':   'None',
  '4':   'Forgot Password → enter email → open inbox → follow reset link → set new password → verify login succeeds',
  '5':   'None',
  '6':   'Open app as guest → tap each tab (Services / Sale / Thrifting) → confirm sign-in prompt appears each time',
  '7':   'Verify category dropdown UI, map pins in results, and click-through to post detail page in the app',
  '8':   'Verify UI fields: reviews/ratings, Contact Provider button; Boutique shows price and Add to Cart',
  '9':   'Open app as guest → verify All / Service / Sale / Thrifting tabs each show correct post types',
  '10':  'As guest, tap a review rating on any post → confirm sign-in screen appears',
  '11':  'As guest, tap rating → sign in → confirm routed to business owner home screen',
  '12':  'None',
  '13':  'Create a second post with a different category → verify both appear in search results and Recent Posts screen',
  '14':  'Select non-Boutique/Thrift category in Post Service → verify fields: Title / Description / Category / Photos / Price / ZIP / Phone / Email',
  '15':  'Select Preloved & Thrifting → verify extra fields: Price (0.00 default) / Delivery Time / Qty Available / Photos (required *)',
  '16':  'Select Boutique → verify extra fields: Price * / Delivery Time / Qty / Shipping ($10 default) / Payment Method dropdown / Payment Info text box',
  '17':  'Check admin inbox for new post notification email after posting a service',
  '18':  'None',
  '19':  'None',
  '20':  'None',
  '21':  'Submit category request → have admin approve/reject from admin tools → check requester inbox for email',
  '22':  'None',
  '23':  'Log in as post owner → find own post in search → verify "This is your post. You cannot contact yourself." message',
  '24':  'Sign in → open Profile screen → verify admin section visible for admin users and role displayed correctly',
  '25':  'None',
  '26':  'Sign in → verify all profile sections visible → tap Logout → confirm session ends',
  '27':  'Check provider inbox for booking request email; verify calendar shows the new booking in app UI',
  '28':  'Check both provider and customer inboxes for booking confirmation emails after provider confirms',
  '29':  'None',
  '30':  'None',
  '31':  'None',
  '32':  'Check customer inbox for booking completion email after provider marks booking as complete',
  '33':  'Navigate to chat screen with a provider → find Review option → submit review from the chat UI',
  '34':  'None',
  '35':  'Search for a category → open a post → verify review star rating displayed in search results and post detail UI',
  '36':  'None',
  '37':  'None',
  '38':  'Admin approves request from admin tools → check customer inbox for approval email',
  '39':  'Admin rejects request from admin tools → check customer inbox for rejection email',
  '40':  'None',
  '41':  'None',
  '42':  'None',
  '43':  'Check inbox to verify email received containing the actual message text content',
  '44':  'None',
  '45':  'None',
  '46':  'Open Recent Posts screen → verify only active non-category-request posts display; confirm inactive posts absent',
  '48':  'None',
  '49':  'Verify pop-up message "Your request has been sent to the seller" displays in app UI after tapping Request',
  '50':  'Check seller inbox for approval-request email with 48-hour deadline message',
  '51':  'None',
  '52':  'Verify red count badge displays on Thrift Requests button in My Listings screen',
  '53':  'None',
  '54':  'View thrift post → verify badges: green Available → yellow Active Requests (when requested) → Unavailable (when sold)',
  '55':  'Exhaust all stock → verify "Sorry, this item is not available" message displays in the app',
  '56':  'Submit request → wait 48h in production (1h in dev) → verify request auto-expires and item is re-listed',
  '57':  'Exhaust stock to 0 → verify "Sorry, not available" message shown in app UI',
  '60':  'View Catering post in app → verify no Add to Cart button and no In Stock / Delivery Time fields displayed',
  '61':  'View non-payment post → verify field order: photo → title → description → reviews → posted by → city/state',
  '64':  'Log in as seller → post Boutique item → verify extra fields: Qty / Delivery Time / Shipping ($10 default) / Payment Method / Payment Info',
  '65':  'None',
  '66':  'As guest → tap Add to Cart on Boutique post → verify redirect to sign-in/home screen',
  '67':  'Sign in → browse Boutique post → select a specific dress → tap Add to Cart → verify item in cart',
  '68':  'Create Boutique post with multiple photos → verify photo variant selector shows each photo as a separate selectable item',
  '69':  'Place order → verify unique product ID displayed consistently in cart / checkout / order confirmation / order history',
  '70':  'Complete order → open Order Confirmed screen → verify product image and product ID are displayed',
  '71':  'Complete order → check order confirmation email → verify product ID and image included in email body',
  '72':  'Order an item → return to same post → verify that specific item is no longer available to add to cart',
  '73':  'Complete order → check order history screen → verify product ID and image displayed for the completed order',
  '74':  'None',
  '75':  'Check order completion email for product ID and image content',
  '76':  'Place order → do NOT mark complete for 12h → verify in_stock reverts and order shows as expired',
  '77':  'Check admin / seller / buyer inboxes for order confirmation emails after order placement',
  '78':  'View Boutique post → verify field order: photo / title / description / reviews / Posted by / city+state / price / InStock / delivery / Add to Cart / Contact Provider',
  '79':  'Add item to cart → verify My Cart shows: photo / title / product ID / category / price×qty / qty stepper / Remove / Fulfillment selector / Proceed to Checkout',
  '80':  'Set each payment method in profile → create Boutique post → proceed to checkout → verify correct payment display text per method',
  '81':  'Proceed to payment → verify screen layout: order summary / shipping / total / payment info / address or pickup option / disclaimer / Confirm / Cancel',
  '82':  'Confirm order → open Order Report screen → verify: order ID / date / boutique name / items / total / delivery address / action message / disclaimer / Done button',
  '83':  'Verify in_stock UI updates after completion; wait 24h without completing → verify auto-revert and order marked expired',
  '84':  'None',
  '85':  'Place order as buyer in non-UTC timezone → check order email → verify date/time shown in buyer\'s local timezone',
  '86':  'Check seller inbox for "Awaiting Payment" order confirmation email',
  '87':  'Check buyer inbox for "Action Required Within 24 Hours" payment email with payment details',
  '88':  'Check admin inbox for new order notification email with correct order ID / customer / provider / total / status',
  '89':  'Place order → do NOT pay for 24h → verify order auto-cancelled and in_stock reverts',
  '90':  'Have 2 buyers add same last-in-stock item → both checkout simultaneously → verify first buyer succeeds; second buyer sees out-of-stock',
  '91':  'Log in as seller → open own Boutique post → verify "This is your post. You cannot contact yourself." shown (no Add to Cart)',
  '92':  'Select "Ship to Me" in cart → verify shipping subtotal displays correctly in cart and checkout order summary',
  '93':  'Check admin / seller / buyer inboxes for order tracking emails at placement and completion',
  '94':  'None',
  '95':  'Exhaust item stock to 0 → search for item → verify "sorry, not available" message and "Keep Browsing" button',
  '96':  'Send message in app → check receiver inbox for email containing the message text content',
  '97':  'Click "Keep Browsing" on out-of-stock screen → verify navigates to home/search (not stays on same page)',
  '98':  'Add item to cart → return to home screen → verify cart FAB (floating action button) appears with item count',
  '99':  'In Post Service (Boutique): test Zelle (email/phone format), Venmo (username rules), PayPal (email only), Cash App ($cashtag) → verify correct error messages',
  '100': 'Enter invalid payment info → verify error messages; enter valid info → verify auto-saved to profile settings for reuse',
  '102': 'Open Boutique post with Cash/Check payment → verify "Contact seller to arrange pickup/delivery" text near message box',
  '104': 'Send message → verify immediate email; send more within 1hr → verify only 1 email per hour; open chat within 10min → send message → verify no email sent',
  '105': 'Add Boutique + Thrifting items from same seller → tap Proceed to Checkout → verify alert: "Please checkout boutique and thrifting items separately"',
  '106': 'Add items from 2 different sellers → verify blue banner "Your cart has items from 2 sellers" → checkout Seller A → verify "Continue - 1 item left" → checkout Seller B → Done',
  '107': 'Add items from single seller (single type) → verify normal checkout flow with no alerts or cart splits',
};

function coverageLabel(automated) {
  if (automated === 'Yes') return 'Full';
  if (automated === 'Partial') return 'Partial';
  return 'None';
}

// ── Main ─────────────────────────────────────────────────────────────────────
const CSV_PATH = path.join(__dirname, '..', '..', '..', 'Regression TestScenarios', 'regression-scenarios.csv');

if (!fs.existsSync(CSV_PATH)) {
  console.error('CSV not found at:', CSV_PATH);
  process.exit(1);
}

const raw  = fs.readFileSync(CSV_PATH, 'utf8');
const rows = parseCSV(raw);

if (rows.length < 2) { console.error('CSV appears empty'); process.exit(1); }

// Check if new columns already exist (idempotent re-run guard)
if (rows[0].includes('Automation Coverage')) {
  console.log('⚠️  Columns already added. To re-run, remove the Automation Coverage column first.');
  process.exit(0);
}

// Update header
rows[0][7] = 'Automation Coverage';
rows[0][8] = 'Automated Steps';
rows[0].push('Manual Steps Required', 'Test Status', 'Failure Reason', 'Last Run Date');

let updated = 0;
for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  if (!row || row.length < 2) continue;
  const rowId = row[0];

  row[7] = coverageLabel(row[7] || '');
  row[8] = AUTOMATED_STEPS[rowId] !== undefined ? AUTOMATED_STEPS[rowId] : (row[8] || '');

  const manual = MANUAL_STEPS[rowId] !== undefined ? MANUAL_STEPS[rowId] : 'See test scenario';
  row.push(manual, '', '', '');
  updated++;
}

// Write CSV
fs.writeFileSync(CSV_PATH, stringifyCSV(rows), 'utf8');

// Also write master xlsx (reference doc — not modified by test runs)
const XLSX = require('xlsx');
const xlsxPath = CSV_PATH.replace('.csv', '.xlsx');
const ws = XLSX.utils.aoa_to_sheet(rows);
ws['!cols'] = rows[0].map((_, ci) => ({
  wch: Math.min(60, Math.max(10, ...rows.map(r => String(r[ci] || '').length)))
}));
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Regression Scenarios');
XLSX.writeFile(wb, xlsxPath);

console.log(`✅ Updated ${updated} rows`);
console.log(`   CSV  → ${CSV_PATH}`);
console.log(`   XLSX → ${xlsxPath}`);
console.log('   New columns: Automation Coverage, Automated Steps, Manual Steps Required, Test Status, Failure Reason, Last Run');
