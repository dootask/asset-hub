import NewAssetForm from "@/components/assets/NewAssetForm";

export default async function AssetCreatePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isChinese = locale === "zh";
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-muted-foreground">
          {isChinese ? "资产管理 / 新增资产" : "Assets / Create"}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {isChinese ? "新增资产" : "Create Asset"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isChinese
            ? "填写资产基础信息，提交后将自动跳转到详情页。"
            : "Fill in the asset details. After submission you'll be redirected to the asset detail page."}
        </p>
      </header>

      <section className="rounded-2xl border bg-muted/30 p-6">
        <NewAssetForm locale={locale} />
      </section>
    </div>
  );
}

