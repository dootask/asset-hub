"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import type { InventoryTask, InventoryTaskStatus } from "@/lib/types/inventory";
import { ASSET_STATUSES } from "@/lib/types/asset";
import { useAppFeedback } from "@/components/providers/feedback-provider";
import { getApiClient } from "@/lib/http/client";

interface Props {
  locale: string;
  baseUrl: string;
  initialTasks: InventoryTask[];
}

type FormState = {
  name: string;
  scope: string;
  owner: string;
  description: string;
  filters: Record<string, unknown>;
};

const DEFAULT_FORM: FormState = {
  name: "",
  scope: "",
  owner: "",
  description: "",
  filters: {},
};

const STATUS_LABELS: Record<InventoryTaskStatus, { zh: string; en: string; tone: string }> = {
  draft: { zh: "草稿", en: "Draft", tone: "text-muted-foreground" },
  "in-progress": { zh: "进行中", en: "In Progress", tone: "text-amber-600" },
  completed: { zh: "已完成", en: "Completed", tone: "text-emerald-600" },
};

export default function InventoryTaskList({ locale, baseUrl, initialTasks }: Props) {
  const isChinese = locale === "zh";
  const [tasks, setTasks] = useState(initialTasks);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formState, setFormState] = useState<FormState>(DEFAULT_FORM);
  const [pending, startTransition] = useTransition();
  const feedback = useAppFeedback();

  const handleFilterToggle = (status: string) => {
    setFormState((prev) => {
      const current = Array.isArray(prev.filters.status)
        ? [...(prev.filters.status as string[])]
        : [];
      const next = current.includes(status)
        ? current.filter((entry) => entry !== status)
        : [...current, status];
      return {
        ...prev,
        filters: { ...prev.filters, status: next },
      };
    });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(async () => {
      try {
        if (!formState.name.trim()) {
          throw new Error(isChinese ? "请输入任务名称。" : "Please enter a task name.");
        }
        const client = await getApiClient();
        const response = await client.post<{ data: InventoryTask }>(
          `${baseUrl}/apps/asset-hub/api/assets/inventory-tasks`,
          {
            name: formState.name.trim(),
            scope: formState.scope.trim() || undefined,
            owner: formState.owner.trim() || undefined,
            description: formState.description.trim() || undefined,
            filters: formState.filters,
          },
        );
        setTasks((prev) => [response.data.data, ...prev]);
        setDialogOpen(false);
        setFormState(DEFAULT_FORM);
        feedback.success(isChinese ? "盘点任务已创建" : "Inventory task created");
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : isChinese
              ? "创建失败，请稍后重试。"
              : "Failed to create task.";
        feedback.error(message, {
          blocking: true,
          title: isChinese ? "创建失败" : "Create failed",
          acknowledgeLabel: isChinese ? "知道了" : "Got it",
        });
      }
    });
  };

  const updateStatus = (task: InventoryTask, status: InventoryTaskStatus) => {
    startTransition(async () => {
      try {
        const client = await getApiClient();
        const response = await client.put<{ data: InventoryTask }>(
          `${baseUrl}/apps/asset-hub/api/assets/inventory-tasks/${task.id}`,
          { status },
        );
        setTasks((prev) =>
          prev.map((item) => (item.id === task.id ? response.data.data : item)),
        );
        feedback.success(isChinese ? "状态已更新" : "Status updated");
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : isChinese
              ? "更新失败，请稍后重试。"
              : "Failed to update task.";
        feedback.error(message, {
          blocking: true,
          title: isChinese ? "更新失败" : "Update failed",
          acknowledgeLabel: isChinese ? "知道了" : "Got it",
        });
      }
    });
  };

  const filterSummary = (task: InventoryTask) => {
    const filters = task.filters ?? {};
    const parts: string[] = [];
    if (Array.isArray(filters.status) && filters.status.length) {
      parts.push(`${isChinese ? "状态" : "Status"}: ${filters.status.join(", ")}`);
    }
    if (typeof filters.category === "string" && filters.category.trim()) {
      parts.push(`${isChinese ? "类别" : "Category"}: ${filters.category}`);
    }
    if (typeof filters.search === "string" && filters.search.trim()) {
      parts.push(`${isChinese ? "关键词" : "Keyword"}: ${filters.search}`);
    }
    return parts.length ? parts.join(" · ") : isChinese ? "全部资产" : "All assets";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold">
            {isChinese ? "盘点任务列表" : "Inventory Tasks"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isChinese
              ? "创建盘点范围，导出资产清单供线下核对。"
              : "Create inventory scopes and export asset lists for offline checks."}
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="rounded-2xl px-4 py-2 text-sm">
          {isChinese ? "新建盘点任务" : "New Inventory Task"}
        </Button>
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-muted/30 p-12 text-center text-sm text-muted-foreground">
          {isChinese ? "尚未创建任何盘点任务。" : "No inventory tasks yet."}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {tasks.map((task) => {
            const statusLabel = STATUS_LABELS[task.status];
            return (
              <div key={task.id} className="flex flex-col gap-3 rounded-2xl border bg-card/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">{task.id}</p>
                    <h3 className="text-lg font-semibold">{task.name}</h3>
                  </div>
                  <span className={`text-sm font-medium ${statusLabel.tone}`}>
                    {isChinese ? statusLabel.zh : statusLabel.en}
                  </span>
                </div>
                {task.description && (
                  <p className="text-sm text-muted-foreground">
                    {task.description}
                  </p>
                )}
                <div className="rounded-2xl border border-dashed bg-muted/20 p-3 text-xs text-muted-foreground">
                  <p>{filterSummary(task)}</p>
                  {task.owner && (
                    <p className="mt-1">
                      {isChinese ? "负责人：" : "Owner:"} {task.owner}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/${locale}/assets/inventory/${task.id}`}
                    className="inline-flex rounded-2xl border px-3 py-1 text-sm text-muted-foreground hover:text-foreground"
                  >
                    {isChinese ? "查看详情" : "View Details"}
                  </Link>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      updateStatus(
                        task,
                        task.status === "draft" ? "in-progress" : "completed",
                      )
                    }
                  >
                    {task.status === "completed"
                      ? isChinese
                        ? "已完成"
                        : "Completed"
                      : task.status === "draft"
                        ? isChinese
                          ? "标记进行中"
                          : "Mark In Progress"
                        : isChinese
                          ? "标记完成"
                          : "Mark Complete"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    asChild
                  >
                    <a
                      href={`/apps/asset-hub/api/assets/inventory-tasks/${task.id}/export`}
                    >
                      {isChinese ? "导出资产清单" : "Export Assets"}
                    </a>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isChinese ? "新建盘点任务" : "New Inventory Task"}
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
            <form id="asset-inventory-form" className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-1.5">
                <Label>{isChinese ? "任务名称" : "Task Name"}</Label>
                <Input
                  value={formState.name}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, name: event.target.value }))
                  }
                  required
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>{isChinese ? "范围说明" : "Scope Summary"}</Label>
                  <Input
                    value={formState.scope}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, scope: event.target.value }))
                    }
                    placeholder={isChinese ? "例如：上海办公室资产" : "e.g. Shanghai office assets"}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{isChinese ? "负责人" : "Owner"}</Label>
                  <Input
                    value={formState.owner}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, owner: event.target.value }))
                    }
                    placeholder={isChinese ? "填写负责人姓名或部门" : "Responsible person or team"}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{isChinese ? "描述（可选）" : "Description (optional)"}</Label>
                <Textarea
                  rows={3}
                  value={formState.description}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, description: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{isChinese ? "过滤条件" : "Filters"}</Label>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">
                      {isChinese ? "按状态筛选" : "Filter by status"}
                    </p>
                    <div className="mt-2 space-y-1 text-sm">
                      {ASSET_STATUSES.map((status) => (
                        <label key={status} className="flex items-center gap-2">
                          <Checkbox
                            checked={
                              Array.isArray(formState.filters.status)
                                ? (formState.filters.status as string[]).includes(status)
                                : false
                            }
                            onCheckedChange={() => handleFilterToggle(status)}
                          />
                          <span>
                            {isChinese
                              ? status === "in-use"
                                ? "使用中"
                                : status === "idle"
                                  ? "闲置"
                                  : status === "maintenance"
                                    ? "维护中"
                                    : "已退役"
                              : status}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="space-y-1.5">
                      <Label>{isChinese ? "类别关键词" : "Category"}</Label>
                      <Input
                        value={(formState.filters.category as string) ?? ""}
                        onChange={(event) =>
                          setFormState((prev) => ({
                            ...prev,
                            filters: {
                              ...prev.filters,
                              category: event.target.value,
                            },
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>{isChinese ? "关键词" : "Keyword"}</Label>
                      <Input
                        value={(formState.filters.search as string) ?? ""}
                        onChange={(event) =>
                          setFormState((prev) => ({
                            ...prev,
                            filters: {
                              ...prev.filters,
                              search: event.target.value,
                            },
                          }))
                        }
                        placeholder={isChinese ? "支持名称、位置等模糊搜索" : "Supports name, location, etc."}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </DialogBody>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDialogOpen(false);
                setFormState(DEFAULT_FORM);
              }}
            >
              {isChinese ? "取消" : "Cancel"}
            </Button>
            <Button type="submit" form="asset-inventory-form" disabled={pending}>
              {pending
                ? isChinese
                  ? "创建中..."
                  : "Creating..."
                : isChinese
                  ? "创建任务"
                  : "Create Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
