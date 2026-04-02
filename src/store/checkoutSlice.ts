/**
 * checkoutSlice.ts
 * v1.0 — March 2026
 *
 * PURPOSE:
 * Redux slice that owns all state specific to the checkout flow.
 * Separated from cartSlice so each slice has a single clear responsibility:
 *   - cartSlice  → what the user wants to buy (items)
 *   - checkoutSlice → how and where it gets delivered / paid
 *
 * WHY REDUX (NOT LOCAL COMPONENT STATE):
 * On Expo Web, navigating between screens (e.g. CheckoutScreen →
 * ServiceAddressScreen → back) remounts components and resets local state.
 * Storing these values in Redux ensures they survive the round-trip.
 *
 * STATE:
 *   zelleId         — the buyer's Zelle email or phone number, entered in
 *                     CheckoutScreen. Shared with PaymentScreen for display.
 *   shippingAddress — the delivery address entered in ServiceAddressScreen.
 *                     Displayed in CheckoutScreen and PaymentScreen.
 *
 * REDUCERS:
 *   setZelleId         — update buyer's Zelle ID as they type
 *   setShippingAddress — save confirmed delivery address from ServiceAddressScreen
 *   clearCheckout      — reset all checkout state (called after order is placed,
 *                        alongside clearCart from cartSlice)
 *
 * USED BY:
 *   CheckoutScreen      — reads/writes zelleId; reads shippingAddress
 *   ServiceAddressScreen — writes shippingAddress
 *   PaymentScreen       — reads zelleId and shippingAddress for confirmation screen
 */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ShippingAddress {
  fullName?: string;
  phone?: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  notes?: string;
}

interface CheckoutState {
  zelleId: string;
  shippingAddress: ShippingAddress | null;
}

const initialState: CheckoutState = {
  zelleId: '',
  shippingAddress: null,
};

const checkoutSlice = createSlice({
  name: 'checkout',
  initialState,
  reducers: {
    setZelleId: (state, action: PayloadAction<string>) => {
      state.zelleId = action.payload;
    },
    setShippingAddress: (state, action: PayloadAction<ShippingAddress>) => {
      state.shippingAddress = action.payload;
    },
    clearCheckout: (state) => {
      state.zelleId = '';
      state.shippingAddress = null;
    },
  },
});

export const { setZelleId, setShippingAddress, clearCheckout } = checkoutSlice.actions;
export default checkoutSlice.reducer;
