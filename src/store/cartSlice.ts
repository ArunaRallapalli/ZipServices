/**
 * cartSlice.ts
 * Redux slice for managing service cart state.
 * Handles add, remove, save for later, and clear cart actions.
 */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface CartItem {
  post_id: number;
  title: string;
  service_category: string;
  price_range?: string;
  provider_user_id: number;
  provider_name?: string;
  provider_stripe_account_id?: string;
  photos?: string[];
  agreed_amount?: number; // in cents, set during checkout
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
      // Prevent duplicates
      const exists = state.items.find(i => i.post_id === action.payload.post_id);
      if (!exists) {
        state.items.push({ ...action.payload, saved_for_later: false });
      }
    },
    removeFromCart: (state, action: PayloadAction<number>) => {
      state.items = state.items.filter(i => i.post_id !== action.payload);
    },
    toggleSaveForLater: (state, action: PayloadAction<number>) => {
      const item = state.items.find(i => i.post_id === action.payload);
      if (item) item.saved_for_later = !item.saved_for_later;
    },
    setAgreedAmount: (state, action: PayloadAction<{ post_id: number; amount: number }>) => {
      const item = state.items.find(i => i.post_id === action.payload.post_id);
      if (item) item.agreed_amount = action.payload.amount;
    },
    clearCart: (state) => {
      state.items = [];
    },
  },
});

export const { addToCart, removeFromCart, toggleSaveForLater, setAgreedAmount, clearCart } = cartSlice.actions;
export default cartSlice.reducer;