import type { Metadata } from "next";
import AssetInventoryPageClient from "@/components/assets/AssetInventoryPageClient";
import { listInventoryTasks } from "@/lib/repositories/inventory-tasks";

export const metadata: Metadata = {
  title: "资产盘点 - Asset Hub",
};

export const revalidate = 0;
export const dynamic = "force-dynamic";

export default async function InventoryListPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const tasks = listInventoryTasks();

  return (
    <AssetInventoryPageClient locale={locale} tasks={tasks} />
  );
}
