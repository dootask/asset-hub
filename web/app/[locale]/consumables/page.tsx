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
      href: `/${locale}/consumables/settings`,
      titleZh: "耗材设置",
      titleEn: "Settings",
      descriptionZh: "定义耗材类别与字段，为后续流程做准备。",
      descriptionEn: "Define consumable categories and fields for future workflows.",
    },
    {
      href: `/${locale}/consumables/operations`,
      titleZh: "操作流程（占位）",
      titleEn: "Operations (Coming Soon)",
      descriptionZh: "预留采购、入库、出库等流程入口。",
      descriptionEn: "Placeholder for purchase, inbound, and outbound workflows.",
    },
    {
      href: `/${locale}/consumables/inventory`,
      titleZh: "耗材盘点（占位）",
      titleEn: "Inventory (Coming Soon)",
      descriptionZh: "预留盘点任务与报表入口。",
      descriptionEn: "Placeholder for inventory tasks and reporting.",
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
          {isChinese ? "耗材管理（预览版）" : "Consumables (Preview)"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isChinese
            ? "预留耗材管理入口，即将支持耗材采购、库存和盘点。"
            : "Early preview area for consumable workflows, coming soon."}
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

