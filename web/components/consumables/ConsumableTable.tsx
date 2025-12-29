"use client";

import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Consumable } from "@/lib/types/consumable";
import { getConsumableStatusLabel } from "@/lib/types/consumable";
import { formatCentsToMoney } from "@/lib/utils/money";
import { stripDeletedSuffix } from "@/lib/utils/asset-number";

interface Props {
  consumables: Consumable[];
  locale: string;
  companyLookup?: Map<string, string>;
  categoryLookup?: Map<string, string>;
}

export default function ConsumableTable({
  consumables,
  locale,
  companyLookup,
  categoryLookup,
}: Props) {
  const isChinese = locale === "zh";

  if (consumables.length === 0) {
    return (
      <div className="rounded-2xl border bg-muted/30 p-12 text-center text-sm text-muted-foreground">
        {isChinese ? "暂无耗材数据，请尝试调整筛选或新增记录。" : "No consumables match the filters. Try adjusting filters or create a new record."}
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border bg-card">
      <Table className="text-sm">
        <TableHeader className="bg-muted/40">
          <TableRow className="text-xs uppercase tracking-wide text-muted-foreground">
            <TableHead className="px-4 py-3 w-[240px] md:w-[320px]">{isChinese ? "名称" : "Name"}</TableHead>
            <TableHead className="px-4 py-3">{isChinese ? "类别" : "Category"}</TableHead>
            <TableHead className="px-4 py-3">{isChinese ? "规格型号" : "Spec / Model"}</TableHead>
            <TableHead className="px-4 py-3">{isChinese ? "采购价格" : "Purchase Price"}</TableHead>
            <TableHead className="px-4 py-3">{isChinese ? "所属公司" : "Company"}</TableHead>
            <TableHead className="px-4 py-3">{isChinese ? "状态" : "Status"}</TableHead>
            <TableHead className="px-4 py-3">{isChinese ? "数量" : "Quantity"}</TableHead>
            <TableHead className="px-4 py-3">{isChinese ? "保管人" : "Keeper"}</TableHead>
            <TableHead className="px-4 py-3">{isChinese ? "位置" : "Location"}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {consumables.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="px-4 py-3 w-[240px] md:w-[320px]">
                <Link href={`/${locale}/consumables/${item.id}`} className="font-medium text-primary hover:underline">
                  {item.name}
                </Link>
                <div className="text-xs text-muted-foreground">
                  {stripDeletedSuffix(item.consumableNo) || item.id}
                </div>
              </TableCell>
              <TableCell className="px-4 py-3">
                {item.category
                  ? categoryLookup?.get(item.category) ?? item.category
                  : isChinese
                    ? "未分类"
                    : "Uncategorized"}
              </TableCell>
              <TableCell className="px-4 py-3">
                {item.specModel || (isChinese ? "未填写" : "-")}
              </TableCell>
              <TableCell className="px-4 py-3">
                {item.purchasePriceCents !== undefined && item.purchasePriceCents !== null
                  ? `${formatCentsToMoney(item.purchasePriceCents)} ${item.purchaseCurrency ?? "CNY"}`
                  : isChinese
                    ? "未填写"
                    : "-"}
              </TableCell>
              <TableCell className="px-4 py-3">
                {item.companyCode
                  ? companyLookup?.get(item.companyCode) ?? item.companyCode
                  : isChinese
                    ? "未指定"
                    : "Unassigned"}
              </TableCell>
              <TableCell className="px-4 py-3">
                <Badge variant="secondary">
                  {getConsumableStatusLabel(item.status, locale)}
                </Badge>
              </TableCell>
              <TableCell className="px-4 py-3">
                {item.quantity} {item.unit}
              </TableCell>
              <TableCell className="px-4 py-3">{item.keeper}</TableCell>
              <TableCell className="px-4 py-3">{item.location}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}
