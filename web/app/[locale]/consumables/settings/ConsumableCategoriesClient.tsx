"use client";

import { useRef } from "react";
import PageHeader from "@/components/layout/PageHeader";
import ConsumableCategoryTable, {
  type ConsumableCategoryTableHandle,
} from "@/components/consumables/ConsumableCategoryTable";
import type { ConsumableCategory } from "@/lib/types/consumable";

type Props = {
  locale: string;
  initialCategories: ConsumableCategory[];
};

export default function ConsumableCategoriesClient({
  locale,
  initialCategories,
}: Props) {
  const tableRef = useRef<ConsumableCategoryTableHandle>(null);
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
            labelZh: "耗材类别",
            labelEn: "Categories",
          },
        ]}
        title={isChinese ? "耗材类别管理" : "Consumable Categories"}
        description={
          isChinese
            ? "定义耗材类别与默认单位，便于录入与报表统计。"
            : "Define consumable categories and default units for reporting."
        }
        actions={
          <button
            type="button"
            onClick={() => tableRef.current?.openCreateDialog()}
            className="inline-flex items-center justify-center rounded-2xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition hover:bg-primary/90"
          >
            {isChinese ? "新增类别" : "New Category"}
          </button>
        }
      />

      <ConsumableCategoryTable
        ref={tableRef}
        locale={locale}
        initialCategories={initialCategories}
      />
    </div>
  );
}

