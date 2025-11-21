import type { Metadata } from "next";
import { listAssetCategories } from "@/lib/repositories/asset-categories";
import AssetImportExportClient from "@/components/assets/AssetImportExportClient";
import PageBreadcrumb from "@/components/layout/PageBreadcrumb";

export const metadata: Metadata = {
  title: "资产导入导出 - Asset Hub",
};

export default async function AssetImportExportPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const categories = listAssetCategories();
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
              labelZh: "导入 / 导出",
              labelEn: "Import / Export",
            },
          ]}
        />
        <h1 className="mt-2 text-2xl font-semibold">
          {isChinese ? "资产导入与导出" : "Asset Import & Export"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isChinese
            ? "统一管理资产 CSV 导入与导出，批量维护资产数据。"
            : "Manage CSV import and export to maintain asset records in bulk."}
        </p>
      </header>
      <AssetImportExportClient locale={locale} categories={categories} />
    </div>
  );
}

