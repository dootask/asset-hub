"use client";

import { forwardRef, useCallback, useImperativeHandle, useMemo, useState, useTransition } from "react";
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
import type { AssetCategory } from "@/lib/types/asset-category";
import { useAppFeedback } from "@/components/providers/feedback-provider";

export interface AssetCategoryTableHandle {
  openCreateDialog: () => void;
}

interface Props {
  initialCategories: AssetCategory[];
  locale?: string;
  baseUrl?: string;
}

type FormState = {
  labelZh: string;
  labelEn: string;
  code: string;
  description: string;
  color: string;
};

const DEFAULT_FORM: FormState = {
  labelZh: "",
  labelEn: "",
  code: "",
  description: "",
  color: "",
};

const AssetCategoryTable = forwardRef<AssetCategoryTableHandle, Props>(function AssetCategoryTable(
  { initialCategories, locale = "en", baseUrl = "" }: Props,
  ref,
) {
  const [categories, setCategories] = useState(initialCategories);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AssetCategory | null>(null);
  const [formState, setFormState] = useState<FormState>(DEFAULT_FORM);
  const [search, setSearch] = useState("");
  const [pending, startTransition] = useTransition();
  const isChinese = locale === "zh";
  const feedback = useAppFeedback();

  const displayedCategories = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const filtered = categories.filter((category) => {
      if (!normalizedSearch) {
        return true;
      }
      const target = `${category.labelZh} ${category.labelEn} ${category.code}`.toLowerCase();
      return target.includes(normalizedSearch);
    });
    return filtered.sort((a, b) => {
      const labelA = (isChinese ? a.labelZh : a.labelEn).toLowerCase();
      const labelB = (isChinese ? b.labelZh : b.labelEn).toLowerCase();
      return labelA.localeCompare(labelB);
    });
  }, [categories, isChinese, search]);

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

  const openEditDialog = useCallback((category: AssetCategory) => {
    setEditing(category);
    setFormState({
      labelZh: category.labelZh,
      labelEn: category.labelEn,
      code: category.code,
      description: category.description ?? "",
      color: category.color ?? "",
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
          color: formState.color.trim() || undefined,
        };
        let response: Response;
        if (editing) {
          response = await fetch(
            `${baseUrl}/apps/asset-hub/api/assets/categories/${editing.id}`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            },
          );
        } else {
          response = await fetch(`${baseUrl}/apps/asset-hub/api/assets/categories`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...payload,
              code: formState.code.trim() || undefined,
            }),
          });
        }

        if (!response.ok) {
          const message = await response.json().catch(() => null);
          throw new Error(message?.message ?? "操作失败，请稍后重试。");
        }

        const { data } = (await response.json()) as { data: AssetCategory };
        setCategories((prev) => {
          if (editing) {
            return prev.map((item) => (item.id === data.id ? data : item));
          }
          return [...prev, data];
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

  const handleDelete = (category: AssetCategory) => {
    startTransition(async () => {
      try {
        const response = await fetch(
          `${baseUrl}/apps/asset-hub/api/assets/categories/${category.id}`,
          {
            method: "DELETE",
          },
        );
        if (!response.ok) {
          const message = await response.json().catch(() => null);
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

  const renderColor = (color?: string | null) => {
    if (!color) {
      return <span className="text-xs text-muted-foreground">-</span>;
    }
    return (
      <span className="inline-flex items-center gap-2 text-sm font-medium">
        <span
          aria-hidden
          className="h-4 w-4 rounded-full border"
          style={{ backgroundColor: color }}
        />
        {color}
      </span>
    );
  };

  return (
    <>
      <div className="rounded-2xl border bg-muted/20 p-3 text-sm text-muted-foreground md:flex md:items-center md:justify-between">
        <p>
          {isChinese
            ? `共 ${categories.length} 个类别`
            : `${categories.length} categories`}
        </p>
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={isChinese ? "搜索名称或编码" : "Search name or code"}
          className="mt-2 md:mt-0 md:w-64"
        />
      </div>

      {displayedCategories.length === 0 ? (
        <div className="rounded-2xl border bg-muted/30 p-12 text-center text-sm text-muted-foreground">
          {categories.length === 0 && !search.trim()
            ? isChinese
              ? "尚未创建任何资产类别。"
              : "No categories yet. Create one to get started."
            : isChinese
              ? "没有匹配的类别，请调整搜索条件。"
              : "No categories match the current search."}
        </div>
      ) : (
        <section className="overflow-hidden rounded-2xl border bg-card">
          <Table className="text-sm">
            <TableHeader className="bg-muted/30">
              <TableRow className="text-xs uppercase tracking-wide text-muted-foreground">
                <TableHead className="px-4 py-3">
                  {isChinese ? "显示名称" : "Display Name"}
                </TableHead>
                <TableHead className="px-4 py-3">Code</TableHead>
                <TableHead className="px-4 py-3">
                  {isChinese ? "描述" : "Description"}
                </TableHead>
                <TableHead className="px-4 py-3">
                  {isChinese ? "颜色" : "Color"}
                </TableHead>
                <TableHead className="px-4 py-3 text-right">
                  {isChinese ? "操作" : "Actions"}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedCategories.map((category) => (
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
                  <TableCell className="px-4 py-3">
                    {category.description ? (
                      <span className="text-sm text-muted-foreground">
                        {category.description}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-3">{renderColor(category.color)}</TableCell>
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
                                ? "删除后无法恢复，且该类别必须未被资产使用。"
                                : "This action cannot be undone and the category must not be in use."}
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
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing
                ? isChinese
                  ? "编辑资产类别"
                  : "Edit Category"
                : isChinese
                  ? "新增资产类别"
                  : "New Category"}
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
            <form id="asset-category-form" className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="category-label-zh">
                    {isChinese ? "中文名称" : "Chinese Label"}
                  </Label>
                  <Input
                    id="category-label-zh"
                    value={formState.labelZh}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        labelZh: event.target.value,
                      }))
                    }
                    required
                    placeholder="笔记本电脑"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="category-label-en">
                    {isChinese ? "英文名称" : "English Label"}
                  </Label>
                  <Input
                    id="category-label-en"
                    value={formState.labelEn}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        labelEn: event.target.value,
                      }))
                    }
                    required
                    placeholder="Laptop"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="category-code">
                  {isChinese ? "类别编码" : "Category Code"}
                </Label>
                <Input
                  id="category-code"
                  value={formState.code}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, code: event.target.value }))
                  }
                  placeholder={isChinese ? "留空则自动生成" : "Leave empty to auto-generate"}
                  disabled={!!editing}
                />
                {editing && (
                  <p className="text-xs text-muted-foreground">
                    {isChinese
                      ? "类别编码用于资产记录引用，不可修改。"
                      : "Code is referenced by assets and cannot be changed."}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="category-description">
                  {isChinese ? "描述" : "Description"}
                </Label>
                <Textarea
                  id="category-description"
                  rows={3}
                  value={formState.description}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="category-color">
                  {isChinese ? "颜色（可选）" : "Color (optional)"}
                </Label>
                <Input
                  id="category-color"
                  type="text"
                  placeholder="#2563eb"
                  value={formState.color}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, color: event.target.value }))
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
            <Button type="submit" form="asset-category-form" disabled={pending}>
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

export default AssetCategoryTable;
