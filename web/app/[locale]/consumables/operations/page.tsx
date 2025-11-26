import type { Metadata } from "next";
import Link from "next/link";
import ConsumableOperationFilters from "@/components/consumables/ConsumableOperationFilters";
import PageHeader from "@/components/layout/PageHeader";
import ListPagination from "@/components/layout/ListPagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CONSUMABLE_OPERATION_STATUS_LABELS } from "@/lib/constants/consumable-operation-status";
import {
  queryConsumableOperations,
} from "@/lib/repositories/consumable-operations";
import {
  buildConsumableOperationQuery,
  toURLSearchParams,
} from "@/lib/utils/consumable-operation-query";
import {
  CONSUMABLE_OPERATION_TYPE_LABELS,
} from "@/lib/types/consumable-operation";

type SearchParams = Record<string, string | string[] | undefined>;

export const metadata: Metadata = {
  title: "耗材操作审计 - Asset Hub",
};

function formatDelta(value: number) {
  if (value === 0) return "0";
  return value > 0 ? `+${value}` : value.toString();
}

function formatDate(value: string, locale: string) {
  return new Date(value).toLocaleString(locale === "zh" ? "zh-CN" : "en-US");
}

export default async function ConsumableOperationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ locale }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  const isChinese = locale === "zh";

  const query = buildConsumableOperationQuery(resolvedSearchParams);
  const report = queryConsumableOperations(query);

  const baseParams = toURLSearchParams(resolvedSearchParams);
  const queryString = baseParams.toString();
  const exportHref = `/apps/asset-hub/api/consumables/operations/export${
    queryString ? `?${queryString}` : ""
  }`;

  const totalPages = Math.max(
    1,
    Math.ceil(report.total / Math.max(report.pageSize, 1)),
  );

  const getPageHref = (page: number) => {
    const params = new URLSearchParams(baseParams);
    params.set("page", page.toString());
    return `?${params.toString()}`;
  };

  const summaryCards = [
    {
      key: "total",
      value: report.summary.totalOperations,
      labelZh: "记录总数",
      labelEn: "Total Records",
    },
    {
      key: "pending",
      value: report.summary.pendingOperations,
      labelZh: "待处理",
      labelEn: "Pending",
    },
    {
      key: "inbound",
      value: report.summary.inboundQuantity,
      labelZh: "入库数量",
      labelEn: "Inbound Qty",
    },
    {
      key: "outbound",
      value: report.summary.outboundQuantity,
      labelZh: "出库数量",
      labelEn: "Outbound Qty",
    },
    {
      key: "net",
      value: report.summary.netQuantity,
      labelZh: "净变化",
      labelEn: "Net Delta",
    },
  ];

  const filterInitialValues = {
    keyword: query.keyword,
    keeper: query.keeper,
    actor: query.actor,
    consumableId: query.consumableId,
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
    types: query.types ?? [],
    statuses: query.statuses ?? [],
  };
  const statusLabels = CONSUMABLE_OPERATION_STATUS_LABELS;

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
            labelZh: "操作审计",
            labelEn: "Operation Audit",
          },
        ]}
        title={isChinese ? "耗材操作审计" : "Consumable Operation Audit"}
        description={
          isChinese
            ? "追踪采购、入库、出库、预留等操作，可按条件筛选并导出 CSV 报表。"
            : "Track purchase, inbound, outbound, and reservation logs with filters and CSV export."
        }
        actions={
          <a
            href={exportHref}
            className="inline-flex items-center justify-center rounded-2xl border px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            {isChinese ? "导出 CSV" : "Export CSV"}
          </a>
        }
      />

      <section className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        {summaryCards.map((card) => (
          <div
            key={card.key}
            className="rounded-2xl border bg-card px-4 py-3 shadow-sm"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {isChinese ? card.labelZh : card.labelEn}
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {card.value.toLocaleString()}
            </p>
          </div>
        ))}
      </section>

      <ConsumableOperationFilters
        locale={locale}
        initialValues={filterInitialValues}
      />

      {report.items.length === 0 ? (
        <div className="rounded-2xl border bg-muted/30 p-12 text-center text-sm text-muted-foreground">
          {isChinese
            ? "暂无符合条件的操作记录，请调整筛选条件。"
            : "No operations match the current filters."}
        </div>
      ) : (
        <section className="space-y-4 rounded-3xl border bg-card p-5 shadow-sm">
          <div className="overflow-x-auto">
            <Table className="text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead>{isChinese ? "耗材 / 操作" : "Consumable / Operation"}</TableHead>
                  <TableHead>{isChinese ? "操作者" : "Actor"}</TableHead>
                  <TableHead>{isChinese ? "数量变化" : "Quantity Delta"}</TableHead>
                  <TableHead>{isChinese ? "状态" : "Status"}</TableHead>
                  <TableHead>{isChinese ? "时间" : "Timestamp"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.items.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {isChinese
                            ? CONSUMABLE_OPERATION_TYPE_LABELS[entry.type].zh
                            : CONSUMABLE_OPERATION_TYPE_LABELS[entry.type].en}
                        </Badge>
                        <Link
                          href={`/${locale}/consumables/${entry.consumableId}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {entry.consumableName}
                        </Link>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {entry.description || (isChinese ? "无描述" : "No description")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ID: <span className="font-mono">{entry.id}</span>
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{entry.actor}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.keeper ?? "-"}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-foreground">
                        {formatDelta(entry.quantityDelta)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {isChinese ? "预留" : "Reserved"}:{" "}
                        {formatDelta(entry.reservedDelta)}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusLabels[entry.status].variant}>
                        {isChinese
                          ? statusLabels[entry.status].zh
                          : statusLabels[entry.status].en}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(entry.createdAt, locale)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ListPagination
            currentPage={report.page}
            totalPages={totalPages}
            getHref={getPageHref}
            locale={locale}
          />
        </section>
      )}
    </div>
  );
}
