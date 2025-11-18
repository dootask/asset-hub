import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAssetById } from "@/lib/repositories/assets";
import { listOperationsForAsset } from "@/lib/repositories/asset-operations";
import OperationTimeline from "@/components/assets/OperationTimeline";
import OperationForm from "@/components/assets/OperationForm";

type PageParams = { id: string; locale: string };
type PageProps = {
  params: Promise<PageParams>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Asset ${id} - Asset Hub`,
  };
}

export default async function AssetDetailPage({ params }: PageProps) {
  const { id, locale } = await params;
  const asset = getAssetById(id);

  if (!asset) {
    notFound();
  }

  const operations = listOperationsForAsset(asset.id);
  const isChinese = locale === "zh";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {isChinese ? "资产管理 / 详情" : "Assets / Detail"}
          </p>
          <h1 className="text-2xl font-semibold">{asset.name}</h1>
          <p className="text-sm text-muted-foreground">{asset.id}</p>
        </div>
        <Link
          href={`/${locale}/assets/list`}
          className="rounded-full border px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
        >
          {isChinese ? "返回列表" : "Back to list"}
        </Link>
      </div>

      <section className="rounded-2xl border bg-muted/30 p-6">
        <h2 className="text-lg font-semibold">
          {isChinese ? "基础信息" : "Basic Info"}
        </h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">
              {isChinese ? "类别" : "Category"}
            </dt>
            <dd className="text-sm font-medium">{asset.category}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">
              {isChinese ? "状态" : "Status"}
            </dt>
            <dd className="text-sm font-medium">{asset.status}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">
              {isChinese ? "使用人 / 部门" : "Owner / Dept"}
            </dt>
            <dd className="text-sm font-medium">{asset.owner}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">
              {isChinese ? "位置" : "Location"}
            </dt>
            <dd className="text-sm font-medium">{asset.location}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">
              {isChinese ? "购入日期" : "Purchase Date"}
            </dt>
            <dd className="text-sm font-medium">{asset.purchaseDate}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border bg-muted/30 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-8">
          <div className="flex-1">
            <h2 className="text-lg font-semibold">
              {isChinese ? "操作记录" : "Operations"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isChinese
                ? "展示资产的关键操作，方便追溯来源与责任人。"
                : "Track every operation for audit and accountability."}
            </p>
            <div className="mt-4">
              <OperationTimeline operations={operations} locale={locale} />
            </div>
          </div>
          <div className="w-full lg:w-80">
            <OperationForm assetId={asset.id} locale={locale} />
          </div>
        </div>
      </section>
    </div>
  );
}

