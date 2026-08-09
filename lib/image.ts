// Baca file gambar lalu perkecil via canvas (JPEG) supaya data URL-nya ringan
// disimpan di DB dan cepat dirender (dipakai POS, form produk, dll).

// Foto produk ditampilkan maksimal ~112px (preview form), 96px (grid POS), dan
// 40px (tabel). 400px long-edge sudah 2x lipat kebutuhan retina 2x — hasil
// JPEG ±30KB (base64 ±40KB) per produk.
export const PRODUCT_IMAGE_MAX_DIM = 400;
export const PRODUCT_IMAGE_QUALITY = 0.75;

// Bukti transfer/QRIS ditampilkan maksimal 288px tinggi (detail transaksi) dan
// merupakan arsip audit — perlu resolusi cukup untuk dibaca saat di-zoom.
// 800px long-edge dengan kualitas 0.75 tetap tajam, hasil ±110KB (base64).
export const PROOF_IMAGE_MAX_DIM = 800;
export const PROOF_IMAGE_QUALITY = 0.75;

export function resizeImageToDataUrl(
  file: File,
  maxDim = PRODUCT_IMAGE_MAX_DIM,
  quality = PRODUCT_IMAGE_QUALITY
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gagal membaca file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Gambar tidak dapat dibaca"));
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas tidak tersedia"));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
