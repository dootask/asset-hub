import type { Metadata } from "next";
import InventoryTaskList from "@/components/assets/InventoryTaskList";
import PageBreadcrumb from "@/components/layout/PageBreadcrumb";
import { listInventoryTasks } from "@/lib/repositories/inventory-tasks";
import { getRequestBaseUrl } from "@/lib/utils/server-url";

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
  const baseUrl = await getRequestBaseUrl();
  const isChinese = locale === "zh";

  return (
    <div className="space-y-6">
      <header>
        <PageBreadcrumb
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
        />
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {isChinese ? "资产盘点" : "Asset Inventory"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isChinese
            ? "发起盘点任务、指定范围并导出资产清单。"
            : "Create inventory tasks, define scope, and export asset lists."}
        </p>
      </header>
      <InventoryTaskList
        locale={locale}
        baseUrl={baseUrl}
        initialTasks={tasks}
      />
    </div>
  );
}

