/**
 * cartSlice.ts
 * v2.0 — March 2026
 *
 * PURPOSE:
 * Redux slice that owns the shopping cart — what items the user intends to buy.
 * Each CartItem represents a single photo/listing from a service post.
 * Uniqueness key per item: (post_id, photo_index).
 *
 * RESPONSIBILITY (single):
 * Manage cart items only. Checkout-specific state (Zelle ID, shipping address)
 * lives in checkoutSlice.ts so each slice has one clear job.
 *
 * STATE:
 *   items — array of CartItem objects currently in the cart
 *
 * REDUCERS:
 *   addToCart        — add a new item; silently ignored if already in cart
 *   removeFromCart   — remove item by (post_id, photo_index)
 *   toggleSaveForLater — move item between active cart and saved-for-later
 *   setAgreedAmount  — record the negotiated price in cents for an item
 *                      (used during checkout to confirm the final price)
 *   clearCart        — empty all items after a successful order
 *
 * USED BY:
 *   RecentPostsSection  — dispatches addToCart
 *   SearchResultsList   — dispatches addToCart
 *   CartScreen          — reads items, dispatches removeFromCart
 *   CheckoutScreen      — reads items to build order summary
 *   PaymentScreen       — reads items for confirmation display
 *
 * SEE ALSO:
 *   checkoutSlice.ts — zelleId and shippingAddress (delivery + payment method)
 *   store.ts         — combines cart + checkout reducers
 */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface CartItem {
  post_id: number;
  photo_index: number;           // which photo in the post (0-based)
  photo_url: string;             // URL of this specific photo
  title: string;                 // post title (for display)
  photo_price?: number;          // price in dollars set by provider
  service_category: string;
  provider_user_id: number;
  provider_name?: string;
  provider_stripe_account_id?: string;
  agreed_amount?: number;        // in cents, set during checkout
  saved_for_later: boolean;
  quantity: number;              // how many the buyer wants (min 1)
  in_stock?: number;             // copied from post to enforce quantity cap
  price?: number;                // flat price per item in dollars (fallback when photo_price unset)
  shipping_charge_cents?: number; // per-post shipping charge set by provider
  post_payment_method?: string;   // payment method set on this post
  post_payment_info?: string;     // payment handle set on this post
}

interface CartState {
  items: CartItem[];
}

const initialState: CartState = {
  items: [],
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (state, action: PayloadAction<CartItem>) => {
      const exists = state.items.find(
        i => i.post_id === action.payload.post_id && i.photo_index === action.payload.photo_index
      );
      if (!exists) {
        state.items.push({ ...action.payload, quantity: action.payload.quantity ?? 1, saved_for_later: false });
      } else {
        // Refresh stock and price in case provider updated them since item was added
        exists.in_stock = action.payload.in_stock;
        exists.price = action.payload.price;
        exists.photo_price = action.payload.photo_price;
      }
    },
    setQuantity: (state, action: PayloadAction<{ post_id: number; photo_index: number; quantity: number }>) => {
      const item = state.items.find(
        i => i.post_id === action.payload.post_id && i.photo_index === action.payload.photo_index
      );
      if (item) {
        const max = item.in_stock != null && item.in_stock > 0 ? item.in_stock : 999;
        item.quantity = Math.max(1, Math.min(action.payload.quantity, max));
      }
    },
    removeFromCart: (state, action: PayloadAction<{ post_id: number; photo_index: number }>) => {
      state.items = state.items.filter(
        i => !(i.post_id === action.payload.post_id && i.photo_index === action.payload.photo_index)
      );
    },
    toggleSaveForLater: (state, action: PayloadAction<{ post_id: number; photo_index: number }>) => {
      const item = state.items.find(
        i => i.post_id === action.payload.post_id && i.photo_index === action.payload.photo_index
      );
      if (item) item.saved_for_later = !item.saved_for_later;
    },
    setAgreedAmount: (state, action: PayloadAction<{ post_id: number; photo_index: number; amount: number }>) => {
      const item = state.items.find(
        i => i.post_id === action.payload.post_id && i.photo_index === action.payload.photo_index
      );
      if (item) item.agreed_amount = action.payload.amount;
    },
    clearCart: (state) => {
      state.items = [];
    },
    removeItems: (state, action: PayloadAction<Array<{ post_id: number; photo_index: number }>>) => {
      const keys = new Set(action.payload.map(k => `${k.post_id}_${k.photo_index}`));
      state.items = state.items.filter(i => !keys.has(`${i.post_id}_${i.photo_index}`));
    },
  },
});

export const { addToCart, removeFromCart, toggleSaveForLater, setAgreedAmount, setQuantity, clearCart, removeItems } = cartSlice.actions;
export default cartSlice.reducer;
