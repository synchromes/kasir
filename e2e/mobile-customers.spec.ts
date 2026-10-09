import "dotenv/config";
import { test, expect, type Page } from "@playwright/test";
import { hash } from "bcryptjs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "../lib/db";

const evidenceDir = path.resolve("anti-slop/fix-007-evidence");
const ownerIds: number[] = [];
const longName = "C PelangganDenganNamaPanjangTanpaSpasiUntukMemeriksaPembungkusanNamaPadaDaftarMobileYangSempit";
let fixtureEmail: string;
let emptyEmail: string;
let ownerId: number;
let linkedCustomerId: number;
let saleIds: number[];

async function login(page: Page, email = "admin@kasir.com", password = "admin123") {
  await page.context().clearCookies();
  await page.addInitScript(ids => {
    for (const id of [1, 2, ...ids]) localStorage.setItem(`kasir-tour-v1-${id}`, "1");
  }, ownerIds);
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await page.waitForURL("/", { waitUntil: "domcontentloaded" });
  await page.goto("/customers");
  await expect(page.getByRole("heading", { name: "Pelanggan", exact: true })).toBeVisible();
}

async function axe(page: Page, context: string, name: string) {
  await page.addScriptTag({ path: "node_modules/axe-core/axe.min.js" });
  const result = await page.evaluate(async selector => {
    const engine = (window as unknown as { axe: { run: (context: string, options: object) => Promise<{ violations: unknown[] }> } }).axe;
    return engine.run(selector, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } });
  }, context);
  await writeFile(path.join(evidenceDir, `${name}-axe.json`), JSON.stringify(result, null, 2));
  expect(result.violations).toEqual([]);
}

