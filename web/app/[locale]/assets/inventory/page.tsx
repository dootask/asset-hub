import type { Metadata } from "next";
import InventoryTaskList from "@/components/assets/InventoryTaskList";
import PageHeader from "@/components/layout/PageHeader";
import { listInventoryTasks } from "@/lib/repositories/inventory-tasks";

export const metadata: Metadata = {
  title: "资产盘点 - Asset Hub",
};

export default async function InventoryListPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const tasks = listInventoryTasks();
  const isChinese = locale === "zh";

  return (
    <div className="space-y-6">
      <PageHeader
        locale={locale}
        items={[
          {
            href: `/${locale}/assets/list`,
            labelZh: "资产列表",
            labelEn: "Assets",
          },
          {
            labelZh: "盘点任务",
            labelEn: "Inventory",
          },
        ]}
        title={isChinese ? "资产盘点" : "Asset Inventory"}
        description={
          isChinese
            ? "发起盘点任务、指定范围并导出资产清单。"
            : "Create inventory tasks, define scope, and export asset lists."
        }
      />
      <InventoryTaskList
        locale={locale}
        initialTasks={tasks}
      />
    </div>
  );
}
