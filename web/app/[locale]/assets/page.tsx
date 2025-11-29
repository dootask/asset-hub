import type { Metadata } from "next";
import Link from "next/link";
import AdminOnly from "@/components/auth/AdminOnly";
import PageHeader from "@/components/layout/PageHeader";

export const metadata: Metadata = {
  title: "资产管理 - Asset Hub",
};

export default async function AssetsOverviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isChinese = locale === "zh";

  const sections = [
    {
      href: `/${locale}/assets/list`,
      titleZh: "资产列表",
      titleEn: "Asset List",
      descriptionZh: "查看与筛选全部资产，支持跳转详情。",
      descriptionEn: "Browse and filter all assets, then drill into details.",
    },
    {
      href: `/${locale}/assets/new`,
      titleZh: "新增资产",
      titleEn: "Create Asset",
      descriptionZh: "录入新的资产信息，提交后进入详情页。",
      descriptionEn: "Create a new asset and jump to its detail page.",
    },
    {
      href: `/${locale}/assets/inventory`,
      titleZh: "资产盘点",
      titleEn: "Inventory",
      descriptionZh: "创建盘点任务、定义范围并导出清单。",
      descriptionEn: "Create inventory tasks, define scope, and export lists.",
      adminOnly: true,
    },
    {
      href: `/${locale}/assets/import-export`,
      titleZh: "导入 / 导出",
      titleEn: "Import / Export",
      descriptionZh: "批量导入或导出资产数据，保持数据一致性。",
      descriptionEn: "Import or export assets in bulk to keep data aligned.",
    },
    {
      href: `/${locale}/assets/categories`,
      titleZh: "资产设置",
      titleEn: "Settings",
      descriptionZh: "维护资产分类和字段，支撑后续流程。",
      descriptionEn: "Maintain asset categories and fields for downstream flows.",
      adminOnly: true,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        locale={locale}
        items={[
          {
            labelZh: "资产管理",
            labelEn: "Assets",
          },
        ]}
        title={isChinese ? "资产管理" : "Asset Management"}
        description={
          isChinese
            ? "管理资产全生命周期：创建、盘点、导入导出与分类配置。"
            : "Manage asset lifecycle: creation, inventory, import/export, and category setup."
        }
      />
      <section className="grid gap-4 md:grid-cols-2">
        {sections.map((section) => {
          const content = (
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
          );

          if (section.adminOnly) {
            return (
              <AdminOnly key={section.href}>
                <div className="contents">{content}</div>
              </AdminOnly>
            );
          }

          return <div key={section.href} className="contents">{content}</div>;
        })}
      </section>
    </div>
  );
}
