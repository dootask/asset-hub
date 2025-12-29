import type { Metadata } from "next";
import { listAssetCategories } from "@/lib/repositories/asset-categories";
import { listCompanies } from "@/lib/repositories/companies";
import AssetImportExportClient from "@/components/assets/AssetImportExportClient";
import PageHeader from "@/components/layout/PageHeader";

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
  const companies = listCompanies();
  const isChinese = locale === "zh";

  return (
    <div className="space-y-6">
      <PageHeader
        locale={locale}
        items={[
          {
            href: `/${locale}/assets`,
            labelZh: "资产管理",
            labelEn: "Assets",
          },
          {
            href: `/${locale}/assets/list`,
            labelZh: "资产列表",
            labelEn: "Asset List",
          },
          {
            labelZh: "导入 / 导出",
            labelEn: "Import / Export",
          },
        ]}
        title={isChinese ? "资产导入导出" : "Asset Import / Export"}
        description={
          isChinese
            ? "统一管理资产 XLSX 导入与导出，批量维护资产数据。"
            : "Manage XLSX import and export to maintain asset records in bulk."
        }
      />
      <AssetImportExportClient
        locale={locale}
        categories={categories}
        companies={companies}
      />
    </div>
  );
}
