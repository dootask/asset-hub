"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
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
import { useAppFeedback } from "@/components/providers/feedback-provider";

interface Props {
  locale: string;
  categories: { code: string; label: string }[];
}

const DEFAULT_FORM = {
  name: "",
  description: "",
  owner: "",
  categories: [] as string[],
};

export default function ConsumableInventoryCreateDialog({
  locale,
  categories,
}: Props) {
  const isChinese = locale === "zh";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [formState, setFormState] = useState(DEFAULT_FORM);
  const [pending, startTransition] = useTransition();
  const feedback = useAppFeedback();

  const toggleCategory = (code: string) => {
    setFormState((prev) => {
      const exists = prev.categories.includes(code);
      return {
        ...prev,
        categories: exists
          ? prev.categories.filter((entry) => entry !== code)
          : [...prev.categories, code],
      };
    });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(async () => {
      try {
        if (!formState.name.trim()) {
          throw new Error(
            isChinese ? "请输入任务名称。" : "Please enter task name.",
          );
        }
        const response = await fetch(
          "/apps/asset-hub/api/consumables/inventory",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: formState.name.trim(),
              owner: formState.owner.trim() || undefined,
              description: formState.description.trim() || undefined,
              filters: formState.categories.length
                ? { categories: formState.categories }
                : undefined,
              status: "in-progress",
            }),
          },
        );
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.message ?? "创建失败，请稍后再试。");
        }
        setOpen(false);
        setFormState(DEFAULT_FORM);
        router.refresh();
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

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm"
      >
        <Plus className="h-4 w-4" />
        {isChinese ? "新建盘点任务" : "New Inventory Task"}
      </Button>
      <Dialog open={open} onOpenChange={(value) => !pending && setOpen(value)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isChinese ? "新建耗材盘点任务" : "Create consumable inventory task"}
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
            <form id="consumable-inventory-form" className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-1.5">
                <Label htmlFor="inventory-name">
                  {isChinese ? "任务名称" : "Task name"}
                </Label>
                <Input
                  id="inventory-name"
                  value={formState.name}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, name: event.target.value }))
                  }
                  placeholder={
                    isChinese ? "例如：Q2 仓库盘点" : "e.g. Q2 Warehouse Audit"
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inventory-owner">
                  {isChinese ? "负责人（可选）" : "Owner (optional)"}
                </Label>
                <Input
                  id="inventory-owner"
                  value={formState.owner}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, owner: event.target.value }))
                  }
                  placeholder={isChinese ? "张三" : "Owner name"}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inventory-description">
                  {isChinese ? "描述" : "Description"}
                </Label>
                <Textarea
                  id="inventory-description"
                  rows={3}
                  value={formState.description}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                  placeholder={
                    isChinese
                      ? "例如：针对办公区耗材进行取样盘点。"
                      : "Optional notes about scope or instructions."
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{isChinese ? "盘点范围" : "Scope filters"}</Label>
                <div className="rounded-2xl border bg-muted/40 p-3">
                  {categories.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      {isChinese
                        ? "暂无耗材类别，可在“耗材设置”中新增。"
                        : "No categories yet. Add some in Consumable Settings."}
                    </p>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {categories.map((category) => (
                        <label
                          key={category.code}
                          className="flex items-center gap-2 rounded-xl border border-transparent px-2 py-1 text-sm hover:border-border"
                        >
                          <Checkbox
                            checked={formState.categories.includes(category.code)}
                            onCheckedChange={() => toggleCategory(category.code)}
                          />
                          <span>{category.label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">
                    {isChinese
                      ? "若不选择类别则默认盘点全部耗材。"
                      : "Leave empty to include all consumables."}
                  </p>
                </div>
              </div>
            </form>
          </DialogBody>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              {isChinese ? "取消" : "Cancel"}
            </Button>
            <Button type="submit" form="consumable-inventory-form" disabled={pending}>
              {pending
                ? isChinese
                  ? "创建中..."
                  : "Creating..."
                : isChinese
                  ? "创建任务"
                  : "Create task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
