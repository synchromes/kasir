import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import ExpensesPage from "@/components/expenses";
import { todayRange } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PER_OPTIONS = [10, 20, 50, 100];
const DEFAULT_PER = 20;

export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string; per?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const ownerId = Number(session.user.id);
  const sp = await searchParams;
  const perRaw = Number(sp.per);
  const per = PER_OPTIONS.includes(perRaw) ? perRaw : DEFAULT_PER;
  const { start, end } = todayRange();
  const total = await prisma.expense.count({ where: { ownerId } });
  const totalPages = Math.max(1, Math.ceil(total / per));
  const pageNum = Math.min(Math.max(1, Number(sp.page) || 1), totalPages);

  const [expenses, grand, today] = await Promise.all([
    prisma.expense.findMany({ where: { ownerId }, orderBy: { createdAt: "desc" }, skip: (pageNum - 1) * per, take: per }),
    prisma.expense.aggregate({ where: { ownerId }, _sum: { amount: true } }),
    prisma.expense.aggregate({ where: { ownerId, createdAt: { gte: start, lt: end } }, _sum: { amount: true } }),
  ]);
  return (
    <ExpensesPage
      expenses={expenses}
      grandTotal={grand._sum.amount ?? 0}
      todayTotal={today._sum.amount ?? 0}
      total={total}
      page={pageNum}
      per={per}
    />
  );
}
