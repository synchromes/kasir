"use client";

import * as React from "react";
import { ArrowRight, Coins, Minus, Package, Plus, QrCode, Trash2, UploadCloud, UserRound, X } from "lucide-react";
import { formatNumber, formatRupiah, cn } from "@/lib/utils";
import { Button, Input, Label, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui";
import { methods, type Customer, type Setting } from "@/components/pos/order-types";
import type { PosOrder } from "@/components/pos/use-pos-order";

// Daftar item keranjang dengan stepper jumlah. Dipakai di kolom kanan POS
// (desktop) dan di halaman Rangkuman Pesanan (mobile).
export function CartItems({ order }: { order: PosOrder }) {
  const { cart, changeQty, removeLine } = order;
  return (
    <div className="min-h-[120px] w-full shrink-0 overflow-x-clip rounded-xl border border-transparent bg-transparent p-1 shadow-none sm:p-2 lg:border-outline-variant lg:bg-card lg:p-3 lg:shadow-sm">
      {cart.length === 0 && (
        <p className="py-10 text-center text-sm text-on-surface-variant">Keranjang kosong</p>
      )}
      <ul className="space-y-2">
        {cart.map((l) => (
          <li key={l.productId} className="flex min-w-0 items-center gap-2.5 rounded-lg border border-transparent bg-surface p-2 lg:border-outline-variant">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-container-high text-on-surface-variant">
              <Package className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold leading-snug">{l.name}</div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className="text-[13px] font-bold">{formatRupiah(l.price * l.qty)}</span>
              <span className="flex items-center gap-0.5 rounded-full bg-white p-0.5 shadow-md sm:p-1">
                {l.qty <= 1 ? (
                  <button
                    onClick={() => removeLine(l.productId)}
                    aria-label={`Hapus ${l.name}`}
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-destructive-container text-on-destructive-container transition-transform active:scale-95 sm:h-10 sm:w-10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => changeQty(l.productId, -1)}
                    aria-label={`Kurangi ${l.name}`}
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-low sm:h-10 sm:w-10"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                )}
                <span aria-live="polite" className="w-5 text-center text-sm font-bold">{l.qty}</span>
                <button
                  onClick={() => changeQty(l.productId, 1)}
                  aria-label={`Tambah ${l.name}`}
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105 active:scale-95 sm:h-10 sm:w-10"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Panel pesanan: pelanggan + keranjang + total + pembayaran. Satu komponen
// yang dipakai di kolom kanan POS (desktop) dan halaman Rangkuman (mobile)
// agar perilakunya identik.
export function OrderPanel({ order, customers, setting }: { order: PosOrder; customers: Customer[]; setting: Setting }) {
  const {
    cart,
    discountType,
    setDiscountType,
    discountValue,
    setDiscountValue,
    customerId,
    changeCustomer,
    usePoints,
    setUsePoints,
    paymentMethod,
    setPaymentMethod,
    paid,
    setPaid,
    error,
    loading,
    proofImage,
    proofError,
    proofRef,
    handleProofChange,
    clearProof,
    selectedCustomer,
    subtotal,
    discountPct,
    effDiscount,
    tax,
    maxPoints,
    pointsToUse,
    total,
    paidNum,
    change,
    pointsEarned,
    showQris,
    qrisConfigError,
    handleCheckout,
    handleContinue,
  } = order;

  return (
    <div className="flex min-h-0 min-w-0 flex-col gap-4">
      {/* Order header */}
      <div className="shrink-0 rounded-xl border border-transparent bg-transparent p-2 shadow-none lg:border-outline-variant lg:bg-card lg:p-4 lg:shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-base font-bold">Pesanan Saat Ini</h2>
          <span className="text-xs text-on-surface-variant">{cart.length} item</span>
        </div>
        <div className="relative">
          <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
          <Select value={customerId} onValueChange={changeCustomer}>
            <SelectTrigger className="h-11 rounded-md border-outline-variant bg-surface pl-9 text-sm">
              <SelectValue placeholder="Tambah Pelanggan (Opsional)" />
            </SelectTrigger>
            <SelectContent>
              {customers.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                  {c.isMember ? ` · ${c.points} poin` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedCustomer?.isMember && (
          <div className="mt-3 space-y-1 rounded-lg bg-muted/60 px-3 py-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-on-surface-variant">
                <Coins className="h-4 w-4 text-accent" /> Poin: {selectedCustomer.points}
              </span>
              {maxPoints > 0 && (
                <button
                  onClick={() => setUsePoints(!usePoints)}
                  className={cn(
                    "min-h-11 min-w-11 cursor-pointer px-2 text-xs font-semibold",
                    usePoints ? "text-accent" : "text-on-surface-variant hover:text-on-surface"
                  )}
                >
                  {usePoints ? `Pakai poin (${pointsToUse})` : "Pakai poin"}
                </button>
              )}
            </div>
            {pointsEarned > 0 && <p className="text-[11px] text-on-surface-variant">Akan dapat +{pointsEarned} poin</p>}
          </div>
        )}
      </div>

      <CartItems order={order} />

      {/* Totals & payment: alur normal setelah daftar, tidak sticky agar
          tidak pernah menindih item */}
      <div className="shrink-0 rounded-xl border border-transparent bg-transparent p-2 shadow-none lg:border-outline-variant lg:bg-card lg:p-4 lg:shadow-sm">
        <div className="mb-4 space-y-1.5 text-sm">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="discount" className="text-xs font-semibold text-on-surface-variant">
                Diskon
              </Label>
              <div className="flex overflow-hidden rounded-md border border-outline-variant">
                <button
                  type="button"
                  onClick={() => setDiscountType("FIXED")}
                  aria-pressed={discountType === "FIXED"}
                  className={cn(
                    "min-h-[44px] cursor-pointer px-3 py-1 text-xs font-semibold transition-colors",
                    discountType === "FIXED"
                      ? "bg-primary-fixed-dim text-on-primary-fixed"
                      : "bg-surface text-on-surface-variant hover:bg-surface-container-low"
                  )}
                >
                  Rp
                </button>
                <button
                  type="button"
                  onClick={() => setDiscountType("PERCENT")}
                  aria-pressed={discountType === "PERCENT"}
                  className={cn(
                    "min-h-[44px] cursor-pointer border-l border-outline-variant px-3 py-1 text-xs font-semibold transition-colors",
                    discountType === "PERCENT"
                      ? "bg-primary-fixed-dim text-on-primary-fixed"
                      : "bg-surface text-on-surface-variant hover:bg-surface-container-low"
                  )}
                >
                  %
                </button>
              </div>
            </div>
            <div className="relative">
              <Input
                id="discount"
                type="number"
                min="0"
                max={discountType === "PERCENT" ? 100 : undefined}
                value={discountValue || ""}
                onChange={(e) =>
                  setDiscountValue(
                    discountType === "PERCENT"
                      ? Math.min(100, Math.max(0, Number(e.target.value) || 0))
                      : Math.max(0, Number(e.target.value) || 0)
                  )
                }
                placeholder="0"
                className="h-11 w-32 rounded-md border-outline-variant bg-surface pr-8 text-right text-sm"
              />
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-on-surface-variant">
                {discountType === "PERCENT" ? "%" : "Rp"}
              </span>
            </div>
          </div>
          <div className="flex justify-between text-on-surface-variant">
            <span>Subtotal</span>
            <span>{formatRupiah(subtotal)}</span>
          </div>
          {effDiscount > 0 && (
            <div className="flex justify-between text-on-surface-variant">
              <span>Diskon{discountType === "PERCENT" ? ` (${discountPct}%)` : ""}</span>
              <span>-{formatRupiah(effDiscount)}</span>
            </div>
          )}
          {setting.taxRate > 0 && (
            <div className="flex justify-between text-on-surface-variant">
              <span>Pajak ({setting.taxRate}%)</span>
              <span>{formatRupiah(tax)}</span>
            </div>
          )}
          {pointsToUse > 0 && (
            <div className="flex justify-between text-on-surface-variant">
              <span>Poin</span>
              <span>-{formatRupiah(pointsToUse)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-dashed border-outline-variant pt-2 font-display text-base font-bold">
            <span>Total</span>
            <span>{formatRupiah(total)}</span>
          </div>
        </div>

        {/* Payment methods */}
        <div className="mb-3 grid grid-cols-3 gap-2">
          {methods.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                setPaymentMethod(m.id);
                // Bukti hanya relevan untuk Transfer, bersihkan saat pindah metode lain
                if (m.id !== "TRANSFER") order.setProofImage(null);
              }}
              aria-pressed={paymentMethod === m.id}
              className={cn(
                "flex min-h-[44px] cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border py-2.5 transition-colors",
                paymentMethod === m.id
                  ? "border-2 border-primary bg-primary-fixed-dim/20 font-semibold text-primary"
                  : "border-outline-variant text-on-surface-variant hover:bg-surface-container-low"
              )}
            >
              <m.icon className="h-5 w-5" />
              <span className="text-[11px] font-semibold">{m.label}</span>
            </button>
          ))}
        </div>

        {paymentMethod === "CASH" && (
          <div className="mb-3 space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Label htmlFor="paid" className="sr-only">Dibayar</Label>
                <Input
                  id="paid"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={paid ? formatNumber(paidNum) : ""}
                  onChange={(e) => setPaid(e.target.value.replace(/\D/g, ""))}
                  placeholder="Masukkan nominal tunai, contoh 50.000"
                  aria-describedby={paid ? "paid-preview" : undefined}
                  className="h-11 rounded-md border-outline-variant bg-surface"
                />
              </div>
              <Button variant="outline" size="sm" onClick={() => setPaid(String(Math.ceil(total / 1000) * 1000))} className="px-4">
                Pas
              </Button>
            </div>
            {paid && (
              <p id="paid-preview" aria-live="polite" className="text-xs text-on-surface-variant">
                Nominal dibayar: <span className="font-semibold text-on-surface">{formatRupiah(paidNum)}</span>
              </p>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">Kembalian</span>
              <span className={cn("font-semibold", change < 0 ? "text-destructive" : "text-accent")}>
                {formatRupiah(Math.max(change, 0))}
              </span>
            </div>
          </div>
        )}

        {paymentMethod === "QRIS" && qrisConfigError && (
          <div className="mb-3 rounded-lg border border-outline-variant bg-surface p-3">
            <p className="flex items-start gap-2 text-xs text-destructive">
              <QrCode className="mt-0.5 h-4 w-4 shrink-0" /> {qrisConfigError}
            </p>
          </div>
        )}

        {paymentMethod === "QRIS" && !qrisConfigError && showQris && (
          <div className="mb-3 flex items-center gap-3 rounded-lg border border-outline-variant bg-surface p-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-fixed-dim/40 text-primary">
              <QrCode className="h-5 w-5" />
            </span>
            <div className="text-xs text-on-surface-variant">
              <p className="font-semibold text-on-surface">QRIS Dinamis</p>
              <p>QR berisi nominal akan ditampilkan besar di halaman Konfirmasi Pembayaran.</p>
            </div>
          </div>
        )}

        {paymentMethod === "TRANSFER" && (
          <div className="mb-3 rounded-lg border border-outline-variant bg-surface p-3">
            <div className="mb-1.5 flex items-center justify-between">
              <Label className="text-xs font-semibold text-on-surface-variant">Foto Bukti Pembayaran</Label>
              <span className="text-[10px] font-medium text-on-surface-variant">Opsional</span>
            </div>
            <input ref={proofRef} type="file" accept="image/*" className="hidden" onChange={handleProofChange} />
            {proofImage ? (
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- data URL base64 */}
                <img src={proofImage} alt="Bukti pembayaran" className="h-16 w-16 rounded-lg border border-outline-variant object-cover" />
                <p className="flex-1 text-xs text-on-surface-variant">Bukti pembayaran terlampir</p>
                <button
                  type="button"
                  onClick={clearProof}
                  className="flex min-h-[44px] cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-destructive transition-colors hover:bg-destructive-container"
                >
                  <X className="h-3.5 w-3.5" /> Hapus
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => proofRef.current?.click()}
                className="flex w-full cursor-pointer flex-col items-center gap-1 rounded-lg border border-dashed border-outline-variant py-4 text-xs text-on-surface-variant transition-colors hover:border-primary/60 hover:bg-surface-container-low"
              >
                <UploadCloud className="h-5 w-5" /> Foto bukti transfer, klik untuk pilih
              </button>
            )}
            {proofError && <p className="mt-1 text-xs text-destructive">{proofError}</p>}
          </div>
        )}

        {error && <p className="mb-2 text-sm text-destructive">{error}</p>}

        <Button
          variant="accent"
          className="h-12 w-full rounded-lg text-base font-bold shadow-sm"
          disabled={
            cart.length === 0 ||
            loading ||
            (paymentMethod === "CASH" && paidNum < total) ||
            (paymentMethod === "QRIS" && !!qrisConfigError)
          }
          onClick={paymentMethod === "QRIS" ? handleContinue : handleCheckout}
        >
          {loading ? "Memproses..." : paymentMethod === "QRIS" ? "Lanjutkan Pembayaran" : `Bayar ${formatRupiah(total)}`}
          {!loading && <ArrowRight className="h-5 w-5" />}
        </Button>
      </div>
    </div>
  );
}
