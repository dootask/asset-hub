
"use client";

import { useMemo, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Code2, Plus, RefreshCw, Trash2 } from "lucide-react";
import type {
  OperationTemplate,
  OperationTemplateFieldWidget,
} from "@/lib/types/operation-template";
import type { ActionConfig } from "@/lib/types/action-config";
import type { OperationStats } from "@/lib/repositories/asset-operations";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { operationTypeToActionConfigId } from "@/lib/utils/action-config";
import {
  OPERATION_FIELD_LIBRARY,
  OPERATION_FIELD_WIDGET_OPTIONS,
  buildFieldDraftsFromTemplate,
  buildFieldDraftsFromValue,
  buildMetadataFromFieldDrafts,
  createCustomFieldDraft,
  createFieldDraftFromLibrary,
  getRecommendedFieldDrafts,
  type OperationFieldDraft,
} from "@/lib/config/operation-template-fields";

interface Props {
  templates: OperationTemplate[];
  locale?: string;
  actionConfigs: ActionConfig[];
  stats: OperationStats[];
}

const FIELD_LIBRARY_OPTIONS = Object.values(OPERATION_FIELD_LIBRARY);

const WIDGET_LABELS: Record<
  OperationTemplateFieldWidget,
  { zh: string; en: string }
> = {
  text: { zh: "单行文本", en: "Text" },
  textarea: { zh: "多行文本", en: "Textarea" },
  number: { zh: "数字", en: "Number" },
  date: { zh: "日期", en: "Date" },
  attachments: { zh: "附件", en: "Attachments" },
};

