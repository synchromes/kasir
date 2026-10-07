"use client";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 py-16 text-center" role="alert">
      <p className="font-display text-base font-bold">Gagal memuat halaman</p>
      <p className="max-w-sm text-sm text-on-surface-variant">
        {error?.message || "Terjadi kesalahan saat mengambil data. Periksa koneksi lalu coba lagi."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="inline-flex h-11 cursor-pointer items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Coba lagi
      </button>
    </div>
  );
}
