"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ReportView, ReportExecutionResult } from "@/lib/types/report";
import { APPROVAL_TYPES } from "@/lib/types/approval";
import { ASSET_STATUSES } from "@/lib/types/asset";

interface CustomReportsClientProps {
  locale: string;
  baseUrl: string;
  initialViews: ReportView[];
}

const ASSET_FIELDS = [
  { key: "id", labelZh: "资产 ID", labelEn: "Asset ID" },
  { key: "name", labelZh: "名称", labelEn: "Name" },
  { key: "category", labelZh: "类别", labelEn: "Category" },
  { key: "status", labelZh: "状态", labelEn: "Status" },
  { key: "owner", labelZh: "使用人", labelEn: "Owner" },
  { key: "location", labelZh: "位置", labelEn: "Location" },
  { key: "purchaseDate", labelZh: "购入日期", labelEn: "Purchase Date" },
];

const APPROVAL_FIELDS = [
  { key: "id", labelZh: "审批 ID", labelEn: "Approval ID" },
  { key: "title", labelZh: "标题", labelEn: "Title" },
  { key: "type", labelZh: "类型", labelEn: "Type" },
  { key: "status", labelZh: "状态", labelEn: "Status" },
  { key: "applicantName", labelZh: "申请人", labelEn: "Applicant" },
  { key: "approverName", labelZh: "审批人", labelEn: "Approver" },
  { key: "updatedAt", labelZh: "更新时间", labelEn: "Updated At" },
];

type FormState = {
  id?: string;
  name: string;
  dataSource: "assets" | "approvals";
  fields: string[];
  filters: Record<string, unknown>;
};

const DEFAULT_FORM: FormState = {
  name: "",
  dataSource: "assets",
  fields: ["id", "name", "category", "status"],
  filters: {},
};