export default function OperationTemplateList({
  templates,
  locale = "en",
  actionConfigs,
  stats,
}: Props) {
  const isChinese = locale === "zh";
  const [items, setItems] = useState(() => templates);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [fieldDrafts, setFieldDrafts] = useState<Record<string, OperationFieldDraft[]>>(
    () =>
      templates.reduce<Record<string, OperationFieldDraft[]>>((acc, template) => {
        acc[template.type] = buildFieldDraftsFromTemplate(template);
        return acc;
      }, {}),
  );
  const [jsonDrafts, setJsonDrafts] = useState<Record<string, string>>(() =>
    templates.reduce<Record<string, string>>((acc, template) => {
      const drafts = buildFieldDraftsFromTemplate(template);
      acc[template.type] = stringifyMetadata(drafts);
      return acc;
    }, {}),
  );
  const [jsonDirtyMap, setJsonDirtyMap] = useState<Record<string, boolean>>({});
  const [jsonErrors, setJsonErrors] = useState<Record<string, string | null>>({});
  const [jsonPanelOpen, setJsonPanelOpen] = useState<Record<string, boolean>>({});
  const [librarySelections, setLibrarySelections] = useState<Record<string, string>>(
    () =>
      templates.reduce<Record<string, string>>((acc, template) => {
        acc[template.type] = "";
        return acc;
      }, {}),
  );

  const configMap = useMemo(() => {
    const map = new Map<string, ActionConfig>();
    actionConfigs.forEach((config) => map.set(config.id, config));
    return map;
  }, [actionConfigs]);

  const statsMap = useMemo(() => {
    const map = new Map<string, OperationStats>();
    stats.forEach((entry) => map.set(entry.type, entry));
    return map;
  }, [stats]);

  const handleTemplateChange = (
    type: OperationTemplate["type"],
    partial: Partial<OperationTemplate>,
  ) => {
    setItems((prev) =>
      prev.map((item) => (item.type === type ? { ...item, ...partial } : item)),
    );
  };

  const applyDraftChange = (
    type: OperationTemplate["type"],
    nextDrafts: OperationFieldDraft[],
  ) => {
    setFieldDrafts((prev) => ({ ...prev, [type]: nextDrafts }));
    if (!jsonDirtyMap[type]) {
      setJsonDrafts((prev) => ({ ...prev, [type]: stringifyMetadata(nextDrafts) }));
    }
  };

  const handleFieldChange = (
    type: OperationTemplate["type"],
    index: number,
    patch: Partial<Omit<OperationFieldDraft, "source">>,
  ) => {
    const drafts = fieldDrafts[type] ?? [];
    const nextDrafts = drafts.map((field, idx) =>
      idx === index ? { ...field, ...patch } : field,
    );
    applyDraftChange(type, nextDrafts);
  };

  const handleRemoveField = (type: OperationTemplate["type"], index: number) => {
    const drafts = fieldDrafts[type] ?? [];
    const next = drafts.filter((_, idx) => idx !== index);
    applyDraftChange(type, next);
  };

  const handleMoveField = (
    type: OperationTemplate["type"],
    index: number,
    delta: 1 | -1,
  ) => {
    const drafts = fieldDrafts[type] ?? [];
    const target = index + delta;
    if (target < 0 || target >= drafts.length) {
      return;
    }
    const next = [...drafts];
    const [removed] = next.splice(index, 1);
    next.splice(target, 0, removed);
    applyDraftChange(type, next);
  };

  const handleAddLibraryField = (type: OperationTemplate["type"]) => {
    const chosen = librarySelections[type];
    if (!chosen) {
      return;
    }
    const drafts = fieldDrafts[type] ?? [];
    if (drafts.some((field) => field.key === chosen)) {
      setError(
        isChinese ? "该字段已在列表中。" : "The selected field is already added.",
      );
      return;
    }
    const nextField = createFieldDraftFromLibrary(chosen);
    if (!nextField) {
      setError(isChinese ? "无法加载该字段。" : "Unable to load the selected field.");
      return;
    }
    setError(null);
    applyDraftChange(type, [...drafts, nextField]);
    setLibrarySelections((prev) => ({ ...prev, [type]: "" }));
  };

  const handleAddCustomField = (type: OperationTemplate["type"]) => {
    const drafts = fieldDrafts[type] ?? [];
    const key = generateCustomFieldKey(drafts);
    applyDraftChange(type, [...drafts, createCustomFieldDraft(key)]);
    setError(null);
  };

  const handleUseRecommended = (type: OperationTemplate["type"]) => {
    const drafts = getRecommendedFieldDrafts(type);
    if (!drafts.length) {
      setError(
        isChinese
          ? "当前操作类型暂无推荐字段。"
          : "No recommended fields for this operation.",
      );
      return;
    }
    setError(null);
    applyDraftChange(type, drafts);
  };

  const handleJsonToggle = (type: OperationTemplate["type"]) => {
    setJsonPanelOpen((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  const handleJsonChange = (type: OperationTemplate["type"], value: string) => {
    setJsonDrafts((prev) => ({ ...prev, [type]: value }));
    setJsonDirtyMap((prev) => ({ ...prev, [type]: true }));
  };

  const handleJsonReset = (type: OperationTemplate["type"]) => {
    const drafts = fieldDrafts[type] ?? [];
    setJsonDrafts((prev) => ({ ...prev, [type]: stringifyMetadata(drafts) }));
    setJsonDirtyMap((prev) => ({ ...prev, [type]: false }));
    setJsonErrors((prev) => ({ ...prev, [type]: null }));
  };

  const handleApplyJson = (template: OperationTemplate) => {
    const raw = (jsonDrafts[template.type] ?? "").trim();
    let parsed: unknown = null;
    if (raw) {
      try {
        parsed = JSON.parse(raw);
      } catch {
        setJsonErrors((prev) => ({
          ...prev,
          [template.type]: isChinese ? "JSON 格式不正确。" : "Invalid JSON structure.",
        }));
        return;
      }
    }
    setJsonErrors((prev) => ({ ...prev, [template.type]: null }));
    const drafts = buildFieldDraftsFromValue(template.type, parsed);
    applyDraftChange(template.type, drafts);
    const normalized = stringifyMetadata(drafts);
    setJsonDrafts((prev) => ({ ...prev, [template.type]: normalized }));
    setJsonDirtyMap((prev) => ({ ...prev, [template.type]: false }));
  };

  const handleSave = (template: OperationTemplate) => {
    const drafts = fieldDrafts[template.type] ?? [];
    const sanitizedDrafts = drafts.map(sanitizeDraft);
    const validationError = validateFieldDrafts(sanitizedDrafts, isChinese);
    if (validationError) {
      setError(validationError);
      return;
    }
    const metadataPayload = buildMetadataFromFieldDrafts(sanitizedDrafts);

    setPendingId(template.type);
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch(
          `/apps/asset-hub/api/config/operations/${template.type}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              descriptionZh: template.descriptionZh,
              descriptionEn: template.descriptionEn,
              requireAttachment: template.requireAttachment,
              metadata: metadataPayload,
            }),
          },
        );
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.message ?? "保存失败，请稍后重试。");
        }
        const { data } = (await response.json()) as { data: OperationTemplate };
        setItems((prev) => prev.map((item) => (item.type === data.type ? data : item)));
        const refreshedDrafts = buildFieldDraftsFromTemplate(data);
        setFieldDrafts((prev) => ({ ...prev, [data.type]: refreshedDrafts }));
        setJsonDrafts((prev) => ({
          ...prev,
          [data.type]: stringifyMetadata(refreshedDrafts),
        }));
        setJsonDirtyMap((prev) => ({ ...prev, [data.type]: false }));
        setJsonErrors((prev) => ({ ...prev, [data.type]: null }));
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : isChinese
              ? "保存失败，请稍后重试。"
              : "Failed to save template.",
        );
      } finally {
        setPendingId(null);
      }
    });
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      {items.length === 0 && (
        <div className="rounded-3xl border border-dashed border-muted-foreground/40 bg-muted/20 p-6 text-sm text-muted-foreground">
          {isChinese
            ? "尚未配置任何操作模板。"
            : "No operation templates configured yet."}
        </div>
      )}
      {items.length > 0 && (
        <Accordion
          type="multiple"
          className="divide-y divide-border overflow-hidden rounded-3xl border bg-card/30"
          defaultValue={items.length ? [items[0].id] : undefined}
        >
          {items.map((template) => {
            const drafts = fieldDrafts[template.type] ?? [];
            const selectedLibraryKey = librarySelections[template.type] ?? "";
            const jsonDraft = jsonDrafts[template.type] ?? "";
            const isJsonDirty = jsonDirtyMap[template.type] ?? false;
            const jsonError = jsonErrors[template.type];
            const advancedOpen = jsonPanelOpen[template.type] ?? false;
            const config = configMap.get(
              operationTypeToActionConfigId(template.type),
            );
            const stat = statsMap.get(template.type);
            const summaryDescription = isChinese
              ? template.descriptionZh ?? template.descriptionEn
              : template.descriptionEn ?? template.descriptionZh;

            return (
              <AccordionItem
                key={template.id}
                value={template.id}
                className="border-0 px-2"
              >
                <AccordionTrigger className="py-4">
                  <div className="flex w-full flex-col gap-2 text-left sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        {template.type}
                      </p>
                      <p className="text-base font-semibold">
                        {isChinese ? template.labelZh : template.labelEn}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {summaryDescription ??
                          (isChinese ? "暂未添加描述" : "No description yet.")}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1 text-xs text-muted-foreground sm:text-right">
                      <span>
                        {isChinese ? "审批：" : "Approval:"}{" "}
                        {config
                          ? config.requiresApproval
                            ? isChinese
                              ? "需要审批"
                              : "Required"
                            : isChinese
                              ? "无需审批"
                              : "Optional"
                          : isChinese
                            ? "未配置"
                            : "Not configured"}
                      </span>
                      <span>
                        {isChinese ? "字段数量：" : "Field count:"} {drafts.length}
                      </span>
                      <span>
                        {stat
                          ? isChinese
                            ? `累计 ${stat.total} 次操作`
                            : `${stat.total} total operations`
                          : isChinese
                            ? "暂无操作数据"
                            : "No usage data"}
                      </span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-2">
                  <div className="rounded-3xl border bg-card/70 p-5 shadow-sm">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          {template.type}
                        </p>
                        <h2 className="text-lg font-semibold">
                          {isChinese ? template.labelZh : template.labelEn}
                        </h2>
                      </div>
                      <Button
                        type="button"
                        className="rounded-2xl px-4 py-2 text-sm"
                        disabled={isPending && pendingId === template.type}
                        onClick={() => handleSave(template)}
                      >
                        {isPending && pendingId === template.type
                          ? isChinese
                            ? "保存中..."
                            : "Saving..."
                          : isChinese
                            ? "保存配置"
                            : "Save"}
                      </Button>
                    </div>
                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">
                          {isChinese ? "说明（中文）" : "Description (ZH)"}
                        </Label>
                        <Textarea
                          rows={3}
                          value={template.descriptionZh ?? ""}
                          onChange={(event) =>
                            handleTemplateChange(template.type, {
                              descriptionZh: event.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">
                          {isChinese ? "说明（英文）" : "Description (EN)"}
                        </Label>
                        <Textarea
                          rows={3}
                          value={template.descriptionEn ?? ""}
                          onChange={(event) =>
                            handleTemplateChange(template.type, {
                              descriptionEn: event.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="mt-4 grid gap-4 lg:grid-cols-[1fr,1fr,2fr]">
                      <div className="rounded-2xl border bg-muted/20 px-4 py-3 text-sm">
                        <p className="font-semibold">
                          {isChinese ? "审批策略" : "Approval Policy"}
                        </p>
                        {config ? (
                          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                            <p>
                              {isChinese ? "需要审批：" : "Requires approval:"}{" "}
                              {config.requiresApproval
                                ? isChinese
                                  ? "是"
                                  : "Yes"
                                : isChinese
                                  ? "否"
                                  : "No"}
                            </p>
                            <p>
                              {isChinese ? "允许修改审批人：" : "Override allowed:"}{" "}
                              {config.allowOverride
                                ? isChinese
                                  ? "是"
                                  : "Yes"
                                : isChinese
                                  ? "否"
                                  : "No"}
                            </p>
                            {config.defaultApproverType !== "none" && (
                              <p>
                                {isChinese ? "默认审批人：" : "Default approver:"}{" "}
                                {config.defaultApproverRefs.join(", ") || "-"}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            {isChinese ? "暂无配置" : "No configuration yet."}
                          </p>
                        )}
                      </div>
                      <div className="rounded-2xl border bg-muted/20 px-4 py-3 text-sm">
                        <p className="font-semibold">
                          {isChinese ? "使用统计（全部资产）" : "Usage (all assets)"}
                        </p>
                        {stat ? (
                          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                            <p>
                              {isChinese ? "累计操作：" : "Total operations:"}{" "}
                              {stat.total}
                            </p>
                            <p>
                              {isChinese ? "进行中：" : "Pending:"} {stat.pending}
                            </p>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            {isChinese ? "暂无数据" : "No data yet."}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center justify-between rounded-2xl border bg-muted/30 px-4 py-3">
                        <div>
                          <p className="text-sm font-medium">
                            {isChinese ? "需要附件" : "Require attachment"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {isChinese
                              ? "启用后在提交操作或审批时需要上传附件。"
                              : "If enabled, attachments become mandatory when submitting operations or approvals."}
                          </p>
                        </div>
                        <Switch
                          checked={template.requireAttachment}
                          onCheckedChange={(checked) =>
                            handleTemplateChange(template.type, { requireAttachment: checked })
                          }
                        />
                      </div>
                    </div>
                    <div className="mt-6 space-y-4">
                      <div className="space-y-3 rounded-3xl border bg-muted/30 p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <p className="text-sm font-semibold">
                              {isChinese ? "字段构建器" : "Field builder"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {isChinese
                                ? "从字段库选择或创建自定义字段，组成 OperationForm 表单。"
                                : "Pick fields from the library or create custom ones for the OperationForm."}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Select
                              value={selectedLibraryKey || undefined}
                              onValueChange={(value) =>
                                setLibrarySelections((prev) => ({ ...prev, [template.type]: value }))
                              }
                            >
                              <SelectTrigger className="w-[220px]">
                                <SelectValue
                                  placeholder={
                                    isChinese ? "选择内置字段" : "Select a library field"
                                  }
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {FIELD_LIBRARY_OPTIONS.map((field) => {
                                  const disabled = drafts.some(
                                    (entry) => entry.key === field.key,
                                  );
                                  return (
                                    <SelectItem
                                      key={field.key}
                                      value={field.key}
                                      disabled={disabled}
                                    >
                                      {(isChinese ? field.labelZh : field.labelEn) ?? field.key}
                                      {" · "}
                                      {field.key}
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                            <Button
                              type="button"
                              size="sm"
                              className="rounded-2xl"
                              onClick={() => handleAddLibraryField(template.type)}
                              disabled={!selectedLibraryKey}
                            >
                              <Plus className="mr-1 h-3.5 w-3.5" />
                              {isChinese ? "添加字段" : "Add field"}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="rounded-2xl"
                              onClick={() => handleAddCustomField(template.type)}
                            >
                              {isChinese ? "新增自定义" : "Add custom"}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="rounded-2xl"
                              onClick={() => handleUseRecommended(template.type)}
                            >
                              {isChinese ? "使用推荐字段" : "Use recommended"}
                            </Button>
                          </div>
                        </div>
                {drafts.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-muted-foreground/50 bg-background/40 px-4 py-6 text-center text-sm text-muted-foreground">
                    <p>
                      {isChinese
                        ? "尚未配置字段，可点击“使用推荐字段”快速开始。"
                        : "No fields yet. Use the recommended template to get started quickly."}
                    </p>
                  </div>
                ) : (
                  <Accordion
                    type="multiple"
                    className="divide-y divide-muted-foreground/30 rounded-2xl border"
                    defaultValue={drafts.length ? [`${template.id}-${drafts[0].key}-0`] : undefined}
                  >
                    {drafts.map((field, index) => (
                      <AccordionItem
                        key={`${template.id}-${field.key}-${index}`}
                        value={`${template.id}-${field.key}-${index}`}
                        className="border-0 px-2"
                      >
                        <AccordionTrigger className="py-3">
                          <FieldSummary field={field} isChinese={isChinese} />
                        </AccordionTrigger>
                        <AccordionContent className="px-1">
                          <div className="rounded-2xl border bg-background/70 p-4">
                            <div className="mb-3 flex items-center justify-end gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleMoveField(template.type, index, -1)}
                                disabled={index === 0}
                              >
                                <ArrowUp className="h-4 w-4" />
                                <span className="sr-only">
                                  {isChinese ? "上移字段" : "Move field up"}
                                </span>
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleMoveField(template.type, index, 1)}
                                disabled={index === drafts.length - 1}
                              >
                                <ArrowDown className="h-4 w-4" />
                                <span className="sr-only">
                                  {isChinese ? "下移字段" : "Move field down"}
                                </span>
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => handleRemoveField(template.type, index)}
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">
                                  {isChinese ? "移除字段" : "Remove field"}
                                </span>
                              </Button>
                            </div>
                            <FieldForm
                              field={field}
                              isChinese={isChinese}
                              onChange={(patch) =>
                                handleFieldChange(template.type, index, patch)
                              }
                            />
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
                      </div>
                      <div className="rounded-3xl border bg-muted/20 p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold">
                              {isChinese ? "高级 JSON 配置" : "Advanced JSON editor"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {isChinese
                                ? "仅在需要时编辑 JSON，修改后需点击“应用 JSON”同步。"
                                : "Edit JSON only when needed and click “Apply JSON” to sync changes."}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="rounded-2xl"
                            onClick={() => handleJsonToggle(template.type)}
                          >
                            <Code2 className="mr-1.5 h-4 w-4" />
                            {advancedOpen
                              ? isChinese
                                ? "收起"
                                : "Collapse"
                              : isChinese
                                ? "展开"
                                : "Expand"}
                          </Button>
                        </div>
                        {advancedOpen && (
                          <div className="mt-3 space-y-3">
                            <Textarea
                              rows={8}
                              spellCheck={false}
                              className="font-mono text-xs"
                              value={jsonDraft}
                              onChange={(event) =>
                                handleJsonChange(template.type, event.target.value)
                              }
                            />
                            {isJsonDirty && (
                              <p className="text-xs font-medium text-amber-600">
                                {isChinese
                                  ? "JSON 已修改但尚未应用。"
                                  : "JSON changes are not applied yet."}
                              </p>
                            )}
                            {jsonError && (
                              <p className="text-xs text-destructive">{jsonError}</p>
                            )}
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                size="sm"
                                className="rounded-2xl"
                                onClick={() => handleApplyJson(template)}
                              >
                                {isChinese ? "应用 JSON" : "Apply JSON"}
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="rounded-2xl"
                                onClick={() => handleJsonReset(template.type)}
                              >
                                <RefreshCw className="mr-1.5 h-4 w-4" />
                                {isChinese ? "恢复当前配置" : "Reset to builder"}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

    </div>
  );
}

interface FieldSummaryProps {
  field: OperationFieldDraft;
  isChinese: boolean;
}

function FieldSummary({ field, isChinese }: FieldSummaryProps) {
  const widgetLabel = WIDGET_LABELS[field.widget];
  const isLibrary = field.source === "library";
  const hasOverride = isLibrary && isLibraryFieldOverridden(field);
  const displayName = (isChinese ? field.labelZh : field.labelEn) || field.key;

  return (
    <div className="w-full text-left">
      <p className="text-sm font-semibold">{displayName}</p>
      <p className="text-xs text-muted-foreground">
        {field.key} · {isChinese ? widgetLabel.zh : widgetLabel.en}
        {field.required
          ? isChinese
            ? " · 必填"
            : " · Required"
          : ""}
      </p>
      <div className="mt-1 flex flex-wrap gap-2">
        <Badge variant="secondary">
          {isLibrary
            ? isChinese
              ? "内置字段"
              : "Library field"
            : isChinese
              ? "自定义字段"
              : "Custom field"}
        </Badge>
        {hasOverride && (
          <Badge variant="outline">
            {isChinese ? "已修改" : "Overridden"}
          </Badge>
        )}
      </div>
    </div>
  );
}

interface FieldFormProps {
  field: OperationFieldDraft;
  isChinese: boolean;
  onChange: (patch: Partial<Omit<OperationFieldDraft, "source">>) => void;
}

function FieldForm({ field, isChinese, onChange }: FieldFormProps) {
  const isLibrary = field.source === "library";

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {!isLibrary && (
        <div className="space-y-1.5 md:col-span-2">
          <Label className="text-xs text-muted-foreground">
            {isChinese ? "字段 Key" : "Field key"}
          </Label>
          <Input
            value={field.key}
            onChange={(event) => onChange({ key: event.target.value })}
          />
        </div>
      )}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">
          {isChinese ? "字段名称（中文）" : "Label (ZH)"}
        </Label>
        <Input
          value={field.labelZh}
          onChange={(event) => onChange({ labelZh: event.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">
          {isChinese ? "字段名称（英文）" : "Label (EN)"}
        </Label>
        <Input
          value={field.labelEn}
          onChange={(event) => onChange({ labelEn: event.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">
          {isChinese ? "控件类型" : "Widget"}
        </Label>
        <Select
          value={field.widget}
          onValueChange={(value) =>
            onChange({ widget: value as OperationTemplateFieldWidget })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OPERATION_FIELD_WIDGET_OPTIONS.map((widget) => (
              <SelectItem key={widget} value={widget}>
                {isChinese ? WIDGET_LABELS[widget].zh : WIDGET_LABELS[widget].en}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center justify-between rounded-2xl border bg-muted/10 px-4 py-2">
        <span className="text-xs text-muted-foreground">
          {isChinese ? "必填" : "Required"}
        </span>
        <Switch
          checked={Boolean(field.required)}
          onCheckedChange={(checked) => onChange({ required: checked })}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">
          {isChinese ? "占位（中文）" : "Placeholder (ZH)"}
        </Label>
        <Input
          value={field.placeholderZh ?? ""}
          onChange={(event) => onChange({ placeholderZh: event.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">
          {isChinese ? "占位（英文）" : "Placeholder (EN)"}
        </Label>
        <Input
          value={field.placeholderEn ?? ""}
          onChange={(event) => onChange({ placeholderEn: event.target.value })}
        />
      </div>
      <div className="space-y-1.5 md:col-span-2">
        <Label className="text-xs text-muted-foreground">
          {isChinese ? "辅助说明（中文）" : "Helper text (ZH)"}
        </Label>
        <Textarea
          rows={2}
          value={field.helperZh ?? ""}
          onChange={(event) => onChange({ helperZh: event.target.value })}
        />
      </div>
      <div className="space-y-1.5 md:col-span-2">
        <Label className="text-xs text-muted-foreground">
          {isChinese ? "辅助说明（英文）" : "Helper text (EN)"}
        </Label>
        <Textarea
          rows={2}
          value={field.helperEn ?? ""}
          onChange={(event) => onChange({ helperEn: event.target.value })}
        />
      </div>
    </div>
  );
}

function generateCustomFieldKey(drafts: OperationFieldDraft[]) {
  const existing = new Set(drafts.map((field) => field.key));
  let index = drafts.length + 1;
  let key = `custom_${index}`;
  while (existing.has(key)) {
    index += 1;
    key = `custom_${index}`;
  }
  return key;
}

function normalizeOptional(value?: string | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

function sanitizeDraft(field: OperationFieldDraft): OperationFieldDraft {
  return {
    ...field,
    key: field.key.trim(),
    labelZh: field.labelZh.trim(),
    labelEn: field.labelEn.trim(),
    placeholderZh: normalizeOptional(field.placeholderZh),
    placeholderEn: normalizeOptional(field.placeholderEn),
    helperZh: normalizeOptional(field.helperZh),
    helperEn: normalizeOptional(field.helperEn),
  };
}

function validateFieldDrafts(
  drafts: OperationFieldDraft[],
  isChinese: boolean,
): string | null {
  const seen = new Set<string>();
  for (const field of drafts) {
    if (!field.key) {
      return isChinese ? "字段 key 不能为空。" : "Field key is required.";
    }
    if (seen.has(field.key)) {
      return isChinese
        ? `字段 key “${field.key}” 重复。`
        : `Field key "${field.key}" is duplicated.`;
    }
    seen.add(field.key);
    if (!field.labelZh || !field.labelEn) {
      return isChinese
        ? `字段 ${field.key} 需要中英文标题。`
        : `Field ${field.key} requires both Chinese and English labels.`;
    }
  }
  return null;
}

function stringifyMetadata(drafts: OperationFieldDraft[]): string {
  const metadata = buildMetadataFromFieldDrafts(drafts.map(sanitizeDraft));
  return metadata ? JSON.stringify(metadata, null, 2) : "";
}

function isLibraryFieldOverridden(field: OperationFieldDraft): boolean {
  if (field.source !== "library") {
    return false;
  }
  const lib = OPERATION_FIELD_LIBRARY[field.key];
  if (!lib) return false;

  return !(
    (lib.labelZh ?? lib.key) === (field.labelZh ?? field.key) &&
    (lib.labelEn ?? lib.key) === (field.labelEn ?? field.key) &&
    normalizeOptional(lib.placeholderZh) === normalizeOptional(field.placeholderZh) &&
    normalizeOptional(lib.placeholderEn) === normalizeOptional(field.placeholderEn) &&
    normalizeOptional(lib.helperZh) === normalizeOptional(field.helperZh) &&
    normalizeOptional(lib.helperEn) === normalizeOptional(field.helperEn) &&
    Boolean(lib.required) === Boolean(field.required) &&
    lib.widget === field.widget
  );
}
