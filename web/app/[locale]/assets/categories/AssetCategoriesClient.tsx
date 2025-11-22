"use client";

import { useRef } from "react";
import AssetCategoryTable, { type AssetCategoryTableHandle } from "@/components/assets/AssetCategoryTable";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import type { AssetCategory } from "@/lib/types/asset-category";

interface AssetCategoriesClientProps {
  initialCategories: AssetCategory[];
  locale: string;
  baseUrl: string;
}

export default function AssetCategoriesClient({ initialCategories, locale, baseUrl }: AssetCategoriesClientProps) {
  const isChinese = locale === "zh";
  const assetCategoryTableRef = useRef<AssetCategoryTableHandle>(null);

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
            labelZh: "分类管理",
            labelEn: "Categories",
          },
        ]}
        title={isChinese ? "资产类别管理" : "Asset Categories"}
        description={
          isChinese
            ? "自定义资产类别，供新增、筛选及报表使用。"
            : "Manage reusable categories for asset creation, filters, and reports."
        }
        actions={
          <Button
            type="button"
            onClick={() => assetCategoryTableRef.current?.openCreateDialog()}
            className="rounded-2xl px-4 py-2 text-sm"
          >
            {isChinese ? "新增类别" : "New Category"}
          </Button>
        }
      />

      <AssetCategoryTable
        ref={assetCategoryTableRef}
        initialCategories={initialCategories}
        locale={locale}
        baseUrl={baseUrl}
      />
    </div>
  );
}



