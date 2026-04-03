# GoZipMarket — Test Requirements
Branch: `feature/market-enhancements`
Date: April 2026

Run these SQL statements in **both dev and prod** before testing:

```sql
-- Catering delivery fields
ALTER TABLE service_posts ADD COLUMN IF NOT EXISTS delivery_option VARCHAR(20);
ALTER TABLE service_posts ADD COLUMN IF NOT EXISTS delivery_fee VARCHAR(50);

-- Thrifting category
INSERT INTO service_categories (category_name, description, accepts_payment, is_active)
VALUES ('Thrifting at GoZipMarket', 'Second-hand and thrifted items marketplace', true, true)
ON CONFLICT DO NOTHING;

-- Payment notification columns (if not already applied)
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_email_sent_at TIMESTAMP;

-- Payment method column on business_owners (if not already applied)
ALTER TABLE business_owners ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20);
```

---

## 1. Cart Price Bug Fix

**Feature:** Price parsing from range strings like `$49-$149`

**Test steps:**
1. Search for a service post whose price is entered as a range (e.g., `$49-$149`)
2. Tap "Add to Cart"
3. Open cart

**Expected:** Cart shows `$49.00` (first number), not `$49149.00`

---

## 2. Smart Email Notifications for Messages

**Feature:** Email notification when a new message is received

### 2a. First message — instant notification
1. User A sends the **first** message to User B who has **not been active** in the last 10 minutes
2. Check User B's inbox

**Expected:** Email delivered immediately after User A sends the message

### 2b. Active user — no notification
1. User B opens the messaging screen (marks themselves as active)
2. Within 10 minutes, User A sends another message

**Expected:** No email sent to User B (they are considered active)

### 2c. Follow-up messages — hourly batching
1. User A sends several follow-up messages after the first notification
2. Wait more than 60 minutes without User B responding

**Expected:** One batched email is sent (not one per message), containing the latest message

### 2d. Mark-read clears notification state
1. User B opens a conversation (marks messages as read)
2. User A sends a new message after this

**Expected:** User B receives a fresh first-message notification

---

## 3. Multi-Payment Method Support

**Feature:** Service providers can select their preferred payment method (Zelle, Venmo, PayPal, Cash App, Cash, Check)

### 3a. Provider sets payment method (Business Owner Profile)
1. Log in as a business owner
2. Go to Profile > Edit
3. Open the Payment Method dropdown
4. Select each option: Zelle, Venmo, PayPal, Cash App, Cash, Check

**For Zelle/Venmo/PayPal/Cash App:** A handle/ID field should appear
**For Cash/Check:** Handle field should be hidden

5. Save the profile

**Expected:** `payment_method` and (where applicable) `zelle_id` saved to DB

### 3b. Nudge banner
1. Log in as a business owner who has no `payment_method` set

**Expected:** A nudge banner appears prompting them to set their payment method

### 3c. Checkout flow — digital payment method (Zelle/Venmo etc.)
1. Add an item from a provider who has set Zelle (or another digital method) to cart
2. Proceed to Checkout > Payment

**Expected:**
- Payment section title shows "Pay via [Method Name]" (e.g., "Pay via Venmo")
- Instructions show: "Send $X via Venmo to [handle]"
- Order Report screen shows the same

### 3d. Checkout flow — Cash payment
1. Add an item from a provider who has `payment_method = 'cash'`
2. Proceed to Checkout > Payment

**Expected:**
- Payment section shows: "Provider will contact you to arrange cash payment after the order is confirmed"
- Order Report shows: "Payment: Cash — The provider will contact you to arrange cash payment"

### 3e. Checkout flow — Check payment
Same as 3d but for `payment_method = 'check'`

### 3f. Backward compatibility (provider has zelle_id but no payment_method)
1. Leave provider's `payment_method` as NULL, but `zelle_id` is set

**Expected:** App treats this as Zelle — checkout shows Zelle instructions as before

---

## 4. Two-Scenario Payment Model

**Feature:** Only categories with `accepts_payment = true` show the cart/checkout flow

### 4a. Category with `accepts_payment = false`
1. Search in a category where `accepts_payment = false` (e.g., Cleaning, Plumbing)
2. View search results

**Expected:** No "Add to Cart" button on any result card

### 4b. Category with `accepts_payment = true`
1. Search in a category where `accepts_payment = true` (e.g., Thrifting at GoZipMarket)
2. View search results

