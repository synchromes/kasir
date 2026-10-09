import { useSyncExternalStore } from "react";

// Store bersama untuk ringkasan POS dan navigasi bawah yang hidup terpisah.
export type CartBarState = { ownerId: number | null; count: number; total: number };

const emptyState: CartBarState = { ownerId: null, count: 0, total: 0 };
let state: CartBarState = emptyState;
const listeners = new Set<() => void>();

export function setCartBar(next: CartBarState) {
  if (state.ownerId !== next.ownerId || state.count !== next.count || state.total !== next.total) {
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
  return useSyncExternalStore(subscribe, getSnapshot, () => emptyState);
}
