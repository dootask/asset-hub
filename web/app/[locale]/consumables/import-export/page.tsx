import type { Metadata } from "next";
import ConsumableImportExportClient from "@/components/consumables/ConsumableImportExportClient";
import PageHeader from "@/components/layout/PageHeader";
import { listConsumableCategories } from "@/lib/repositories/consumable-categories";

export const metadata: Metadata = {
  title: "耗材导入导出 - Asset Hub",
};

export default async function ConsumableImportExportPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const categories = listConsumableCategories();
  const isChinese = locale === "zh";

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
            labelZh: "导入 / 导出",
            labelEn: "Import / Export",
          },
        ]}
        title={isChinese ? "耗材导入导出" : "Consumable Import / Export"}
        description={
          isChinese
            ? "批量下载或导入耗材库存数据。"
            : "Download or import consumable inventory data in bulk."
        }
      />
      <ConsumableImportExportClient locale={locale} categories={categories} />
    </div>
  );
}

