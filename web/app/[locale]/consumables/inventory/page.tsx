import Link from "next/link";
import type { Metadata } from "next";
import PageHeader from "@/components/layout/PageHeader";
import ConsumableInventoryCreateDialog from "@/components/consumables/ConsumableInventoryCreateDialog";
import { listConsumableCategories } from "@/lib/repositories/consumable-categories";
import { listConsumableInventoryTasks } from "@/lib/repositories/consumable-inventory";
import { requireAdminUser } from "@/lib/server/auth";

export const metadata: Metadata = {
  title: "耗材盘点 - Asset Hub",
};

function getStatusLabel(status: string, locale: string) {
  const isChinese = locale === "zh";
  switch (status) {
    case "draft":
      return isChinese ? "草稿" : "Draft";
    case "in-progress":
      return isChinese ? "执行中" : "In progress";
    case "completed":
      return isChinese ? "已完成" : "Completed";
    default:
      return status;
  }
}

export default async function ConsumableInventoryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireAdminUser(locale);
  
  const isChinese = locale === "zh";
  const [tasks, categories] = await Promise.all([
    listConsumableInventoryTasks(),
    listConsumableCategories(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        locale={locale}
        items={[
          {
            href: `/${locale}/consumables`,
            labelZh: "耗材管理",
            labelEn: "Consumables",
          },
          {
            labelZh: "盘点",
            labelEn: "Inventory",
          },
        ]}
        title={isChinese ? "耗材盘点任务" : "Consumable Inventory Tasks"}
        description={
          isChinese
            ? "创建盘点任务、跟踪执行进度并导出差异记录。"
            : "Create tasks, track progress, and export discrepancies."
        }
        actions={
          <ConsumableInventoryCreateDialog
            locale={locale}
            categories={categories.map((category) => ({
              code: category.code,
              label: locale === "zh" ? category.labelZh : category.labelEn,
            }))}
          />
        }
      />

      {tasks.length === 0 ? (
        <div className="rounded-2xl border bg-muted/30 p-12 text-center text-sm text-muted-foreground">
          {isChinese
            ? "还没有盘点任务，点击右上角按钮即可开始。"
            : "No inventory tasks yet. Use the button above to create one."}
        </div>
      ) : (
        <section className="grid gap-4 lg:grid-cols-2">
          {tasks.map((task) => {
            const progress =
              task.stats.totalEntries > 0
                ? Math.round(
                    (task.stats.recordedEntries / task.stats.totalEntries) * 100,
                  )
                : 0;
            return (
              <Link
                key={task.id}
                href={`/${locale}/consumables/inventory/${task.id}`}
                className="rounded-2xl border bg-card/70 p-4 transition hover:border-primary/40"
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {getStatusLabel(task.status, locale)}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(task.createdAt).toLocaleDateString(
                      locale === "zh" ? "zh-CN" : "en-US",
                    )}
                  </span>
                </div>
                <h2 className="mt-1 text-lg font-semibold text-foreground">
                  {task.name}
                </h2>
                {task.description && (
                  <p className="text-sm text-muted-foreground">
                    {task.description}
                  </p>
                )}
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {isChinese ? "进度" : "Progress"} · {task.stats.recordedEntries}/
                      {task.stats.totalEntries}
                    </span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-3 text-xs">
                  <span className="rounded-full bg-muted px-3 py-1 text-muted-foreground">
                    {isChinese ? "差异" : "Variances"} ·{" "}
                    {task.stats.varianceEntries}
                  </span>
                  {task.owner && (
                    <span className="rounded-full bg-muted px-3 py-1 text-muted-foreground">
                      {isChinese ? "负责人" : "Owner"} · {task.owner}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </section>
      )}
    </div>
  );
}

