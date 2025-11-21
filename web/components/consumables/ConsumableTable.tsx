"use client";

import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Consumable } from "@/lib/types/consumable";
import { getConsumableStatusLabel } from "@/lib/types/consumable";

interface Props {
  consumables: Consumable[];
  locale: string;
}

export default function ConsumableTable({ consumables, locale }: Props) {
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
            <TableHead className="px-4 py-3">{isChinese ? "名称" : "Name"}</TableHead>
            <TableHead className="px-4 py-3">{isChinese ? "类别" : "Category"}</TableHead>
            <TableHead className="px-4 py-3">{isChinese ? "状态" : "Status"}</TableHead>
            <TableHead className="px-4 py-3">{isChinese ? "数量" : "Quantity"}</TableHead>
            <TableHead className="px-4 py-3">{isChinese ? "保管人" : "Keeper"}</TableHead>
            <TableHead className="px-4 py-3">{isChinese ? "位置" : "Location"}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {consumables.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="px-4 py-3">
                <Link href={`/${locale}/consumables/${item.id}`} className="font-medium text-primary hover:underline">
                  {item.name}
                </Link>
                <div className="text-xs text-muted-foreground">{item.id}</div>
              </TableCell>
              <TableCell className="px-4 py-3">{item.category}</TableCell>
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
