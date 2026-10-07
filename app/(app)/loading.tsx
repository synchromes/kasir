export default function AppLoading() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 py-16 text-center" role="status" aria-live="polite">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-outline-variant border-t-primary" aria-hidden />
      <p className="text-sm font-medium text-on-surface-variant">Memuat data toko...</p>
    </div>
  );
}
