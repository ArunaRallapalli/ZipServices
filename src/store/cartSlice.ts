/**
 * cartSlice.ts
 * Redux slice for managing service cart state.
 * Each CartItem represents a single photo/item from a service post.
 * Uniqueness key: (post_id, photo_index)
 */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface CartItem {
  post_id: number;
  photo_index: number;           // which photo in the post (0-based)
  photo_url: string;             // URL of this specific photo
  title: string;                 // post title (for display)
  photo_description?: string;    // per-photo name/description from provider
  photo_price?: number;          // price in dollars set by provider
  service_category: string;
  price_range?: string;
  provider_user_id: number;
  provider_name?: string;
  provider_stripe_account_id?: string;
  agreed_amount?: number;        // in cents, set during checkout
  saved_for_later: boolean;
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
        state.items.push({ ...action.payload, saved_for_later: false });
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
  },
});

export const { addToCart, removeFromCart, toggleSaveForLater, setAgreedAmount, clearCart } = cartSlice.actions;
export default cartSlice.reducer;