**Expected:** "Add to Cart" button appears on result cards (regardless of whether the provider has entered a payment handle)

---

## 5. Catering Delivery Option

**Feature:** When posting a Catering service, provider can specify Pickup/Delivery/Both and a delivery fee

### 5a. Post a Catering service with Pickup Only
1. Log in as a business owner
2. Go to "Post Service" and select category **Catering**
3. Under "Delivery Option" select **Pickup Only**
4. Submit the post

**Expected:**
- No delivery fee field shown
- Post saved with `delivery_option = 'pickup'`, `delivery_fee = null`

### 5b. Post a Catering service with Delivery Only + flat fee
1. Select category **Catering**
2. Select **Delivery Only**
3. Enter delivery fee: `8.00`
4. Submit

**Expected:** Post saved with `delivery_option = 'delivery'`, `delivery_fee = '8.00'`

### 5c. Post a Catering service with Pickup & Delivery + discuss in chat
1. Select category **Catering**
2. Select **Pickup & Delivery**
3. Leave delivery fee blank

**Expected:** Post saved with `delivery_option = 'both'`, `delivery_fee = null`

### 5d. Non-Catering category — delivery fields hidden
1. Select any category that is not **Catering** (e.g., Cleaning)

**Expected:** Delivery Option and Delivery Fee fields do NOT appear

### 5e. Edit an existing Catering post
1. Go to My Listings and edit a Catering post
2. Change the delivery option

**Expected:** Changes are saved correctly

---

## 6. Category Sort Order

**Feature:** Service category dropdowns are always sorted alphabetically A–Z

### 6a. PostServiceScreen category dropdown
1. Open "Post Service"
2. Check the category dropdown

**Expected:** Categories listed A–Z (e.g., Beauty Services, Catering, Cleaning, ... Thrifting at GoZipMarket, Tutoring)

### 6b. SearchResultsScreen / HomeScreen category picker
1. Open the home/search screen
2. Check the category list

**Expected:** Same A–Z order, with "Thrifting at GoZipMarket" in the correct alphabetical position

---

## 7. Thrifting at GoZipMarket Category

**Feature:** New category for second-hand and thrifted items

### 7a. Category visible in dropdowns
1. Open any category dropdown

**Expected:** "Thrifting at GoZipMarket" appears in the list (alphabetical position: after "Tech Support", before "Tutoring")

### 7b. Post a Thrifting item
1. Select **Thrifting at GoZipMarket**
2. Enter price (e.g., `0` for free, or `5.00`)
3. Set quantity
4. Submit

**Expected:** Post created successfully; price `0` is allowed (free item)

### 7c. Add Thrifting item to cart
1. Search in **Thrifting at GoZipMarket**
2. View a result with a price

**Expected:** "Add to Cart" button appears (category has `accepts_payment = true`)
Cart shows correct price

### 7d. Checkout for a Thrifting item
1. Add a Thrifting item to cart
2. Proceed through Checkout

**Expected:** Normal payment flow (Zelle/other method) as configured by the provider

---

## 8. Order Flow (Regression)

These scenarios should still work correctly after all changes.

### 8a. Full order flow
1. Search for a product in a payment-enabled category
2. Add to cart
3. Go to Cart → Checkout (enter shipping address)
4. Payment screen — confirm order

**Expected:**
- Order saved in DB (`orders` table)
- Cart and checkout state cleared
- Navigate to Order Report screen
- Order Report shows: Order ID, Date, Business name, itemized table, total, deliver-to address, payment instructions, disclaimer

### 8b. Cancel order from Payment screen
1. Tap "Cancel Order"

**Expected:** Returns to Cart screen; order not saved

---

## SQL Reference

Verify columns exist after running migration:
```sql
-- Check service_posts columns
SELECT column_name FROM information_schema.columns
WHERE table_name = 'service_posts'
AND column_name IN ('delivery_option', 'delivery_fee');

-- Check Thrifting category
SELECT * FROM service_categories WHERE category_name = 'Thrifting at GoZipMarket';

-- Check users columns
SELECT column_name FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('last_seen_at', 'last_email_sent_at');

-- Check business_owners payment_method column
SELECT column_name FROM information_schema.columns
WHERE table_name = 'business_owners'
AND column_name = 'payment_method';
```
