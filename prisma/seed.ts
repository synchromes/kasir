import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const parsed = new URL(process.env.DATABASE_URL || "mysql://root@localhost:3306/kasir");
const prisma = new PrismaClient({
  adapter: new PrismaMariaDb({
    host: parsed.hostname,
    port: Number(parsed.port || 3306),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password || ""),
    database: parsed.pathname.slice(1),
  }),
});

async function main() {
  const adminPassword = await bcrypt.hash("admin123", 10);
  const kasirPassword = await bcrypt.hash("kasir123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@kasir.com" },
    update: {},
    create: {
      name: "Admin Utama",
      email: "admin@kasir.com",
      password: adminPassword,
      role: Role.ADMIN,
    },
  });
  await prisma.user.upsert({
    where: { email: "kasir@kasir.com" },
    update: {},
    create: {
      name: "Kasir Satu",
      email: "kasir@kasir.com",
      password: kasirPassword,
      role: Role.KASIR,
    },
  });

  const [minuman, makanan, sembako] = await Promise.all([
    prisma.category.upsert({
      where: { ownerId_name: { ownerId: admin.id, name: "Minuman" } },
      update: {},
      create: { name: "Minuman", ownerId: admin.id },
    }),
    prisma.category.upsert({
      where: { ownerId_name: { ownerId: admin.id, name: "Makanan" } },
      update: {},
      create: { name: "Makanan", ownerId: admin.id },
    }),
    prisma.category.upsert({
      where: { ownerId_name: { ownerId: admin.id, name: "Sembako" } },
      update: {},
      create: { name: "Sembako", ownerId: admin.id },
    }),
  ]);

  await prisma.unit.upsert({
    where: { ownerId_name: { ownerId: admin.id, name: "Pcs" } },
    update: {},
    create: { name: "Pcs", short: "pcs", ownerId: admin.id },
  });
  const [btl, pack] = await Promise.all([
    prisma.unit.upsert({
      where: { ownerId_name: { ownerId: admin.id, name: "Botol" } },
      update: {},
      create: { name: "Botol", short: "btl", ownerId: admin.id },
    }),
    prisma.unit.upsert({
      where: { ownerId_name: { ownerId: admin.id, name: "Pack" } },
      update: {},
      create: { name: "Pack", short: "pck", ownerId: admin.id },
    }),
  ]);

  const productSeeds = [
    { sku: "SKU-001", barcode: "8991001000001", name: "Beras Premium 5kg", category: sembako.id, unit: pack.id, cost: 58000, sell: 65000, stock: 50, minStock: 10 },
    { sku: "SKU-002", barcode: "8991001000002", name: "Minyak Goreng 1L", category: sembako.id, unit: btl.id, cost: 16000, sell: 18500, stock: 80, minStock: 15 },
    { sku: "SKU-003", barcode: "8991001000003", name: "Gula Pasir 1kg", category: sembako.id, unit: pack.id, cost: 14000, sell: 16500, stock: 60, minStock: 12 },
    { sku: "SKU-004", barcode: "8991001000004", name: "Teh Botol Sosro", category: minuman.id, unit: btl.id, cost: 3500, sell: 5000, stock: 120, minStock: 20 },
    { sku: "SKU-005", barcode: "8991001000005", name: "Coca Cola 390ml", category: minuman.id, unit: btl.id, cost: 3800, sell: 5500, stock: 90, minStock: 18 },
    { sku: "SKU-006", barcode: "8991001000006", name: "Indomie Goreng", category: makanan.id, unit: pack.id, cost: 2800, sell: 3500, stock: 10, minStock: 20 },
    { sku: "SKU-007", barcode: "8991001000007", name: "Roti Tawar", category: makanan.id, unit: pack.id, cost: 12000, sell: 16000, stock: 25, minStock: 5 },
    { sku: "SKU-008", barcode: "8991001000008", name: "Tepung Terigu 1kg", category: sembako.id, unit: pack.id, cost: 9000, sell: 11500, stock: 4, minStock: 8 },
    { sku: "SKU-009", barcode: "8991001000009", name: "Teh Botol 500ml", category: minuman.id, unit: btl.id, cost: 4000, sell: 5500, stock: 100, minStock: 15 },
    { sku: "SKU-010", barcode: "8991001000010", name: "Beras Wangi 5kg", category: sembako.id, unit: pack.id, cost: 70000, sell: 79500, stock: 30, minStock: 6 },
  ];

  for (const p of productSeeds) {
    await prisma.product.upsert({
      where: { ownerId_sku: { ownerId: admin.id, sku: p.sku } },
      update: {},
      create: {
        sku: p.sku,
        barcode: p.barcode,
        name: p.name,
        categoryId: p.category,
        unitId: p.unit,
        costPrice: p.cost,
        sellPrice: p.sell,
        stock: p.stock,
        minStock: p.minStock,
        ownerId: admin.id,
      },
    });
  }

  await prisma.customer.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, name: "Pelanggan Umum", isMember: true, points: 0, phone: "0812-0000-1111", ownerId: admin.id },
  });
  await prisma.customer.upsert({
    where: { id: 2 },
    update: {},
    create: { id: 2, name: "Budi Santoso", isMember: true, points: 150, phone: "0813-2222-3333", ownerId: admin.id },
  });

  await prisma.setting.upsert({
    where: { ownerId: admin.id },
    update: {},
    create: {
      ownerId: admin.id,
      storeName: "Toko Kasir Sejahtera",
      address: "Jl. Raya Contoh No. 12, Jakarta",
      phone: "021-555-0123",
      receiptTitle: "STRUK PENJUALAN",
      receiptFooter: "Terima kasih telah berbelanja di toko kami",
      taxRate: 0,
      pointsPer10k: 1,
    },
  });

  const products = await prisma.product.findMany({ where: { ownerId: admin.id } });

  const existingSales = await prisma.sale.count({ where: { ownerId: admin.id } });
  if (existingSales === 0) {
    for (let i = 1; i <= 30; i++) {
      const day = new Date();
      day.setDate(day.getDate() - (30 - i));
      day.setHours(9 + (i % 9), (i * 7) % 60, 0, 0);
      const lineItems = 2 + (i % 4);
      const picked = products.slice((i * 2) % Math.max(1, products.length - lineItems), (i * 2) % Math.max(1, products.length - lineItems) + lineItems);
      let subtotal = 0;
      const items = picked.map((p) => {
        const qty = 1 + (i % 3);
        subtotal += p.sellPrice * qty;
        return { productId: p.id, qty, price: p.sellPrice, cost: p.costPrice };
      });
      const total = subtotal;
      await prisma.sale.create({
        data: {
          invoiceNo: "INV-" + day.getFullYear() + String(day.getMonth() + 1).padStart(2, "0") + String(day.getDate()).padStart(2, "0") + "-" + String(1000 + i),
          ownerId: admin.id,
          cashierId: admin.id,
          customerId: 1,
          subtotal,
          discount: 0,
          tax: 0,
          total,
          paid: Math.ceil(total / 1000) * 1000,
          change: Math.ceil(total / 1000) * 1000 - total,
          paymentMethod: "CASH",
          pointsEarned: Math.floor(total / 10000),
          createdAt: day,
          items: { create: items },
        },
      });
    }
  }

  // Akun lain yang belum punya pengaturan (mis. kasir demo): buatkan default
  // agar struk & pajak langsung terisi saat akun dipakai.
  const allUsers = await prisma.user.findMany({ select: { id: true, name: true } });
  for (const u of allUsers) {
    if (u.id === admin.id) continue;
    await prisma.setting.upsert({
      where: { ownerId: u.id },
      update: {},
      create: {
        ownerId: u.id,
        storeName: `Toko ${u.name}`,
        address: "",
        phone: "",
        receiptTitle: "STRUK PENJUALAN",
        receiptFooter: "Terima kasih atas kunjungan Anda",
        taxRate: 0,
        pointsPer10k: 1,
      },
    });
  }

  const seedIncome = await prisma.sale.count();
  const seedProducts = await prisma.product.count();
  console.log(
    `Seed selesai. Users: admin@kasir.com / admin123 & kasir@kasir.com / kasir123. ${seedProducts} produk, ${seedIncome} transaksi demo.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
