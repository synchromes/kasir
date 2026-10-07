import { useSyncExternalStore } from "react";

// Ringkasan keranjang untuk bar bawah mobile ala GrabFood. Store eksternal
// (bukan context) agar tab bar di layout dan halaman POS/Rangkuman yang
// hidup terpisah tetap sinkron tanpa wiring provider.
export type CartBarState = { count: number; total: number };

let state: CartBarState = { count: 0, total: 0 };
const listeners = new Set<() => void>();

export function setCartBar(next: CartBarState) {
  if (state.count !== next.count || state.total !== next.total) {
    state = next;
    listeners.forEach((l) => l());
  }
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function getSnapshot() {
  return state;
}

export function useCartBar() {
  return useSyncExternalStore(subscribe, getSnapshot);
}
