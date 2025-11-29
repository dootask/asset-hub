"use client";

import { useRef } from "react";
import InventoryTaskList, { type InventoryTaskListHandle } from "@/components/assets/InventoryTaskList";
import AdminOnly from "@/components/auth/AdminOnly";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import type { InventoryTask } from "@/lib/types/inventory";

interface AssetInventoryPageClientProps {
  locale: string;
  tasks: InventoryTask[];
}

export default function AssetInventoryPageClient({ locale, tasks }: AssetInventoryPageClientProps) {
  const listRef = useRef<InventoryTaskListHandle>(null);
  const isChinese = locale === "zh";

  return (
    <div className="space-y-6">
      <PageHeader
        locale={locale}
        items={[
          {
            href: `/${locale}/assets`,
            labelZh: "资产管理",
            labelEn: "Assets",
          },
          {
            labelZh: "盘点任务",
            labelEn: "Inventory",
          },
        ]}
        title={isChinese ? "资产盘点" : "Asset Inventory"}
        description={
          isChinese
            ? "发起盘点任务、指定范围并导出资产清单。"
            : "Create inventory tasks, define scope, and export asset lists."
        }
        actions={
          <AdminOnly>
            <Button
              className="rounded-2xl px-4 py-2 text-sm"
              onClick={() => listRef.current?.openCreateDialog()}
            >
              {isChinese ? "新建盘点任务" : "New Inventory Task"}
            </Button>
          </AdminOnly>
        }
      />

      <InventoryTaskList
        ref={listRef}
        locale={locale}
        initialTasks={tasks}
        hideCreateButton
      />
    </div>
  );
}
