"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ConsumableAlert } from "@/lib/types/consumable-alert";
import { getApiClient } from "@/lib/http/client";

interface Props {
  locale: string;
  alerts: ConsumableAlert[];
}

export default function ConsumableAlertTable({ locale, alerts }: Props) {
  const isChinese = locale === "zh";
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const resolveAlert = (alertId: string) => {
    setPendingId(alertId);
    startTransition(() => {
      void (async () => {
        try {
          const client = await getApiClient();
          await client.patch(
            `/apps/asset-hub/api/consumables/alerts/${alertId}`,
            { status: "resolved" },
          );
          window.location.reload();
        } catch (error) {
          alert(
            error instanceof Error
              ? error.message
              : isChinese
                ? "操作失败，请稍后再试。"
                : "Failed to resolve alert.",
          );
        } finally {
          setPendingId(null);
        }
      })();
    });
  };

  if (alerts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed bg-muted/30 p-10 text-center text-sm text-muted-foreground">
        {isChinese ? "暂无告警。" : "No alerts."}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border bg-card">
      <Table className="text-sm">
        <TableHeader>
          <TableRow>
            <TableHead>{isChinese ? "告警" : "Alert"}</TableHead>
            <TableHead>{isChinese ? "耗材" : "Consumable"}</TableHead>
            <TableHead>{isChinese ? "数量" : "Quantity"}</TableHead>
            <TableHead>{isChinese ? "时间" : "Timestamp"}</TableHead>
            <TableHead>{isChinese ? "操作" : "Actions"}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {alerts.map((alert) => (
            <TableRow key={alert.id}>
              <TableCell>
                <div className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium">
                    {alert.level === "out-of-stock"
                      ? isChinese
                        ? "缺货"
                        : "Out of stock"
                      : isChinese
                        ? "低库存"
                        : "Low stock"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{alert.message}</p>
              </TableCell>
              <TableCell>
                <Link
                  href={`/${locale}/consumables/${alert.consumableId}`}
                  className="font-medium text-primary hover:underline"
                >
                  {alert.consumableName}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {alert.keeper ?? "-"}
                </p>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  {isChinese ? "库存" : "Qty"}: {alert.quantity}
                </div>
                <div className="text-xs text-muted-foreground">
                  {isChinese ? "预留" : "Reserved"}: {alert.reservedQuantity}
                </div>
              </TableCell>
              <TableCell>
                <p className="text-xs text-muted-foreground">
                  {new Date(alert.createdAt).toLocaleString(
                    locale === "zh" ? "zh-CN" : "en-US",
                  )}
                </p>
              </TableCell>
              <TableCell>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => resolveAlert(alert.id)}
                  disabled={isPending && pendingId === alert.id}
                >
                  {isPending && pendingId === alert.id
                    ? isChinese
                      ? "处理中..."
                      : "Resolving..."
                    : isChinese
                      ? "标记处理"
                      : "Mark resolved"}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
