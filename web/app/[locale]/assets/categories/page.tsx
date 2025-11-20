import AssetCategoryTable from "@/components/assets/AssetCategoryTable";
import PageBreadcrumb from "@/components/layout/PageBreadcrumb";
import { listAssetCategories } from "@/lib/repositories/asset-categories";

export default async function AssetCategoriesPage({
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
              labelZh: "分类管理",
              labelEn: "Categories",
            },
          ]}
        />
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {isChinese ? "资产类别管理" : "Asset Categories"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isChinese
            ? "自定义资产类别，供新增、筛选及报表使用。"
            : "Manage reusable categories for asset creation, filters, and reports."}
        </p>
      </header>

      <section className="rounded-3xl border bg-card/80 p-6 shadow-sm">
        <AssetCategoryTable initialCategories={categories} locale={locale} />
      </section>
    </div>
  );
}


