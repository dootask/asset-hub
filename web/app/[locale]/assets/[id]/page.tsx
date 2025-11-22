import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAssetById } from "@/lib/repositories/assets";
import { listOperationsForAsset } from "@/lib/repositories/asset-operations";
import OperationTimeline from "@/components/assets/OperationTimeline";
import OperationForm from "@/components/assets/OperationForm";
import ApprovalRequestForm from "@/components/approvals/ApprovalRequestForm";
import ApprovalStatusBadge from "@/components/approvals/ApprovalStatusBadge";
import { listApprovalRequests } from "@/lib/repositories/approvals";
import DisposeAssetButton from "@/components/assets/DisposeAssetButton";
import EditAssetDialog from "@/components/assets/EditAssetDialog";
import PageHeader from "@/components/layout/PageHeader";
import { getAssetStatusLabel } from "@/lib/types/asset";
import { listAssetCategories } from "@/lib/repositories/asset-categories";
import { listOperationTemplates } from "@/lib/repositories/operation-templates";

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
  const approvalsResult = listApprovalRequests({
    assetId: asset.id,
    pageSize: 5,
  });
  const approvals = approvalsResult.data;
  const isChinese = locale === "zh";
  const categories = listAssetCategories();
  const operationTemplates = listOperationTemplates();
  const categoryLabel =
    categories.find((category) => category.code === asset.category)?.[
      isChinese ? "labelZh" : "labelEn"
    ] ?? asset.category;

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
            labelZh: "资产详情",
            labelEn: "Asset Detail",
          },
        ]}
        title={asset.name}
        description={asset.id}
        actions={<DisposeAssetButton assetId={asset.id} locale={locale} />}
      />

      <section className="rounded-2xl border bg-muted/30 p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">
            {isChinese ? "基础信息" : "Basic Info"}
          </h2>
          <EditAssetDialog asset={asset} locale={locale} categories={categories} />
        </div>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">
              {isChinese ? "类别" : "Category"}
            </dt>
            <dd className="text-sm font-medium">{categoryLabel}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">
              {isChinese ? "状态" : "Status"}
            </dt>
            <dd className="text-sm font-medium">
              {getAssetStatusLabel(asset.status, locale)}
            </dd>
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
            <OperationForm
              assetId={asset.id}
              locale={locale}
              templates={operationTemplates}
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border bg-card/60 p-6">
        <div className="flex flex-col gap-2">
          <div>
            <h2 className="text-lg font-semibold">
              {isChinese ? "审批请求" : "Approvals"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isChinese
                ? "查看与该资产相关的审批进度，或直接在此发起新的审批。"
                : "Check approval progress for this asset or create a new one."}
            </p>
          </div>
          {approvals.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-muted-foreground/40 p-4 text-sm text-muted-foreground">
              {isChinese ? "暂无审批记录。" : "No approvals yet."}
            </p>
          ) : (
            <ul className="space-y-3">
              {approvals.map((approval) => (
                <li
                  key={approval.id}
                  className="rounded-2xl border bg-muted/30 p-3 text-sm"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium text-foreground">
                        {approval.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        #{approval.id} ·{" "}
                        {isChinese ? "申请人" : "Applicant"} {approval.applicantName ?? approval.applicantId}
                      </p>
                    </div>
                    <ApprovalStatusBadge status={approval.status} locale={locale} />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {isChinese ? "更新于" : "Updated"}{" "}
                      {new Date(approval.updatedAt).toLocaleString()}
                    </span>
                    <Link
                      href={`/${locale}/approvals/${approval.id}`}
                      className="text-primary hover:underline"
                    >
                      {isChinese ? "查看详情" : "View details"}
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-6">
          <ApprovalRequestForm
            assetId={asset.id}
            assetName={asset.name}
            locale={locale}
            operationTemplates={operationTemplates}
          />
        </div>
      </section>
    </div>
  );
}