async function chooseAction(page: Page, name: string, action: "Edit" | "Hapus") {
  await page.getByRole("button", { name: `Aksi untuk ${name}`, exact: true }).click();
  await page.getByRole("menuitem", { name: `${action} ${name}`, exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCSS("opacity", "1");
}

test.beforeAll(async ({}, info) => {
  await mkdir(evidenceDir, { recursive: true });
  const suffix = `${info.project.name}-${Date.now()}`;
  fixtureEmail = `customers-${suffix}@example.test`;
  emptyEmail = `customers-empty-${suffix}@example.test`;
  const password = await hash("CustomersTest123", 10);
  const user = await prisma.user.create({ data: { name: "Uji Pelanggan", email: fixtureEmail, password, role: "ADMIN" } });
  ownerId = user.id;
  ownerIds.push(ownerId);
  const emptyUser = await prisma.user.create({ data: { name: "Uji Toko Kosong", email: emptyEmail, password, role: "KASIR" } });
  ownerIds.push(emptyUser.id);
  const linked = await prisma.customer.create({ data: { ownerId, name: "A Pelanggan Uji", phone: "0813-1234-5555", isMember: true, points: 150 } });
  linkedCustomerId = linked.id;
  await prisma.customer.create({ data: { ownerId, name: "B Pelanggan Umum" } });
  await prisma.customer.create({ data: { ownerId, name: longName, phone: "081234567890123456789012345678901234567890", isMember: true, points: 2_000_000_000 } });
  await prisma.customer.createMany({ data: Array.from({ length: 10 }, (_, index) => ({ ownerId, name: `D Pelanggan ${String(index + 1).padStart(2, "0")}`, phone: `085700000${String(index).padStart(3, "0")}` })) });
  const sales = await Promise.all([1, 2].map(index => prisma.sale.create({ data: { ownerId, customerId: linked.id, invoiceNo: `INV-CUSTOMERS-TEST-${index}`, subtotal: 1000, total: 1000, paid: 1000 } })));
  saleIds = sales.map(sale => sale.id);
});

test.afterAll(async () => {
  for (const id of ownerIds) {
    await prisma.sale.deleteMany({ where: { ownerId: id } });
    await prisma.user.delete({ where: { id } });
  }
  await prisma.$disconnect();
});

test("Pelanggan: daftar mobile, tabel desktop, menu aksi dan fokus keyboard", async ({ page }, info) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await login(page);
  const metrics = [];
  for (const width of [320, 360, 393, 430, 640, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 851 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    if (width < 1024) {
      const list = page.getByRole("list", { name: "Daftar pelanggan", exact: true });
      await expect(list).toBeVisible();
      await expect(page.locator("main table")).not.toBeVisible();
      await expect(list).toContainText("Budi Santoso");
      await expect(list).toContainText("0813-2222-3333");
      await expect(list).toContainText("150 poin");
      await expect(list).toContainText("Member");
    } else {
      await expect(page.locator("main table")).toBeVisible();
      await expect(page.getByRole("list", { name: "Daftar pelanggan", exact: true })).not.toBeVisible();
      expect(await page.locator("main th").allTextContents()).toEqual(["Nama", "Telepon", "Status", "Poin", "Aksi"]);
    }
    for (const control of await page.locator("main button, main input, main select").filter({ visible: true }).all()) {
      const box = (await control.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
    metrics.push({ width, documentWidth: await page.evaluate(() => document.documentElement.scrollWidth) });
    await page.screenshot({ path: path.join(evidenceDir, `${info.project.name}-${width}.png`) });
  }
  await page.setViewportSize({ width: 393, height: 851 });
  await axe(page, "main", `${info.project.name}-default`);
  const trigger = page.getByRole("button", { name: "Aksi untuk Budi Santoso", exact: true });
  await page.keyboard.press("Tab");
  await trigger.focus();
  expect(await trigger.evaluate(el => getComputedStyle(el).boxShadow)).not.toBe("none");
  await trigger.press("Enter");
  await expect(page.getByRole("menu")).toHaveCSS("opacity", "1");
  for (const item of await page.getByRole("menuitem").all()) expect((await item.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await axe(page, "[role=menu]", `${info.project.name}-menu`);
  await page.screenshot({ path: path.join(evidenceDir, `${info.project.name}-menu.png`) });
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await trigger.press("Enter");
  await page.getByRole("menuitem", { name: "Edit Budi Santoso", exact: true }).press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toHaveCSS("opacity", "1");
  await expect(page.getByLabel("Nama *", { exact: true })).toBeFocused();
  await expect(page.getByLabel("Nama *", { exact: true })).toHaveValue("Budi Santoso");
  const member = dialog.getByRole("checkbox");
  expect(await member.evaluate(el => el.closest("label")!.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  await axe(page, "[role=dialog]", `${info.project.name}-form`);
  await page.screenshot({ path: path.join(evidenceDir, `${info.project.name}-form.png`) });
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await chooseAction(page, "Budi Santoso", "Hapus");
  await page.getByRole("dialog").getByRole("button", { name: "Batal", exact: true }).click();
  await expect(trigger).toBeFocused();
  await page.locator("main").getByRole("button", { name: "Bantuan, panduan Pelanggan", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  expect(errors).toEqual([]);
  await writeFile(path.join(evidenceDir, `${info.project.name}-layout.json`), JSON.stringify({ metrics, errors }, null, 2));
});

test("Pelanggan: pencarian nama/telepon, kosong, teks panjang dan pagination", async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 851 });
  await login(page, fixtureEmail, "CustomersTest123");
  const input = page.getByRole("textbox", { name: "Cari pelanggan", exact: true });
  const list = page.getByRole("list", { name: "Daftar pelanggan", exact: true });
  await expect(list).not.toContainText("Budi Santoso");
  for (const query of [" a pelanggan uji ", "0813-1234-5555", " 081312345555 "]) {
    await input.fill(query);
    await expect(list.getByRole("listitem")).toHaveCount(1);
    await expect(list).toContainText("A Pelanggan Uji");
  }
  await input.fill("tidakadapelangganxyz");
  await expect(list).toContainText("Tidak ada pelanggan yang cocok");
  await list.getByRole("button", { name: "Tampilkan semua pelanggan", exact: true }).click();
  await expect(input).toHaveValue("");
  await expect(input).toBeFocused();
  await expect(list).toContainText("Telepon belum diisi");
  await expect(list).toContainText("2.000.000.000 poin");
  expect(await list.getByRole("heading", { name: longName, exact: true }).evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  await axe(page, "main", `${info.project.name}-long-data`);
  await list.getByRole("heading", { name: longName, exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(evidenceDir, `${info.project.name}-long-data.png`) });
  await page.getByRole("combobox", { name: "Baris per halaman", exact: true }).selectOption("10");
  await expect(list.getByRole("listitem")).toHaveCount(10);
  await page.getByRole("button", { name: "Halaman berikutnya", exact: true }).click();
  await expect(list.getByRole("listitem")).toHaveCount(3);
  await input.fill("A Pelanggan");
  await expect(list).toContainText("A Pelanggan Uji");
  await expect(page.getByRole("button", { name: "Halaman berikutnya", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Bersihkan pencarian", exact: true }).click();
  await expect(input).toBeFocused();
  await input.fill("D Pelanggan");
  await input.press("Escape");
  await expect(input).toHaveValue("");
});

test("Pelanggan: tambah, edit member, batal hapus dan transaksi tetap tersimpan", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 393, height: 851 });
  await login(page, fixtureEmail, "CustomersTest123");
  const input = page.getByRole("textbox", { name: "Cari pelanggan", exact: true });
  const list = page.getByRole("list", { name: "Daftar pelanggan", exact: true });
  await page.getByRole("button", { name: "+ Tambah pelanggan", exact: true }).click();
  await page.getByLabel("Nama *", { exact: true }).fill("Z Pelanggan Baru");
  await page.getByLabel("Telepon", { exact: true }).fill("08123450000");
  await page.getByLabel("Email", { exact: true }).fill("pelanggan@example.test");
  await page.getByLabel("Alamat", { exact: true }).fill("Alamat fixture pelanggan");
  await page.getByRole("checkbox").check();
  await page.getByRole("dialog").getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await input.fill("Z Pelanggan");
  await expect(list).toContainText("Z Pelanggan Baru");
  await expect(list).toContainText("Member");
  await chooseAction(page, "Z Pelanggan Baru", "Edit");
  await page.getByLabel("Nama *", { exact: true }).fill("Z Pelanggan Diperbarui");
  await page.getByLabel("Telepon", { exact: true }).fill("0812 3450 1111");
  await page.getByRole("checkbox").uncheck();
  await page.getByRole("dialog").getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(list).toContainText("Z Pelanggan Diperbarui");
  await expect(list).toContainText("0812 3450 1111");
  await expect(list).toContainText("Umum");
  await chooseAction(page, "Z Pelanggan Diperbarui", "Hapus");
  await page.getByRole("dialog").getByRole("button", { name: "Hapus", exact: true }).click();
  await expect(list).not.toContainText("Z Pelanggan Diperbarui");
  await expect(input).toBeFocused();
  await input.fill("A Pelanggan Uji");
  await chooseAction(page, "A Pelanggan Uji", "Edit");
  await page.getByRole("checkbox").uncheck();
  await page.getByRole("dialog").getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(list).toContainText("Umum");
  await expect(list).toContainText("150 poin");
  const saved = await prisma.customer.findUniqueOrThrow({ where: { id: linkedCustomerId } });
  expect(saved.isMember).toBe(false);
  expect(saved.points).toBe(150);
  await chooseAction(page, "A Pelanggan Uji", "Hapus");
  await expect(page.getByRole("dialog")).toContainText("2 transaksi pelanggan ini");
  await page.getByRole("dialog").getByRole("button", { name: "Batal", exact: true }).click();
  await expect(list).toContainText("A Pelanggan Uji");
  await expect(page.getByRole("button", { name: "Aksi untuk A Pelanggan Uji", exact: true })).toBeFocused();
  await chooseAction(page, "A Pelanggan Uji", "Hapus");
  await page.getByRole("dialog").getByRole("button", { name: "Hapus", exact: true }).click();
  await expect(list).not.toContainText("A Pelanggan Uji");
  await expect(input).toBeFocused();
  const remainingSales = await prisma.sale.findMany({ where: { id: { in: saleIds }, ownerId } });
  expect(remainingSales).toHaveLength(2);
  expect(remainingSales.every(sale => sale.customerId === null)).toBe(true);
});

test("Pelanggan: toko kosong, form 320px, loading dan kegagalan simpan", async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 851 });
  await login(page, emptyEmail, "CustomersTest123");
  await expect(page.getByRole("list", { name: "Daftar pelanggan", exact: true })).toContainText("Belum ada pelanggan");
  await axe(page, "main", `${info.project.name}-empty`);
  await page.screenshot({ path: path.join(evidenceDir, `${info.project.name}-empty.png`) });
  const add = page.getByRole("button", { name: "+ Tambah pelanggan", exact: true });
  await add.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toHaveCSS("opacity", "1");
  const phone = page.getByLabel("Telepon", { exact: true });
  const email = page.getByLabel("Email", { exact: true });
  expect((await phone.boundingBox())!.width).toBe((await page.getByLabel("Nama *", { exact: true }).boundingBox())!.width);
  expect((await email.boundingBox())!.y).toBeGreaterThan((await phone.boundingBox())!.y);
  await expect(phone).toHaveAttribute("type", "tel");
  await expect(phone).toHaveAttribute("inputmode", "tel");
  await expect(email).toHaveAttribute("autocomplete", "email");
  await dialog.getByRole("button", { name: "Simpan", exact: true }).click();
  expect(await page.getByLabel("Nama *", { exact: true }).evaluate(el => (el as HTMLInputElement).checkValidity())).toBe(false);
  await page.getByLabel("Nama *", { exact: true }).fill("Pelanggan Belum Tersimpan");
  const member = dialog.getByRole("checkbox");
  await member.focus();
  await member.press("Space");
  await expect(member).toBeChecked();
  expect(await member.evaluate(el => el.closest("label")!.getBoundingClientRect().height)).toBe(44);
  await page.setViewportSize({ width: 320, height: 420 });
  await email.focus();
  await email.scrollIntoViewIfNeeded();
  const emailBox = (await email.boundingBox())!;
  expect(emailBox.y).toBeGreaterThanOrEqual(0);
  expect(emailBox.y + emailBox.height).toBeLessThanOrEqual(420);
  await page.screenshot({ path: path.join(evidenceDir, `${info.project.name}-short-form.png`) });
  await page.setViewportSize({ width: 320, height: 851 });
  await page.route("**/*", async route => {
    if (route.request().method() !== "POST") return route.continue();
    await new Promise(resolve => setTimeout(resolve, 1500));
    return route.abort("failed");
  });
  await dialog.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Menyimpan...", exact: true })).toBeDisabled();
  await page.screenshot({ path: path.join(evidenceDir, `${info.project.name}-saving.png`) });
  await expect(dialog.getByRole("alert")).toContainText("Gagal menyimpan pelanggan");
  await expect(dialog.getByRole("button", { name: "Simpan", exact: true })).toBeEnabled();
  await expect(page.getByLabel("Nama *", { exact: true })).toHaveValue("Pelanggan Belum Tersimpan");
  await axe(page, "[role=dialog]", `${info.project.name}-error`);
  await page.screenshot({ path: path.join(evidenceDir, `${info.project.name}-error.png`) });
  await dialog.getByRole("button", { name: "Batal", exact: true }).click();
  await expect(add).toBeFocused();
  await add.click();
  await expect(page.getByRole("dialog").getByRole("alert")).toHaveCount(0);
  await page.getByRole("button", { name: "Tutup dialog", exact: true }).click();
  await expect(add).toBeFocused();
  expect(await prisma.customer.count({ where: { ownerId: ownerIds[1] } })).toBe(0);
});
