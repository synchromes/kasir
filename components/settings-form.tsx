"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import jsQR from "jsqr";
import { saveSettings } from "@/lib/actions";
import { validateQRIS } from "@/lib/qris";
import { Button, Input, Textarea, Label, Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/components/confirm-dialog";
import { GuideDialog } from "@/components/guide-dialog";
import { Bell, PackageSearch, QrCode as QrCodeIcon, ReceiptText, ScanLine, ShoppingBag, Trash2, UploadCloud, X } from "lucide-react";
import { resizeImageToDataUrl } from "@/lib/image";

export function SettingsForm({ hasSettings, initial, oldNotifyCounts }: {
  hasSettings: boolean;
  initial: { storeName: string; address: string; phone: string; receiptTitle: string; receiptFooter: string; taxRate: number; pointsPer10k: number; qrisStatic: string; notifyStock: boolean; notifySale: boolean; notifyPurchase: boolean };
  // Jumlah notifikasi lama per tipe (dari server). Ditampilkan di samping
  // toggle yang sedang OFF, hanya saat itu notif lama benar-benar terhapus
  // ketika pengaturan disimpan.
  oldNotifyCounts: { stock: number; sale: number; purchase: number };
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(initial);

  // Validasi QRIS statis real-time (derived, tanpa setState di effect).
  const trimmedQris = form.qrisStatic.trim();
  const qrisValidation = trimmedQris ? validateQRIS(trimmedQris) : null;
  const qrisOk = !!trimmedQris && !!qrisValidation?.valid;
  const [qrisPreview, setQrisPreview] = useState<string | null>(null);
  // Tick untuk memaksa preview QR digenerate ulang saat string diisi lewat
  // scan/upload (string bisa sama persis, jadi deps effect tak berubah).
  const [qrisPreviewTick, setQrisPreviewTick] = useState(0);

  // Scan QRIS langsung dari kamera (getUserMedia + jsqr), kasir cukup
  // mengarahkan kamera ke QR statis, tanpa perlu upload/mengetik string.
  const [qrisImage, setQrisImage] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scanCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef(false);

  // Opsi kedua: upload gambar QRIS → decode otomatis via jsqr.
  const [qrisDecoding, setQrisDecoding] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const qrisFileRef = useRef<HTMLInputElement>(null);
  // Menandai bahwa konfigurasi QRIS baru saja dihapus, dipakai untuk mencegah
  // hasil decode upload yang masih berjalan mengisi ulang string setelah Hapus.
  const clearedRef = useRef(false);

  // Notifikasi singkat setelah QRIS dihapus (mengingatkan untuk Simpan).
  const [clearNotice, setClearNotice] = useState<string | null>(null);
  const clearNoticeTimerRef = useRef<number>(0);

  function showClearNotice(msg: string) {
    setClearNotice(msg);
    if (clearNoticeTimerRef.current) window.clearTimeout(clearNoticeTimerRef.current);
    clearNoticeTimerRef.current = window.setTimeout(() => setClearNotice(null), 6000);
  }

  const stopScan = useCallback(() => {
    scanningRef.current = false;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setScanning(false);
  }, []);

  async function startScan() {
    setScanError(null);
    setUploadError(null);
    setClearNotice(null);
    clearedRef.current = false; // scan baru = niat baru mengisi QRIS
    setQrisImage(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setScanError("Kamera tidak didukung di browser ini. Tempel string QRIS statis di kolom bawah.");
      return;
    }
    let stream: MediaStream | null = null;
    try {
      // Kamera belakang (environment) untuk HP; fallback ke kamera apa pun
      // untuk webcam PC.
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
    } catch {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      } catch {
        setScanError("Kamera tidak dapat diakses. Izinkan akses kamera di browser, atau tempel string QRIS statis di kolom bawah.");
        return;
      }
    }
    // Stream disimpan dulu; efek di bawah yang memasangnya ke <video> setelah
    // element ter-render (ref masih null di titik ini).
    streamRef.current = stream;
    scanningRef.current = true;
    setScanning(true);
  }

  // Upload gambar QRIS → decode otomatis ke string (kasir cukup foto QR-nya).
  // Decode QR dari data URL gambar via jsqr (client-side, tanpa upload server).
  function decodeQrFromDataUrl(dataUrl: string): Promise<string | null> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Canvas tidak tersedia"));
            return;
          }
          ctx.drawImage(img, 0, 0);
          const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(data.data, data.width, data.height, { inversionAttempts: "attemptBoth" });
          resolve(code ? code.data : null);
        } catch (e) {
          reject(e instanceof Error ? e : new Error("Gagal membaca QR"));
        }
      };
      img.onerror = () => reject(new Error("Gambar tidak dapat dibaca"));
      img.src = dataUrl;
    });
  }

  // Hapus konfigurasi QRIS (mis. toko berganti penyedia pembayaran): kosongkan
  // string statis & thumbnail. Berlaku setelah klik Simpan Pengaturan.
  async function clearQrisConfig() {
    const ok = await confirm({
      title: "Hapus konfigurasi QRIS?",
      message: "Metode pembayaran QRIS di kasir akan dinonaktifkan setelah pengaturan disimpan.",
    });
    if (!ok) return;
    clearedRef.current = true;
    setForm((f) => ({ ...f, qrisStatic: "" }));
    setQrisImage(null);
    setQrisPreviewTick((t) => t + 1);
    setScanError(null);
    setUploadError(null);
    showClearNotice("QRIS dihapus, jangan lupa Simpan Pengaturan.");
  }

  async function handleQrisFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadError(null);
    setScanError(null);
    if (!file.type.startsWith("image/")) {
      setUploadError("File harus berupa gambar (JPG/PNG/WebP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Ukuran gambar maksimal 5 MB.");
      return;
    }
    clearedRef.current = false; // pilih file = niat baru mengisi QRIS
    setClearNotice(null);
    setQrisDecoding(true);
    try {
      // Perkecil dulu (maks ~1600px) agar jsqr tidak menggantung di foto 12MP;
      // QR biasanya mendominasi frame jadi tetap terbaca setelah resize.
      const dataUrl = await resizeImageToDataUrl(file, 1600, 0.9);
      const decoded = await decodeQrFromDataUrl(dataUrl);
      if (!decoded) throw new Error("QR tidak terbaca dari gambar, pastikan gambar jelas & tidak miring.");
      // Scan kamera baru dimulai, atau konfigurasi dihapus saat decode berjalan?
      // Kalau ya, biarkan kondisi terbaru yang menang, jangan timpa.
      if (scanningRef.current || clearedRef.current) return;
      setQrisImage(dataUrl);
      setForm((f) => ({ ...f, qrisStatic: decoded }));
      setQrisPreviewTick((t) => t + 1);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Gagal membaca QR.");
    } finally {
      setQrisDecoding(false);
    }
  }

  // Setelah state scanning=true ter-render (element <video> sudah ada di DOM),
  // pasang stream kamera & mulai loop deteksi per-frame (gambar frame ke
  // canvas, lalu jsQR).
  useEffect(() => {
    if (!scanning) return;
    const video = videoRef.current;
    const canvas = scanCanvasRef.current;
    const stream = streamRef.current;
    if (!video || !canvas || !stream) return;
    video.srcObject = stream;
    // Autoplay: muted + playsInline agar selalu jalan di HP.
    video.play().catch(() => {});

    let raf = 0;
    let frameIndex = 0;
    // Anti-hang: jika kamera tidak pernah mengirim frame yang bisa dibaca,
    // hentikan scan otomatis agar tidak "Mencari QR..." selamanya.
    const timeout = window.setTimeout(() => {
      if (!scanningRef.current) return;
      stopScan();
      setScanError("QR tidak terdeteksi. Pastikan QR terlihat jelas di tengah layar & pencahayaan cukup.");
    }, 30000);

    const loop = () => {
      if (!scanningRef.current) return;
      frameIndex++;
      // Throttle: jsQR hanya tiap frame ke-3 agar hemat CPU di perangkat lemah.
      if (video.readyState === HTMLMediaElement.HAVE_ENOUGH_DATA && video.videoWidth > 0 && frameIndex % 3 === 0) {
        if (canvas.width !== video.videoWidth) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(data.data, data.width, data.height, { inversionAttempts: "attemptBoth" });
          if (code && code.data) {
            // Simpan frame saat QR terbaca sebagai thumbnail bukti pemindaian.
            const thumb = canvas.toDataURL("image/jpeg", 0.7);
            stopScan();
            setQrisImage(thumb);
            setForm((f) => ({ ...f, qrisStatic: code.data }));
            setQrisPreviewTick((t) => t + 1);
            setScanError(null);
            return;
          }
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timeout);
    };
  }, [scanning, stopScan]);

  // Matikan kamera saat komponen ditutup / halaman pindah.
  useEffect(() => {
    return () => {
      scanningRef.current = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (clearNoticeTimerRef.current) window.clearTimeout(clearNoticeTimerRef.current);
    };
  }, []);

  // Effect hanya untuk generate gambar QR (async), preview lama disembunyikan
  // lewat kondisi render saat string berubah/tdk valid.
  useEffect(() => {
    let alive = true;
    if (!qrisOk) return;
    QRCode.toDataURL(trimmedQris, { width: 220, margin: 2, errorCorrectionLevel: "M" })
      .then((u) => alive && setQrisPreview(u))
      .catch(() => alive && setQrisPreview(null));
    return () => {
      alive = false;
    };
  }, [qrisOk, trimmedQris, qrisPreviewTick]);

  // Ganti state toggle notifikasi. Saat MEMATIKAN tipe yang masih punya
  // notifikasi lama, minta konfirmasi dulu, notif lama akan ikut terhapus
  // dari panel ketika pengaturan disimpan (lihat saveSettings).
  async function toggleNotify(
    key: "notifyStock" | "notifySale" | "notifyPurchase",
    typeKey: "stock" | "sale" | "purchase",
    enabled: boolean,
    typeLabel: string
  ) {
    if (enabled) {
      setForm((f) => ({ ...f, [key]: true }));
      return;
    }
    const oldCount = oldNotifyCounts[typeKey];
    if (oldCount > 0) {
      const ok = await confirm({
        title: `Matikan notifikasi ${typeLabel}?`,
        message: `Masih ada ${oldCount} notifikasi ${typeLabel} lama di panel. Notifikasi lama tersebut akan ikut terhapus saat pengaturan disimpan, hanya notifikasi baru yang berhenti.`,
        confirmLabel: "Matikan & Hapus",
        danger: true,
      });
      if (!ok) return;
    }
    setForm((f) => ({ ...f, [key]: false }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await saveSettings(form);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setClearNotice(null);
      router.refresh();
    } catch {
      setError("Gagal menyimpan pengaturan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Pengaturan</h1>
          <p className="text-sm text-muted-foreground">Konfigurasi toko & struk</p>
        </div>
        <GuideDialog variant="chip" initialCategory="settings" />
      </div>

      {!hasSettings && (
        <p className="text-sm leading-relaxed text-on-surface-variant">
          <span className="font-semibold text-foreground">Catatan:</span> Toko ini belum punya pengaturan tersimpan, struk &amp; pajak masih memakai nilai bawaan. Isi nama toko, alamat, dan pajak, lalu klik Simpan Pengaturan agar transaksi memakai data yang benar.
        </p>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="h-full">
          <CardHeader><CardTitle>Info Toko</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="storeName">Nama Toko</Label>
              <Input id="storeName" value={form.storeName} onChange={(e) => setForm({ ...form, storeName: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="address">Alamat</Label>
              <Input id="address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Telepon</Label>
              <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader><CardTitle>Struk</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="receiptTitle">Judul Struk</Label>
              <Input id="receiptTitle" value={form.receiptTitle} onChange={(e) => setForm({ ...form, receiptTitle: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="receiptFooter">Footer Struk</Label>
              <Input id="receiptFooter" value={form.receiptFooter} onChange={(e) => setForm({ ...form, receiptFooter: e.target.value })} />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCodeIcon className="h-5 w-5 text-primary" /> QRIS Pembayaran
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {clearNotice && (
              <div className="flex items-start justify-between gap-2 text-sm">
                <p className="flex-1 text-on-surface-variant">
                  <span className="font-semibold text-foreground">Catatan:</span> {clearNotice}
                </p>
                <button
                  type="button"
                  onClick={() => setClearNotice(null)}
                  aria-label="Tutup notifikasi"
                  className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-high"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Scan / Upload QRIS</Label>
              <input ref={qrisFileRef} type="file" accept="image/*" className="hidden" onChange={handleQrisFile} />
              {scanning ? (
                <div className="overflow-hidden rounded-xl border border-outline-variant bg-black">
                  <div className="relative">
                    <video ref={videoRef} playsInline muted className="h-56 w-full object-cover" />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2">
                      <p className="text-xs font-medium text-white">Arahkan kamera ke QRIS statis toko Anda...</p>
                    </div>
                  </div>
                  <canvas ref={scanCanvasRef} className="hidden" />
                  <div className="flex items-center justify-between bg-surface-container-low px-3 py-2">
                    <span className="flex items-center gap-2 text-xs text-on-surface-variant">
                      <ScanLine className="h-4 w-4 animate-pulse text-primary" /> Mencari QR...
                    </span>
                    <button
                      type="button"
                      onClick={stopScan}
                      className="flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-on-surface-variant transition-colors hover:bg-surface-container-low"
                    >
                      <X className="h-3.5 w-3.5" /> Batal
                    </button>
                  </div>
                </div>
              ) : qrisImage ? (
                <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
                  <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                    {qrisOk && qrisPreview ? (
                      <>
                        {/* QRIS statis hasil scan/upload, ditampilkan BESAR agar
                            kasir bisa memverifikasi sebelum disimpan. */}
                        {/* eslint-disable-next-line @next/next/no-img-element -- data URL QR, bukan aset */}
                        <img
                          src={qrisPreview}
                          alt="Pratinjau besar QRIS hasil scan/upload"
                          className="h-40 w-40 shrink-0 rounded-lg border border-outline-variant bg-white p-1.5 shadow-sm sm:h-48 sm:w-48"
                        />
                      </>
                    ) : (
                      // Fallback: gambar sumber (frame kamera / foto upload) saat
                      // QR belum siap digenerate atau string tidak valid.
                      /* eslint-disable-next-line @next/next/no-img-element -- data URL base64 */
                      <img
                        src={qrisImage}
                        alt="Hasil scan/upload QRIS"
                        className="h-20 w-20 shrink-0 rounded-lg border border-outline-variant object-contain"
                      />
                    )}
                    <div className="flex-1 text-xs text-on-surface-variant">
                      {qrisOk ? (
                        <>
                          <p className="font-semibold text-on-surface">QR berhasil dibaca ✓</p>
                          <p className="mt-0.5">
                            Verifikasi QRIS di samping sama dengan milik toko Anda, lalu klik Simpan Pengaturan. String QRIS statis otomatis terisi di bawah.
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="font-semibold text-on-surface">QR terbaca, tapi string tidak valid</p>
                          <p className="mt-0.5">Periksa pesan error di bawah atau scan/upload ulang dengan gambar yang lebih jelas.</p>
                        </>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-row gap-1 sm:flex-col">
                      <button
                        type="button"
                        onClick={startScan}
                        className="flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary-fixed-dim/40"
                      >
                        <ScanLine className="h-3.5 w-3.5" /> Scan Ulang
                      </button>
                      <button
                        type="button"
                        onClick={() => qrisFileRef.current?.click()}
                        className="flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary-fixed-dim/40"
                      >
                        <UploadCloud className="h-3.5 w-3.5" /> Upload Ulang
                      </button>
                      <button
                        type="button"
                        onClick={clearQrisConfig}
                        className="flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-destructive transition-colors hover:bg-destructive-container"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Hapus
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={startScan}
                    disabled={qrisDecoding}
                    className="flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border-2 border-dashed border-outline-variant px-4 py-6 text-xs text-on-surface-variant transition-colors hover:border-primary/60 hover:bg-surface-container-low disabled:opacity-60"
                  >
                    <ScanLine className="h-6 w-6" />
                    Scan QRIS dengan kamera
                  </button>
                  <button
                    type="button"
                    onClick={() => qrisFileRef.current?.click()}
                    disabled={qrisDecoding}
                    className="flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border-2 border-dashed border-outline-variant px-4 py-6 text-xs text-on-surface-variant transition-colors hover:border-primary/60 hover:bg-surface-container-low disabled:opacity-60"
                  >
                    <UploadCloud className="h-6 w-6" />
                    Upload gambar QRIS
                  </button>
                </div>
              )}
              {qrisDecoding && <p className="text-xs text-on-surface-variant">Membaca QR dari gambar...</p>}
              {scanError && <p className="text-sm text-destructive">{scanError}</p>}
              {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="qrisStatic">String QRIS Statis</Label>
                {trimmedQris && (
                  <button
                    type="button"
                    onClick={clearQrisConfig}
                    className="flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-destructive transition-colors hover:bg-destructive-container"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Hapus
                  </button>
                )}
              </div>
              <Textarea
                id="qrisStatic"
                rows={4}
                value={form.qrisStatic}
                onChange={(e) => {
                  setForm({ ...form, qrisStatic: e.target.value });
                  setQrisPreviewTick((t) => t + 1);
                  setClearNotice(null);
                }}
                placeholder="Tempel string QRIS statis dari penyedia pembayaran, atau scan/upload QRIS di atas..."
                className="font-mono text-xs"
              />
              {!trimmedQris && (
                <p className="text-xs text-on-surface-variant">
                  QRIS statis ini dikonversi otomatis menjadi <strong>QRIS dinamis</strong> berisi nominal saat kasir memilih metode QRIS, pelanggan cukup pindai, tanpa memasukkan nominal manual.
                </p>
              )}
              {qrisValidation && !qrisValidation.valid && (
                <p className="text-sm text-destructive">QRIS statis tidak valid: {qrisValidation.errors[0]}</p>
              )}
            </div>
            {/* Pratinjau untuk string yang ditempel manual (tanpa scan/upload) -
                saat panel hasil scan/upload tampil, QR besar sudah ada di sana. */}
            {qrisOk && qrisPreview && !qrisImage && (
              <div className="flex items-center gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
                {/* eslint-disable-next-line @next/next/no-img-element -- data URL QR, bukan aset */}
                <img src={qrisPreview} alt="Pratinjau QRIS statis" className="h-28 w-28 rounded-lg border border-outline-variant bg-white p-1" />
                <div className="text-xs text-on-surface-variant">
                  <p className="font-semibold text-on-surface">QRIS statis valid ✓</p>
                  <p className="mt-1">
                    Saat kasir memilih <strong>QRIS</strong>, aplikasi menyuntikkan nominal transaksi ke payload ini (Point of Initiation Method berubah ke dinamis) lalu menghitung ulang CRC16, QR yang muncul di POS langsung bisa dipindai pelanggan.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" /> Notifikasi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-on-surface-variant">
              Pilih jenis notifikasi yang muncul di lonceng &amp; halaman Notifikasi. Perubahan berlaku setelah klik Simpan Pengaturan.
            </p>
            <div className="space-y-2">
              <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 transition-colors hover:border-primary/40">
                <span className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tertiary-soft text-tertiary">
                    <PackageSearch className="h-4.5 w-4.5" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">Stok menipis / habis</span>
                    <span className="block text-xs text-on-surface-variant">Peringatan saat stok produk di bawah minimum</span>
                    {form.notifyStock === false && oldNotifyCounts.stock > 0 && (
                      <span className="mt-1 block text-xs text-on-surface-variant">
                        {oldNotifyCounts.stock} notif lama akan terhapus
                      </span>
                    )}
                  </span>
                </span>
                <span className={cn("relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors", form.notifyStock ? "bg-primary" : "bg-outline-variant")}>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={form.notifyStock}
                    onChange={(e) => toggleNotify("notifyStock", "stock", e.target.checked, "stok menipis")}
                  />
                  <span
                    className={cn("inline-block h-5 w-5 rounded-full bg-white shadow transition-transform", form.notifyStock ? "translate-x-[1.375rem]" : "translate-x-0.5")}
                  />
                </span>
              </label>

              <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 transition-colors hover:border-primary/40">
                <span className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                    <ReceiptText className="h-4.5 w-4.5" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">Transaksi baru</span>
                    <span className="block text-xs text-on-surface-variant">Setiap penjualan selesai di kasir</span>
                    {form.notifySale === false && oldNotifyCounts.sale > 0 && (
                      <span className="mt-1 block text-xs text-on-surface-variant">
                        {oldNotifyCounts.sale} notif lama akan terhapus
                      </span>
                    )}
                  </span>
                </span>
                <span className={cn("relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors", form.notifySale ? "bg-primary" : "bg-outline-variant")}>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={form.notifySale}
                    onChange={(e) => toggleNotify("notifySale", "sale", e.target.checked, "transaksi")}
                  />
                  <span
                    className={cn("inline-block h-5 w-5 rounded-full bg-white shadow transition-transform", form.notifySale ? "translate-x-[1.375rem]" : "translate-x-0.5")}
                  />
                </span>
              </label>

              <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 transition-colors hover:border-primary/40">
                <span className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container">
                    <ShoppingBag className="h-4.5 w-4.5" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">Pembelian baru</span>
                    <span className="block text-xs text-on-surface-variant">Saat stok masuk lewat pembelian</span>
                    {form.notifyPurchase === false && oldNotifyCounts.purchase > 0 && (
                      <span className="mt-1 block text-xs text-on-surface-variant">
                        {oldNotifyCounts.purchase} notif lama akan terhapus
                      </span>
                    )}
                  </span>
                </span>
                <span className={cn("relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors", form.notifyPurchase ? "bg-primary" : "bg-outline-variant")}>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={form.notifyPurchase}
                    onChange={(e) => toggleNotify("notifyPurchase", "purchase", e.target.checked, "pembelian")}
                  />
                  <span
                    className={cn("inline-block h-5 w-5 rounded-full bg-white shadow transition-transform", form.notifyPurchase ? "translate-x-[1.375rem]" : "translate-x-0.5")}
                  />
                </span>
              </label>
            </div>
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader><CardTitle>Pajak & Poin</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="taxRate">Pajak (%)</Label>
              <Input id="taxRate" type="number" value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pointsPer10k">Poin per Rp 10.000</Label>
              <Input id="pointsPer10k" type="number" value={form.pointsPer10k} onChange={(e) => setForm({ ...form, pointsPer10k: Number(e.target.value) })} />
            </div>
          </CardContent>
        </Card>

        {/* Aksi simpan di luar kartu, baris sendiri (full width) agar tidak
            membingungkan: tombol bukan bagian dari kartu "Pajak & Poin". */}
        <div className="flex flex-col gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between lg:col-span-2">
          <div>
            <p className="text-sm font-semibold text-on-surface">Simpan pengaturan toko</p>
            <p className="mt-0.5 text-xs text-on-surface-variant">Perubahan berlaku setelah klik Simpan Pengaturan.</p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button variant="accent" type="submit" disabled={loading}>{loading ? "Menyimpan..." : "Simpan Pengaturan"}</Button>
          </div>
        </div>
      </form>
    </div>
  );
}
