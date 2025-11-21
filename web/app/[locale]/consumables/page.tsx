import type { Metadata } from "next";
import Link from "next/link";
import PageBreadcrumb from "@/components/layout/PageBreadcrumb";

export const metadata: Metadata = {
  title: "耗材管理 - Asset Hub",
};

export default async function ConsumablesOverviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isChinese = locale === "zh";
  const sections = [
    {
      href: `/${locale}/consumables/list`,
      titleZh: "耗材列表",
      titleEn: "Consumable List",
      descriptionZh: "管理在库耗材、库存状态与保管人。",
      descriptionEn: "Manage consumable stock, status, and keeper info.",
    },
    {
      href: `/${locale}/consumables/operations`,
      titleZh: "操作审计 / 报表",
      titleEn: "Operation Audit & Reports",
      descriptionZh: "查看耗材采购、出入库、预留等操作明细并导出报表。",
      descriptionEn: "Review purchase/inbound/outbound logs and export audit reports.",
    },
    {
      href: `/${locale}/consumables/inventory`,
      titleZh: "耗材盘点",
      titleEn: "Inventory",
      descriptionZh: "创建盘点任务、记录实盘数据并跟踪差异。",
      descriptionEn: "Create inventory tasks, record actual counts, and review variances.",
    },
    {
      href: `/${locale}/consumables/alerts`,
      titleZh: "低库存告警",
      titleEn: "Alerts",
      descriptionZh: "集中查看低库存/缺货提醒并标记为已处理。",
      descriptionEn: "Monitor low-stock or out-of-stock alerts and mark them resolved.",
    },
    {
      href: `/${locale}/consumables/settings`,
      titleZh: "耗材设置",
      titleEn: "Settings",
      descriptionZh: "定义耗材类别与字段，为后续流程做准备。",
      descriptionEn: "Define consumable categories and metadata for downstream workflows.",
    },
  ];

  return (
    <div className="space-y-6">
      <header>
        <PageBreadcrumb
          locale={locale}
          items={[
            {
              href: `/${locale}`,
              labelZh: "首页",
              labelEn: "Dashboard",
            },
            {
              labelZh: "耗材管理",
              labelEn: "Consumables",
            },
          ]}
        />
        <h1 className="mt-2 text-2xl font-semibold">
          {isChinese ? "耗材管理" : "Consumables"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isChinese
            ? "管理耗材库存、盘点任务、告警通知以及操作审计报表。"
            : "Manage consumable stock, inventory tasks, alerts, and audit reports."}
        </p>
      </header>
      <section className="grid gap-4 md:grid-cols-2">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="rounded-2xl border bg-card/70 p-5 transition hover:border-primary hover:bg-primary/5"
          >
            <h2 className="text-lg font-semibold">
              {isChinese ? section.titleZh : section.titleEn}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {isChinese ? section.descriptionZh : section.descriptionEn}
            </p>
          </Link>
        ))}
      </section>
    </div>
  );
}
