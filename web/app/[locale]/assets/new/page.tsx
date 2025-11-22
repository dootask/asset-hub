import NewAssetForm from "@/components/assets/NewAssetForm";
import PageHeader from "@/components/layout/PageHeader";
import { listAssetCategories } from "@/lib/repositories/asset-categories";

export default async function AssetCreatePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const categories = listAssetCategories();
  const isChinese = locale === "zh";
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
            labelZh: "新增资产",
            labelEn: "Create Asset",
          },
        ]}
        title={isChinese ? "新增资产" : "Create Asset"}
        description={
          isChinese
            ? "填写资产基础信息，提交后将自动跳转到详情页。"
            : "Fill in the asset details. After submission you'll be redirected to the asset detail page."
        }
      />

      <section className="rounded-2xl border bg-muted/30 p-6">
        <NewAssetForm locale={locale} categories={categories} />
      </section>
    </div>
  );
}

