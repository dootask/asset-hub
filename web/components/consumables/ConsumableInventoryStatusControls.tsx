"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { ConsumableInventoryTaskStatus } from "@/lib/types/consumable-inventory";
import { getApiClient } from "@/lib/http/client";

interface Props {
  taskId: string;
  status: ConsumableInventoryTaskStatus;
  locale: string;
}

export default function ConsumableInventoryStatusControls({
  taskId,
  status,
  locale,
}: Props) {
  const isChinese = locale === "zh";
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const updateStatus = (nextStatus: ConsumableInventoryTaskStatus) => {
    startTransition(async () => {
      try {
        const client = await getApiClient();
        await client.put(
          `/apps/asset-hub/api/consumables/inventory/${taskId}`,
          { status: nextStatus },
        );
        router.refresh();
      } catch (error) {
        alert(
          error instanceof Error
            ? error.message
            : isChinese
              ? "更新状态失败，请稍后再试。"
              : "Failed to update status.",
        );
      }
    });
  };

  if (status === "completed") {
    return (
      <span className="text-sm text-muted-foreground">
        {isChinese ? "任务已完成" : "Task completed"}
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status === "draft" && (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => updateStatus("in-progress")}
        >
          {pending
            ? isChinese
              ? "更新中..."
              : "Updating..."
            : isChinese
              ? "开始盘点"
              : "Start task"}
        </Button>
      )}
      <Button
        size="sm"
        disabled={pending}
        onClick={() => updateStatus("completed")}
      >
        {pending
          ? isChinese
            ? "更新中..."
            : "Updating..."
          : isChinese
            ? "标记完成"
            : "Mark completed"}
      </Button>
    </div>
  );
}