export default function CustomReportsClient({
  locale,
  baseUrl,
  initialViews,
}: CustomReportsClientProps) {
  const isChinese = locale === "zh";
  const [views, setViews] = useState(initialViews);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formState, setFormState] = useState<FormState>(DEFAULT_FORM);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [previewResult, setPreviewResult] = useState<ReportExecutionResult | null>(null);
  const [previewName, setPreviewName] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const fieldsForSource = formState.dataSource === "assets" ? ASSET_FIELDS : APPROVAL_FIELDS;

  const openCreateDialog = () => {
    setFormState(DEFAULT_FORM);
    setError(null);
    setDialogOpen(true);
  };

  const openEditDialog = (view: ReportView) => {
    setFormState({
      id: view.id,
      name: view.name,
      dataSource: view.dataSource,
      fields: view.fields,
      filters: view.filters ?? {},
    });
    setError(null);
    setDialogOpen(true);
  };

  const handleFieldToggle = (key: string) => {
    setFormState((prev) => {
      const nextFields = prev.fields.includes(key)
        ? prev.fields.filter((field) => field !== key)
        : [...prev.fields, key];
      return { ...prev, fields: nextFields };
    });
  };

  const handleFilterChange = (key: string, value: unknown) => {
    setFormState((prev) => ({
      ...prev,
      filters: {
        ...prev.filters,
        [key]: value,
      },
    }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(async () => {
      try {
        if (!formState.name.trim()) {
          throw new Error(
            isChinese ? "请输入报表名称。" : "Please enter a report name.",
          );
        }
        if (formState.fields.length === 0) {
          throw new Error(
            isChinese ? "至少选择一个字段。" : "Please select at least one field.",
          );
        }
        const endpoint = formState.id
          ? `${baseUrl}/apps/asset-hub/api/system/report-views/${formState.id}`
          : `${baseUrl}/apps/asset-hub/api/system/report-views`;
        const response = await fetch(endpoint, {
          method: formState.id ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formState.name.trim(),
            dataSource: formState.dataSource,
            fields: formState.fields,
            filters: formState.filters,
          }),
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.message ?? "保存失败");
        }
        const { data } = payload as { data: ReportView };
        setViews((prev) => {
          const updated = formState.id
            ? prev.map((view) => (view.id === data.id ? data : view))
            : [data, ...prev];
          return updated;
        });
        setDialogOpen(false);
        setFormState(DEFAULT_FORM);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : isChinese
              ? "保存失败，请稍后重试。"
              : "Failed to save report view.",
        );
      }
    });
  };

  const handleDelete = (view: ReportView) => {
    startTransition(async () => {
      try {
        const response = await fetch(
          `${baseUrl}/apps/asset-hub/api/system/report-views/${view.id}`,
          { method: "DELETE" },
        );
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.message ?? "删除失败");
        }
        setViews((prev) => prev.filter((item) => item.id !== view.id));
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : isChinese
              ? "删除失败，请稍后重试。"
              : "Failed to delete report view.",
        );
      }
    });
  };

  const runPreview = async (view: ReportView) => {
    setPreviewLoading(true);
    setPreviewResult(null);
    setPreviewError(null);
    setPreviewName(view.name);
    try {
      const response = await fetch(
        `${baseUrl}/apps/asset-hub/api/system/report-views/${view.id}/run`,
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message ?? "预览失败");
      }
      setPreviewResult(payload.data as ReportExecutionResult);
    } catch (err) {
      setPreviewError(
        err instanceof Error
          ? err.message
          : isChinese
            ? "预览失败，请稍后再试。"
            : "Preview failed. Please try again.",
      );
    } finally {
      setPreviewLoading(false);
    }
  };

  const filterControls = useMemo(() => {
    if (formState.dataSource === "assets") {
      return (
        <>
          <div className="space-y-1.5">
            <Label>{isChinese ? "状态筛选" : "Status Filter"}</Label>
            <div className="grid grid-cols-2 gap-2">
              {ASSET_STATUSES.map((status) => (
                <label key={status} className="flex items-center gap-2 rounded-xl border bg-muted/30 px-3 py-2 text-sm">
                  <Checkbox
                    checked={Array.isArray(formState.filters.status)
                      ? formState.filters.status.includes(status)
                      : false}
                    onCheckedChange={(checked) => {
                      const current = Array.isArray(formState.filters.status)
                        ? [...(formState.filters.status as string[])]
                        : [];
                      const next = checked
                        ? [...current, status]
                        : current.filter((entry) => entry !== status);
                      handleFilterChange("status", next);
                    }}
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
          <div className="space-y-1.5">
            <Label>{isChinese ? "类别关键词" : "Category Filter"}</Label>
            <Input
              value={(formState.filters.category as string) ?? ""}
              onChange={(event) =>
                handleFilterChange("category", event.target.value)
              }
              placeholder={isChinese ? "例如：Laptop" : "e.g. Laptop"}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{isChinese ? "关键词搜索" : "Keyword"}</Label>
            <Input
              value={(formState.filters.search as string) ?? ""}
              onChange={(event) =>
                handleFilterChange("search", event.target.value)
              }
              placeholder={isChinese ? "名称、位置..." : "Name, location..."}
            />
          </div>
        </>
      );
    }

    return (
      <>
        <div className="space-y-1.5">
          <Label>{isChinese ? "状态筛选" : "Status Filter"}</Label>
          <div className="grid grid-cols-2 gap-2">
            {["pending", "approved", "rejected", "cancelled"].map((status) => (
              <label key={status} className="flex items-center gap-2 rounded-xl border bg-muted/30 px-3 py-2 text-sm">
                <Checkbox
                  checked={Array.isArray(formState.filters.status)
                    ? formState.filters.status.includes(status)
                    : false}
                  onCheckedChange={(checked) => {
                    const current = Array.isArray(formState.filters.status)
                      ? [...(formState.filters.status as string[])]
                      : [];
                    const next = checked
                      ? [...current, status]
                      : current.filter((entry) => entry !== status);
                    handleFilterChange("status", next);
                  }}
                />
                <span>{status}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>{isChinese ? "审批类型" : "Approval Type"}</Label>
          <div className="grid grid-cols-2 gap-2">
            {APPROVAL_TYPES.map((type) => (
              <label key={type.value} className="flex items-center gap-2 rounded-xl border bg-muted/30 px-3 py-2 text-sm">
                <Checkbox
                  checked={Array.isArray(formState.filters.type)
                    ? formState.filters.type.includes(type.value)
                    : false}
                  onCheckedChange={(checked) => {
                    const current = Array.isArray(formState.filters.type)
                      ? [...(formState.filters.type as string[])]
                      : [];
                    const next = checked
                      ? [...current, type.value]
                      : current.filter((entry) => entry !== type.value);
                    handleFilterChange("type", next);
                  }}
                />
                <span>{isChinese ? type.labelZh : type.labelEn}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>{isChinese ? "申请人 ID" : "Applicant ID"}</Label>
          <Input
            value={(formState.filters.applicantId as string) ?? ""}
            onChange={(event) =>
              handleFilterChange("applicantId", event.target.value)
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label>{isChinese ? "审批人 ID" : "Approver ID"}</Label>
          <Input
            value={(formState.filters.approverId as string) ?? ""}
            onChange={(event) =>
              handleFilterChange("approverId", event.target.value)
            }
          />
        </div>
      </>
    );
  }, [formState.dataSource, formState.filters, isChinese]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold">
            {isChinese ? "自定义报表视图" : "Custom Report Views"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isChinese
              ? "保存常用的资产或审批报表视图，并随时预览导出。"
              : "Save frequently used asset or approval reports and preview them on demand."}
          </p>
        </div>
        <Button onClick={openCreateDialog} className="rounded-2xl px-4 py-2 text-sm">
          {isChinese ? "新增报表" : "New Report"}
        </Button>
      </div>

      {views.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-muted/30 p-12 text-center text-sm text-muted-foreground">
          {isChinese
            ? "尚未创建任何自定义报表。"
            : "No custom report views yet. Create one to get started."}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {views.map((view) => (
            <div key={view.id} className="flex flex-col gap-3 rounded-2xl border bg-card/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground uppercase">
                    {view.dataSource}
                  </p>
                  <h3 className="text-lg font-semibold">{view.name}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => runPreview(view)}
                    disabled={previewLoading && previewName === view.name}
                  >
                    {isChinese ? "预览" : "Preview"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openEditDialog(view)}>
                    {isChinese ? "编辑" : "Edit"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => handleDelete(view)}
                    disabled={pending}
                  >
                    {isChinese ? "删除" : "Delete"}
                  </Button>
                </div>
              </div>
              <div className="rounded-2xl border border-dashed bg-muted/20 p-3 text-xs text-muted-foreground">
                <p>
                  {isChinese ? "字段：" : "Fields:"} {view.fields.join(", ")}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {formState.id
                ? isChinese
                  ? "编辑报表视图"
                  : "Edit Report View"
                : isChinese
                  ? "新增报表视图"
                  : "New Report View"}
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
            <form id="custom-report-form" className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>{isChinese ? "名称" : "Name"}</Label>
                  <Input
                    value={formState.name}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, name: event.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{isChinese ? "数据源" : "Data Source"}</Label>
                  <Select
                    value={formState.dataSource}
                    onValueChange={(value) =>
                      setFormState((prev) => ({
                        ...prev,
                        dataSource: value as FormState["dataSource"],
                        fields:
                          value === "assets"
                            ? ["id", "name", "category", "status"]
                            : ["id", "title", "status", "updatedAt"],
                        filters: {},
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="assets">
                        {isChinese ? "资产" : "Assets"}
                      </SelectItem>
                      <SelectItem value="approvals">
                        {isChinese ? "审批" : "Approvals"}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{isChinese ? "字段" : "Fields"}</Label>
                <div className="grid gap-2 md:grid-cols-2">
                  {fieldsForSource.map((field) => (
                    <label
                      key={field.key}
                      className="flex items-center gap-2 rounded-xl border bg-muted/30 px-3 py-2 text-sm"
                    >
                      <Checkbox
                        checked={formState.fields.includes(field.key)}
                        onCheckedChange={() => handleFieldToggle(field.key)}
                      />
                      <span>{isChinese ? field.labelZh : field.labelEn}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>{isChinese ? "筛选条件" : "Filters"}</Label>
                <div className="grid gap-3 md:grid-cols-2">{filterControls}</div>
              </div>

              {error && (
                <div className="rounded-2xl border border-destructive/40 bg-destructive/5 px-4 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}
            </form>
          </DialogBody>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDialogOpen(false);
                setFormState(DEFAULT_FORM);
                setError(null);
              }}
            >
              {isChinese ? "取消" : "Cancel"}
            </Button>
            <Button type="submit" form="custom-report-form" disabled={pending}>
              {pending
                ? isChinese
                  ? "保存中..."
                  : "Saving..."
                : formState.id
                  ? isChinese
                    ? "保存变更"
                    : "Save"
                  : isChinese
                    ? "创建报表"
                    : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {previewName && (
        <Dialog open={!!previewName} onOpenChange={(open) => !open && setPreviewName(null)}>
          <DialogContent className="sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle>
                {isChinese ? "报表预览：" : "Preview:"} {previewName}
              </DialogTitle>
            </DialogHeader>
            <DialogBody className="space-y-3">
              {previewLoading && (
                <p className="text-sm text-muted-foreground">
                  {isChinese ? "正在生成预览..." : "Generating preview..."}
                </p>
              )}
              {previewError && (
                <p className="text-sm text-destructive">{previewError}</p>
              )}
              {previewResult && !previewLoading && (
                <ScrollArea className="max-h-[420px]">
                  <Table className="text-sm">
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        {previewResult.columns.map((column) => (
                          <TableHead key={column} className="px-3 py-2">
                            {column}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewResult.rows.map((row, index) => (
                        <TableRow key={`${previewName}-${index}`}>
                          {previewResult.columns.map((column) => (
                            <TableCell key={`${column}-${index}`} className="px-3 py-2">
                              {String(row[column] ?? "-")}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </DialogBody>
            <DialogFooter>
              <Button onClick={() => setPreviewName(null)}>
                {isChinese ? "关闭" : "Close"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

