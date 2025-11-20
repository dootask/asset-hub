"use client";

import { useRef } from "react";
import AssetCategoryTable, { type AssetCategoryTableHandle } from "@/components/assets/AssetCategoryTable";
import PageBreadcrumb from "@/components/layout/PageBreadcrumb";
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
              labelZh: "分类管理",
              labelEn: "Categories",
            },
          ]}
        />
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">
              {isChinese ? "资产类别管理" : "Asset Categories"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isChinese
                ? "自定义资产类别，供新增、筛选及报表使用。"
                : "Manage reusable categories for asset creation, filters, and reports."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={() => assetCategoryTableRef.current?.openCreateDialog()}
              className="rounded-2xl px-4 py-2 text-sm"
            >
              {isChinese ? "新增类别" : "New Category"}
            </Button>
          </div>
        </div>
      </header>

      <AssetCategoryTable
        ref={assetCategoryTableRef}
        initialCategories={initialCategories}
        locale={locale}
        baseUrl={baseUrl}
      />
    </div>
  );
}



