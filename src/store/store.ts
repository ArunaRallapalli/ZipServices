/**
 * store.ts
 *
 * OVERVIEW:
 * Central Redux store for the ZipServices app.
 * Combines all slice reducers into a single store instance.
 *
 * SLICES:
 * - cart (cartSlice.ts): manages service cart state — items, save-for-later,
 *   agreed amounts, and cart clearing after payment
 *
 * USAGE:
 * - Wrap <App> with <Provider store={store}> in App.tsx (already done)
 * - Access state via useSelector((state: RootState) => state.cart)
 * - Dispatch actions via useDispatch()
 *
 * Added: feature/stripe-connect-payments
 */
import { configureStore } from '@reduxjs/toolkit';
import cartReducer from './cartSlice'

export const store = configureStore({
  reducer: {
    cart: cartReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;