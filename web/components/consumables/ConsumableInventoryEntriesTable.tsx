"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ConsumableInventoryEntry } from "@/lib/types/consumable-inventory";
import { getApiClient } from "@/lib/http/client";

interface Props {
  taskId: string;
  locale: string;
  entries: ConsumableInventoryEntry[];
}

type DraftState = Record<
  string,
  {
    actualQuantity: string;
    actualReserved: string;
    note: string;
  }
>;

export default function ConsumableInventoryEntriesTable({
  taskId,
  locale,
  entries,
}: Props) {
  const isChinese = locale === "zh";
  const router = useRouter();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<DraftState>(() =>
    entries.reduce<DraftState>((acc, entry) => {
      acc[entry.id] = {
        actualQuantity:
          entry.actualQuantity !== undefined && entry.actualQuantity !== null
            ? entry.actualQuantity.toString()
            : "",
        actualReserved:
          entry.actualReserved !== undefined && entry.actualReserved !== null
            ? entry.actualReserved.toString()
            : "",
        note: entry.note ?? "",
      };
      return acc;
    }, {}),
  );

  const varianceSummary = useMemo(() => {
    return entries.reduce(
      (acc, entry) => {
        acc.quantity += entry.varianceQuantity ?? 0;
        acc.reserved += entry.varianceReserved ?? 0;
        return acc;
      },
      { quantity: 0, reserved: 0 },
    );
  }, [entries]);

  const handleChange = (
    entryId: string,
    field: "actualQuantity" | "actualReserved" | "note",
    value: string,
  ) => {
    setDrafts((prev) => ({
      ...prev,
      [entryId]: {
        ...(prev[entryId] ?? { actualQuantity: "", actualReserved: "", note: "" }),
        [field]: value,
      },
    }));
  };

  const handleSave = async (entryId: string) => {
    const current = drafts[entryId] ?? {
      actualQuantity: "",
      actualReserved: "",
      note: "",
    };
    const body = {
      entries: [
        {
          id: entryId,
          actualQuantity: current.actualQuantity.trim()
            ? Number(current.actualQuantity)
            : null,
          actualReserved: current.actualReserved.trim()
            ? Number(current.actualReserved)
            : null,
          note: current.note.trim() || undefined,
        },
      ],
    };
    setSavingId(entryId);
    try {
      const client = await getApiClient();
      await client.put(
        `/apps/asset-hub/api/consumables/inventory/${taskId}`,
        body,
      );
      router.refresh();
    } catch (error) {
      console.error(error);
      // TODO: Toast system; fallback alert
      alert(
        error instanceof Error
          ? error.message
          : isChinese
            ? "保存失败，请稍后再试。"
            : "Failed to save entry.",
      );
    } finally {
      setSavingId(null);
    }
  };

  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed bg-muted/30 p-10 text-center text-sm text-muted-foreground">
        {isChinese
          ? "此次盘点暂无耗材条目。"
          : "No consumables were included in this task."}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
        {isChinese
          ? `数量差异：${varianceSummary.quantity}，预留差异：${varianceSummary.reserved}`
          : `Quantity variance: ${varianceSummary.quantity}, reserved variance: ${varianceSummary.reserved}`}
      </div>
      <div className="overflow-x-auto rounded-2xl border bg-card">
        <Table className="min-w-[800px] text-sm">
          <TableHeader>
            <TableRow>
              <TableHead>{isChinese ? "耗材" : "Consumable"}</TableHead>
              <TableHead>{isChinese ? "期望库存" : "Expected qty"}</TableHead>
              <TableHead>{isChinese ? "期望预留" : "Expected reserved"}</TableHead>
              <TableHead>{isChinese ? "实盘库存" : "Actual qty"}</TableHead>
              <TableHead>{isChinese ? "实盘预留" : "Actual reserved"}</TableHead>
              <TableHead>{isChinese ? "差异" : "Variance"}</TableHead>
              <TableHead className="w-48">{isChinese ? "备注" : "Note"}</TableHead>
              <TableHead>{isChinese ? "操作" : "Action"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => {
              const draft = drafts[entry.id] ?? {
                actualQuantity: "",
                actualReserved: "",
                note: "",
              };
              const varianceQuantity =
                draft.actualQuantity.trim().length > 0
                  ? Number(draft.actualQuantity) - entry.expectedQuantity
                  : entry.varianceQuantity ?? 0;
              const varianceReserved =
                draft.actualReserved.trim().length > 0
                  ? Number(draft.actualReserved) - entry.expectedReserved
                  : entry.varianceReserved ?? 0;

              return (
                <TableRow key={entry.id}>
                  <TableCell>
                    <div className="font-medium text-foreground">
                      {entry.consumableName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {entry.category ?? "-"}
                    </div>
                  </TableCell>
                  <TableCell>
                    {entry.expectedQuantity}
                  </TableCell>
                  <TableCell>{entry.expectedReserved}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={draft.actualQuantity}
                      onChange={(event) =>
                        handleChange(entry.id, "actualQuantity", event.target.value)
                      }
                      placeholder="-"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={draft.actualReserved}
                      onChange={(event) =>
                        handleChange(entry.id, "actualReserved", event.target.value)
                      }
                      placeholder="-"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {varianceQuantity > 0 ? "+" : ""}
                      {varianceQuantity}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {isChinese ? "预留" : "Reserved"}:{" "}
                      {varianceReserved > 0 ? "+" : ""}
                      {varianceReserved}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Textarea
                      rows={2}
                      value={draft.note}
                      onChange={(event) =>
                        handleChange(entry.id, "note", event.target.value)
                      }
                      placeholder={isChinese ? "备注" : "Note"}
                      className="min-h-9"
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      onClick={() => handleSave(entry.id)}
                      disabled={savingId === entry.id}
                    >
                      {savingId === entry.id
                        ? isChinese
                          ? "保存中..."
                          : "Saving..."
                        : isChinese
                          ? "保存"
                          : "Save"}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
