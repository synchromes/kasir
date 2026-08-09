import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import ConfirmClient from "@/components/pos/confirm";

export const metadata = { title: "Konfirmasi Pembayaran" };

export default async function ConfirmPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const ownerId = Number(session.user.id);
  const setting = await prisma.setting.findUnique({ where: { ownerId } });

  return (
    <ConfirmClient
      setting={{
        storeName: setting?.storeName ?? "",
        taxRate: setting?.taxRate ?? 0,
        qrisStatic: setting?.qrisStatic ?? "",
      }}
    />
  );
}
