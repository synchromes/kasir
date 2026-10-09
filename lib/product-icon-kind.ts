type ProductIconKind = "food" | "drink" | "other";

const foodWords = new Set([
  "makanan", "food", "kuliner", "snack", "jajanan", "mie", "mi", "roti",
  "kue", "nasi", "ayam", "bakso", "soto", "sate", "burger", "pizza",
  "donat", "martabak", "goreng", "indomie", "beras", "tepung", "terigu", "sembako",
]);
const drinkWords = new Set([
  "minuman", "drink", "beverage", "kopi", "teh", "jus", "juice", "susu",
  "soda", "aqua", "air", "es", "boba", "matcha", "sirup", "pucuk",
]);

function kinds(text: string) {
  const words = text.toLowerCase().split(/[^\p{L}\p{N}]+/u);
  return { food: words.some(word => foodWords.has(word)), drink: words.some(word => drinkWords.has(word)) };
}

export function productIconKind(category: string, name: string): ProductIconKind {
  // Nama lebih spesifik daripada kategori gabungan seperti "Makanan & Minuman".
  const named = kinds(name);
  if (named.food) return "food";
  if (named.drink) return "drink";
  const grouped = kinds(category);
  if (grouped.food && !grouped.drink) return "food";
  if (grouped.drink && !grouped.food) return "drink";
  return "other";
}
