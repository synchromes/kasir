import { ArrowLeftRight, Banknote, QrCode } from "lucide-react";

export type Product = {
  id: number;
  name: string;
  sku: string;
  barcode: string | null;
  image: string | null;
  price: number;
  stock: number;
  unit: string;
  category: string;
};
export type Customer = {
  id: number;
  name: string;
  points: number;
  isMember: boolean;
};
export type Setting = {
  taxRate: number;
  pointsPer10k: number;
  storeName: string;
  address: string;
  phone: string;
  receiptTitle: string;
  receiptFooter: string;
  qrisStatic: string;
};
export type CartLine = { productId: number; name: string; price: number; qty: number; stock: number; unit: string };

// Metode pembayaran: identitas warna/ikon tetap, dipakai di panel POS,
// halaman Rangkuman, dan halaman Konfirmasi QRIS.
export const methods = [
  { id: "CASH", label: "Tunai", icon: Banknote },
  { id: "QRIS", label: "QRIS", icon: QrCode },
  { id: "TRANSFER", label: "Transfer", icon: ArrowLeftRight },
] as const;
