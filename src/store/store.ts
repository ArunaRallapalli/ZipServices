/**
 * store.ts
 * v3.0 — March 2026
 *
 * Redux store with redux-persist so cart and checkout state survive
 * page refreshes (web localStorage) and app restarts (AsyncStorage on mobile).
 *
 * SLICES:
 *   cart     (cartSlice.ts)     — shopping cart items
 *   checkout (checkoutSlice.ts) — Zelle ID and shipping address
 */
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import cartReducer from './cartSlice';
import checkoutReducer from './checkoutSlice';

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['cart', 'checkout'],
};

const rootReducer = combineReducers({
  cart: cartReducer,
  checkout: checkoutReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;
