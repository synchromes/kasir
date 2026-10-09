// State transaksi dipisahkan per akun; key tanpa owner hanya milik versi lama.
export const CART_KEY = "kasir-cart";
export const PENDING_KEY = "kasir-pending-payment";

export const cartStorageKey = (ownerId: number) => `${CART_KEY}:${ownerId}`;
export const pendingStorageKey = (ownerId: number) => `${PENDING_KEY}:${ownerId}`;

export function clearLegacyPosStorage() {
  sessionStorage.removeItem(CART_KEY);
  sessionStorage.removeItem(PENDING_KEY);
}

export function clearPosStorage() {
  try {
    for (const key of Object.keys(sessionStorage)) {
      if (key === CART_KEY || key === PENDING_KEY || key.startsWith(`${CART_KEY}:`) || key.startsWith(`${PENDING_KEY}:`)) sessionStorage.removeItem(key);
    }
  } catch {
    // Logout tetap berjalan jika browser memblokir penyimpanan.
  }
}
