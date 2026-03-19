# Payment Integration — File Change Log
## Branch: feature/stripe-connect-payments
## Date: March 19, 2026

---

## NEWLY CREATED FILES

| # | File | Purpose |
|---|------|---------|
| 1 | `src/screens/cart/CartScreen.tsx` | Cart view — displays added services, add/remove items, save for later, proceed to checkout button |
| 2 | `src/screens/cart/CheckoutScreen.tsx` | Order summary — agreed amounts per service, 10% platform fee calculation, place order flow |
| 3 | `src/screens/cart/PaymentScreen.tsx` | Payment step — calls Stripe backend to create payment intent, placeholder for @stripe/stripe-react-native card UI |
| 4 | `src/screens/cart/ServiceAddressScreen.tsx` | Address form — full name, street, city, state, ZIP, notes, "Deliver to This Address" button |
| 5 | `src/store/store.ts` | Redux store — configures and exports the global store with cart reducer |
| 6 | `src/store/cartSlice.ts` | Redux slice — actions: addToCart, removeFromCart, toggleSaveForLater, setAgreedAmount, clearCart |
| 7 | `backend/routes/stripe.ts` | Stripe Connect backend — provider onboarding, payment intent creation, onboarding status check, webhook handler |

---

## UPDATED FILES

| # | File | Changes Made |
|---|------|-------------|
| 1 | `App.tsx` | Wrapped entire app in Redux `<Provider store={store}>` so all screens can access cart state |
| 2 | `src/navigation/MainStackNavigator.tsx` | Imported and registered CartScreen, CheckoutScreen, ServiceAddressScreen, PaymentScreen in the navigation stack; added their types to RootStackParamList |
| 3 | `src/components/RecentPostsSection.tsx` | Added "Add to Cart" button to mini cards and detail modal; auth guard redirects guests to BusinessOwnerHomeScreen; added isAuthenticated and onAddToCart props |
| 4 | `src/components/SearchResultsList.tsx` | Added "Add to Cart" button to search result mini cards and full detail modal; added auth guard for guests; added onAddToCart and isAuthenticated props to SearchResultsListProps and MiniServiceCard |
| 5 | `src/screens/SearchResultsScreen.tsx` | Added handleAddToCart function dispatching to Redux cartSlice; passes onAddToCart and isAuthenticated to both RecentPostsSection and SearchResultsList |
| 6 | `src/Utils/searchUtils.ts` | Extended ServicePost interface with photos, average_rating, review_count fields; added fetchRecentPosts() function |
| 7 | `src/screens/PostServiceScreen.tsx` | Added per-photo caption/description field (PhotoWithDesc type); description sent to backend on both web (Base64/JSON) and mobile (FormData) |

---

## FULL CART FLOW (Screen by Screen)

```
Add to Cart button (RecentPostsSection or SearchResultsList)
  └── Guest? → BusinessOwnerHomeScreen (sign in)
  └── Authenticated? → CartScreen

CartScreen
  ├── View active cart items
  ├── Remove item
  ├── Save for Later / Move to Cart
  └── Proceed to Checkout → CheckoutScreen

CheckoutScreen
  ├── Add Service Address → ServiceAddressScreen
  │     └── Fill form → "Deliver to This Address" → back to CheckoutScreen
  ├── Change Address → ServiceAddressScreen
  ├── Enter agreed amount per service
  ├── View platform fee (10%) and total
  └── Place Your Order → PaymentScreen (requires address + all amounts set)

PaymentScreen
  ├── Displays order total
  ├── Displays service address
  ├── Payment method (Stripe — card UI requires @stripe/stripe-react-native)
  └── Confirm & Pay → calls POST /api/stripe/payment/create
        └── Success → clearCart → navigate to TabWrapperScreen
```

---

## BACKEND STRIPE ROUTES

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/stripe/connect/onboard` | Creates Stripe Express account for a provider and returns onboarding URL |
| POST | `/api/stripe/payment/create` | Creates a PaymentIntent with platform fee and transfer to provider |
| GET | `/api/stripe/connect/status/:accountId` | Checks if a provider has completed Stripe onboarding |
| POST | `/api/stripe/webhook` | Handles Stripe webhook events (payment_intent.succeeded, account.updated) |

---

## NOTES FOR TESTING

1. **Provider Stripe accounts** — Payments will show "Provider Not Ready" until providers
   complete Stripe Connect onboarding and the backend returns their stripe_account_id
   in service post API responses.

2. **Card UI** — The card input in PaymentScreen is a placeholder. To enable real card input:
   ```
   npx expo install @stripe/stripe-react-native
   ```
   Then add to app.json plugins:
   ```json
   ["@stripe/stripe-react-native"]
   ```

3. **Environment variables required on backend:**
   - STRIPE_SECRET_KEY
   - STRIPE_WEBHOOK_SECRET
   - FRONTEND_URL

4. **Database table** — The webhook handler references a `payments` table
   (`UPDATE payments SET status ...`). Ensure this table exists before
   enabling webhooks in production.
