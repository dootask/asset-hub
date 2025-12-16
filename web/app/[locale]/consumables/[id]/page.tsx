import { notFound } from "next/navigation";
import type { Metadata } from "next";
import PageHeader from "@/components/layout/PageHeader";
import ConsumableOperationForm from "@/components/consumables/ConsumableOperationForm";
import ConsumableOperationTimeline from "@/components/consumables/ConsumableOperationTimeline";
import { getConsumableById } from "@/lib/repositories/consumables";
import { listOperationsForConsumable } from "@/lib/repositories/consumable-operations";
import { getConsumableStatusLabel } from "@/lib/types/consumable";
import { listCompanies } from "@/lib/repositories/companies";
import { listApprovalRequests } from "@/lib/repositories/approvals";
import { listConsumableCategories } from "@/lib/repositories/consumable-categories";
import EditConsumableDialog from "@/components/consumables/EditConsumableDialog";
import AdminOnly from "@/components/auth/AdminOnly";
import { formatCentsToMoney } from "@/lib/utils/money";

type PageParams = { locale: string; id: string };

type PageProps = {
  params: Promise<PageParams>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Consumable ${id} - Asset Hub`,
  };
}

export default async function ConsumableDetailPage({ params }: PageProps) {
  const { locale, id } = await params;
  const consumable = getConsumableById(id);
  const operations = listOperationsForConsumable(id);
  const approvals = listApprovalRequests({ consumableId: id }).data;
  const isChinese = locale === "zh";
  const companies = listCompanies();
  const categories = listConsumableCategories();

  if (!consumable) {
    notFound();
  }

  const companyName =
    consumable.companyCode &&
    companies.find((company) => company.code === consumable.companyCode)?.name;
  const displayCompany =
    companyName ?? consumable.companyCode ?? (isChinese ? "未指定" : "Unassigned");
  const categoryLabel =
    categories.find((category) => category.code === consumable.category)?.[
      isChinese ? "labelZh" : "labelEn"
    ] ?? consumable.category;

  return (
    <div className="space-y-6">
      <PageHeader
        locale={locale}
        items={[
          {
            href: `/${locale}/consumables/list`,
            labelZh: "耗材列表",
            labelEn: "Consumables",
          },
          {
            labelZh: consumable.name,
            labelEn: consumable.name,
          },
        ]}
        title={consumable.name}
        description={consumable.consumableNo || consumable.id}
      />
      <section className="rounded-2xl border bg-card/70 p-5 text-sm">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold">
            {isChinese ? "基础信息" : "Basic Info"}
          </h2>
          <AdminOnly>
            <EditConsumableDialog
              consumable={consumable}
              categories={categories}
              companies={companies}
              locale={locale}
            />
          </AdminOnly>
        </div>
        <dl className="grid gap-4 md:grid-cols-2">
          <div>
            <dt className="font-medium text-muted-foreground">
              {isChinese ? "耗材编号" : "Consumable No."}
            </dt>
            <dd className="text-foreground">
              {consumable.consumableNo || consumable.id}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-muted-foreground">{isChinese ? "状态" : "Status"}</dt>
            <dd className="text-foreground">
              {getConsumableStatusLabel(consumable.status, locale)}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-muted-foreground">{isChinese ? "类别" : "Category"}</dt>
            <dd className="text-foreground">{categoryLabel}</dd>
          </div>
          <div>
            <dt className="font-medium text-muted-foreground">{isChinese ? "所属公司" : "Company"}</dt>
            <dd className="text-foreground">{displayCompany}</dd>
          </div>
          <div>
            <dt className="font-medium text-muted-foreground">{isChinese ? "库存" : "Quantity"}</dt>
            <dd className="text-foreground">
              {consumable.quantity} {consumable.unit}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-muted-foreground">
              {isChinese ? "规格型号" : "Spec / Model"}
            </dt>
            <dd className="text-foreground">{consumable.specModel ?? "-"}</dd>
          </div>
          <div>
            <dt className="font-medium text-muted-foreground">
              {isChinese ? "采购价格" : "Purchase Price"}
            </dt>
            <dd className="text-foreground">
              {consumable.purchasePriceCents !== undefined &&
              consumable.purchasePriceCents !== null
                ? `${formatCentsToMoney(consumable.purchasePriceCents)} ${
                    consumable.purchaseCurrency ?? "CNY"
                  }`
                : "-"}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-muted-foreground">{isChinese ? "安全库存" : "Safety stock"}</dt>
            <dd className="text-foreground">
              {consumable.safetyStock} {consumable.unit}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-muted-foreground">{isChinese ? "保管人" : "Keeper"}</dt>
            <dd className="text-foreground">{consumable.keeper}</dd>
          </div>
          <div>
            <dt className="font-medium text-muted-foreground">{isChinese ? "存放位置" : "Location"}</dt>
            <dd className="text-foreground">{consumable.location}</dd>
          </div>
        </dl>
        {consumable.description && (
          <div className="mt-4">
            <dt className="font-medium text-muted-foreground">{isChinese ? "描述" : "Description"}</dt>
            <dd className="text-foreground">{consumable.description}</dd>
          </div>
        )}
      </section>
      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <section className="rounded-2xl border bg-card/70 p-4">
          <div className="mb-4">
            <h2 className="text-base font-semibold">
              {isChinese ? "操作时间线" : "Operation Timeline"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isChinese
                ? "记录所有与该耗材相关的出入库、预留以及处理动作。"
                : "Track every inbound, outbound, reservation, or adjustment linked to this consumable."}
            </p>
          </div>
          <ConsumableOperationTimeline
            operations={operations}
            unit={consumable.unit}
            approvalsByOperation={approvals.reduce(
              (acc, approval) => {
                if (approval.consumableOperationId) {
                  acc[approval.consumableOperationId] = approval;
                }
                return acc;
              },
              {} as Record<string, (typeof approvals)[number]>,
            )}
            locale={locale}
          />
        </section>
        <section className="rounded-2xl border bg-card/70 p-4">
          <h2 className="text-base font-semibold">
            {isChinese ? "记录操作 / 发起审批" : "Log Operation / Start Approval"}
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            {isChinese
              ? "无需审批的操作将直接入账；需要审批的操作会生成待审批记录，审批通过后自动更新库存。"
              : "Operations that do not require approval post immediately; those requiring approval will create a pending request and update stock after approval."}
          </p>
          <ConsumableOperationForm
            consumableId={consumable.id}
            consumableName={consumable.name}
            locale={locale}
            unit={consumable.unit}
          />
        </section>
      </div>
    </div>
  );
}
