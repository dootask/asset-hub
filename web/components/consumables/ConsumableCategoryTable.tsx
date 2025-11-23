"use client";

import { forwardRef, useCallback, useImperativeHandle, useState, useTransition } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { ConsumableCategory } from "@/lib/types/consumable";
import { useAppFeedback } from "@/components/providers/feedback-provider";

export interface ConsumableCategoryTableHandle {
  openCreateDialog: () => void;
}

interface Props {
  initialCategories: ConsumableCategory[];
  locale: string;
  baseUrl: string;
}

type FormState = {
  labelZh: string;
  labelEn: string;
  code: string;
  description: string;
  unit: string;
};

const DEFAULT_FORM: FormState = {
  labelZh: "",
  labelEn: "",
  code: "",
  description: "",
  unit: "",
};

const ConsumableCategoryTable = forwardRef<ConsumableCategoryTableHandle, Props>(function ConsumableCategoryTable(
  { initialCategories, locale, baseUrl }: Props,
  ref,
) {
  const [categories, setCategories] = useState(initialCategories);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ConsumableCategory | null>(null);
  const [formState, setFormState] = useState<FormState>(DEFAULT_FORM);
  const [pending, startTransition] = useTransition();
  const isChinese = locale === "zh";
  const feedback = useAppFeedback();

  const openCreateDialog = useCallback(() => {
    setEditing(null);
    setFormState(DEFAULT_FORM);
    setDialogOpen(true);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      openCreateDialog,
    }),
    [openCreateDialog],
  );

  const openEditDialog = useCallback((category: ConsumableCategory) => {
    setEditing(category);
    setFormState({
      labelZh: category.labelZh,
      labelEn: category.labelEn,
      code: category.code,
      description: category.description ?? "",
      unit: category.unit ?? "",
    });
    setDialogOpen(true);
  }, []);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(async () => {
      try {
        const payload = {
          labelZh: formState.labelZh.trim(),
          labelEn: formState.labelEn.trim(),
          description: formState.description.trim() || undefined,
          unit: formState.unit.trim() || undefined,
        };
        const response = await fetch(
          editing
            ? `${baseUrl}/apps/asset-hub/api/consumables/categories/${editing.id}`
            : `${baseUrl}/apps/asset-hub/api/consumables/categories`,
          {
            method: editing ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(
              editing
                ? payload
                : {
                    code: formState.code.trim(),
                    ...payload,
                  },
            ),
          },
        );
        if (!response.ok) {
          const message = await response.json().catch(() => null);
          throw new Error(message?.message ?? "保存失败，请稍后重试。");
        }
        const { data } = (await response.json()) as { data: ConsumableCategory };
        setCategories((prev) => {
          if (editing) {
            return prev.map((item) => (item.id === editing.id ? data : item));
          }
          return [data, ...prev];
        });
        setDialogOpen(false);
        setEditing(null);
        feedback.success(
          isChinese
            ? editing
              ? "类别已更新"
              : "类别已创建"
            : editing
              ? "Category updated"
              : "Category created",
        );
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : isChinese
              ? "保存失败，请稍后重试。"
              : "Failed to save category.";
        feedback.error(message, {
          blocking: true,
          title: isChinese ? "保存失败" : "Save failed",
          acknowledgeLabel: isChinese ? "知道了" : "Got it",
        });
      }
    });
  };

  const handleDelete = (category: ConsumableCategory) => {
    startTransition(async () => {
      try {
        const response = await fetch(
          `${baseUrl}/apps/asset-hub/api/consumables/categories/${category.id}`,
          {
            method: "DELETE",
          },
        );
        const message = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(message?.message ?? "删除失败");
        }
        setCategories((prev) => prev.filter((item) => item.id !== category.id));
        feedback.success(isChinese ? "删除成功" : "Deleted successfully");
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : isChinese
              ? "删除失败，请稍后重试。"
              : "Failed to delete category.";
        feedback.error(message, {
          blocking: true,
          title: isChinese ? "删除失败" : "Delete failed",
          acknowledgeLabel: isChinese ? "知道了" : "Got it",
        });
      }
    });
  };

  return (
    <>
      <section className="overflow-hidden rounded-2xl border bg-card">
        <Table className="text-sm">
          <TableHeader className="bg-muted/30">
            <TableRow className="text-xs uppercase tracking-wide text-muted-foreground">
              <TableHead className="px-4 py-3">{isChinese ? "显示名称" : "Display name"}</TableHead>
              <TableHead className="px-4 py-3">{isChinese ? "编码" : "Code"}</TableHead>
              <TableHead className="px-4 py-3">{isChinese ? "单位" : "Unit"}</TableHead>
              <TableHead className="px-4 py-3">{isChinese ? "描述" : "Description"}</TableHead>
              <TableHead className="px-4 py-3 text-right">{isChinese ? "操作" : "Actions"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell className="px-4 py-3">
                  <div className="font-medium text-foreground">
                    {isChinese ? category.labelZh : category.labelEn}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {isChinese ? category.labelEn : category.labelZh}
                  </div>
                </TableCell>
                <TableCell className="px-4 py-3 text-xs text-muted-foreground">
                  {category.code}
                </TableCell>
                <TableCell className="px-4 py-3 text-xs text-muted-foreground">
                  {category.unit ?? "-"}
                </TableCell>
                <TableCell className="px-4 py-3">
                  {category.description ? (
                    <span className="text-sm text-muted-foreground">{category.description}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full px-3"
                      onClick={() => openEditDialog(category)}
                    >
                      {isChinese ? "编辑" : "Edit"}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-full px-3 text-destructive hover:text-destructive"
                        >
                          {isChinese ? "删除" : "Delete"}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            {isChinese ? "确认删除类别" : "Delete category?"}
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            {isChinese
                              ? "删除后无法恢复，请确认该类别未被使用。"
                              : "This action cannot be undone. Make sure the category is not in use."}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>
                            {isChinese ? "取消" : "Cancel"}
                          </AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => handleDelete(category)}
                            disabled={pending}
                          >
                            {isChinese ? "确认删除" : "Delete"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing
                ? isChinese
                  ? "编辑耗材类别"
                  : "Edit Category"
                : isChinese
                  ? "新增耗材类别"
                  : "New Category"}
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
            <form id="consumable-category-form" className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="consumable-category-label-zh">
                    {isChinese ? "中文名称" : "Chinese label"}
                  </Label>
                  <Input
                    id="consumable-category-label-zh"
                    value={formState.labelZh}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, labelZh: event.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="consumable-category-label-en">
                    {isChinese ? "英文名称" : "English label"}
                  </Label>
                  <Input
                    id="consumable-category-label-en"
                    value={formState.labelEn}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, labelEn: event.target.value }))
                    }
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="consumable-category-code">
                  {isChinese ? "类别编码" : "Category code"}
                </Label>
                <Input
                  id="consumable-category-code"
                  value={formState.code}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, code: event.target.value }))
                  }
                  placeholder={isChinese ? "例如：PrinterSupplies" : "e.g. PrinterSupplies"}
                  required
                  disabled={!!editing}
                />
                {editing && (
                  <p className="text-xs text-muted-foreground">
                    {isChinese ? "类别编码不可修改。" : "Code cannot be changed."}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="consumable-category-unit">
                  {isChinese ? "默认计量单位" : "Default unit"}
                </Label>
                <Input
                  id="consumable-category-unit"
                  value={formState.unit}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, unit: event.target.value }))
                  }
                  placeholder={isChinese ? "例如：个/箱" : "e.g. pcs / box"}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="consumable-category-description">
                  {isChinese ? "描述（可选）" : "Description (optional)"}
                </Label>
                <Textarea
                  id="consumable-category-description"
                  rows={3}
                  value={formState.description}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, description: event.target.value }))
                  }
                />
              </div>
            </form>
          </DialogBody>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDialogOpen(false);
                setEditing(null);
              }}
            >
              {isChinese ? "取消" : "Cancel"}
            </Button>
            <Button type="submit" form="consumable-category-form" disabled={pending}>
              {pending
                ? isChinese
                  ? "保存中..."
                  : "Saving..."
                : editing
                  ? isChinese
                    ? "保存变更"
                    : "Save"
                  : isChinese
                    ? "创建类别"
                    : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
});

export default ConsumableCategoryTable;
