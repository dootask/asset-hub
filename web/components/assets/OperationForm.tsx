 "use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  deriveOperationTemplateFields,
  normalizeOperationTypeToTemplateType,
} from "@/lib/config/operation-template-fields";
import type {
  OperationTemplate,
  OperationTemplateField,
  OperationTemplateFieldValue,
  OperationTemplateMetadata,
  OperationTemplateSnapshot,
} from "@/lib/types/operation-template";
import {
  getOperationTypeLabel,
  OPERATION_TYPES,
  type AssetOperationType,
} from "@/lib/types/operation";

interface Props {
  assetId: string;
  locale?: string;
  templates?: OperationTemplate[];
}

export default function OperationForm({
  assetId,
  locale = "en",
  templates = [],
}: Props) {
  const router = useRouter();
  const isChinese = locale === "zh";
  const templateMap = useMemo(() => {
    return templates.reduce((map, template) => {
      map.set(template.type, template);
      return map;
    }, new Map<OperationTemplate["type"], OperationTemplate>());
  }, [templates]);

  const preferredDefaultType: AssetOperationType =
    (templateMap.has("receive")
      ? "receive"
      : templateMap.has("borrow")
        ? "borrow"
        : (templates[0]?.type as AssetOperationType | undefined)) ?? "receive";

  const [formState, setFormState] = useState({
    type: preferredDefaultType,
    actor: "",
    description: "",
  });
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [openDateField, setOpenDateField] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFormState((prev) => {
      if (prev.type === preferredDefaultType) {
        return prev;
      }
      return { ...prev, type: preferredDefaultType };
    });
  }, [preferredDefaultType]);

  const templateType = normalizeOperationTypeToTemplateType(
    formState.type as AssetOperationType,
  );
  const currentTemplate = templateMap.get(templateType) ?? null;
  const templateFields = useMemo(
    () => deriveOperationTemplateFields(templateType, currentTemplate),
    [templateType, currentTemplate],
  );

  useEffect(() => {
    setFieldValues((prev) => {
      const next: Record<string, string> = {};
      templateFields.forEach((field) => {
        next[field.key] = prev[field.key] ?? "";
      });
      return next;
    });
  }, [templateFields]);

  const handleFieldChange = (key: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [key]: value }));
  };

  const formatDateLabel = (value?: string) => {
    if (!value) {
      return isChinese ? "选择日期" : "Pick a date";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleDateString(isChinese ? "zh-CN" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const normalizeFieldValue = (
    field: OperationTemplateField,
    raw: string,
  ): OperationTemplateFieldValue | undefined => {
    const value = raw.trim();
    if (!value) return undefined;
    if (field.widget === "number") {
      const asNumber = Number(value);
      if (Number.isNaN(asNumber)) {
        throw new Error(
          isChinese
            ? `${field.labelZh} 需输入数字`
            : `${field.labelEn} must be a number`,
        );
      }
      return asNumber;
    }
    if (field.widget === "attachments") {
      return value
        .split(/\r?\n|,/)
        .map((entry) => entry.trim())
        .filter(Boolean);
    }
    return value;
  };

  const hasAttachmentValue = () =>
    templateFields
      .filter((field) => field.widget === "attachments")
      .some((field) => fieldValues[field.key]?.trim());

  const resetFieldValues = () => {
    setFieldValues(
      templateFields.reduce<Record<string, string>>((acc, field) => {
        acc[field.key] = "";
        return acc;
      }, {}),
    );
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (!formState.actor.trim()) {
        throw new Error(
          isChinese ? "请填写经办人。" : "Please provide an actor.",
        );
      }

      for (const field of templateFields) {
        if (field.required && !fieldValues[field.key]?.trim()) {
          throw new Error(
            isChinese
              ? `${field.labelZh} 为必填项`
              : `${field.labelEn} is required`,
          );
        }
      }

      if (currentTemplate?.requireAttachment && !hasAttachmentValue()) {
        throw new Error(
          isChinese
            ? "该操作需要至少上传或填写一个附件。"
            : "This operation requires at least one attachment.",
        );
      }

      const metadataEntries: [string, OperationTemplateFieldValue][] = [];
      templateFields.forEach((field) => {
        const raw = fieldValues[field.key];
        if (!raw || !raw.trim()) {
          return;
        }
        const normalized = normalizeFieldValue(field, raw);
        if (normalized !== undefined) {
          metadataEntries.push([field.key, normalized]);
        }
      });

      const templateSnapshot: OperationTemplateSnapshot | undefined =
        currentTemplate
          ? {
              id: currentTemplate.id,
              type: currentTemplate.type,
              labelZh: currentTemplate.labelZh,
              labelEn: currentTemplate.labelEn,
              requireAttachment: currentTemplate.requireAttachment,
              fields: templateFields.map((field) => ({
                key: field.key,
                labelZh: field.labelZh,
                labelEn: field.labelEn,
                widget: field.widget,
              })),
            }
          : undefined;

      const operationTemplateMetadata: OperationTemplateMetadata | undefined =
        templateSnapshot || metadataEntries.length
          ? {
              snapshot: templateSnapshot,
              values:
                metadataEntries.length > 0
                  ? (Object.fromEntries(
                      metadataEntries,
                    ) as Record<string, OperationTemplateFieldValue>)
                  : undefined,
            }
          : undefined;

      const metadata = operationTemplateMetadata
        ? { operationTemplate: operationTemplateMetadata }
        : undefined;

      const payload = {
        type: formState.type as AssetOperationType,
        actor: formState.actor.trim(),
        description: formState.description.trim(),
        metadata,
      };

      const response = await fetch(
        `/apps/asset-hub/api/assets/${assetId}/operations`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload?.message ?? "提交失败");
      }

      setFormState((prev) => ({
        ...prev,
        actor: "",
        description: "",
      }));
      resetFieldValues();
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isChinese
            ? "无法创建操作记录，请稍后重试。"
            : "Failed to create operation, please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field: OperationTemplateField) => {
    const value = fieldValues[field.key] ?? "";
    const label = isChinese ? field.labelZh : field.labelEn;
    const placeholder = isChinese
      ? field.placeholderZh ?? field.placeholderEn
      : field.placeholderEn ?? field.placeholderZh;
    const helper = isChinese
      ? field.helperZh ?? field.helperEn
      : field.helperEn ?? field.helperZh;

    if (field.widget === "date") {
      return (
        <div key={field.key} className="space-y-1.5">
          <Label className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            {label}
            {field.required && <span className="text-destructive">*</span>}
          </Label>
          <Popover
            open={openDateField === field.key}
            onOpenChange={(open) => setOpenDateField(open ? field.key : null)}
          >
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                type="button"
                data-empty={!value}
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !value && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-1 h-4 w-4" />
                <div className="truncate">{formatDateLabel(value)}</div>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={value ? new Date(value) : undefined}
                initialFocus
                onSelect={(date) => {
                  if (!date) return;
                  handleFieldChange(field.key, date.toISOString().slice(0, 10));
                  setOpenDateField(null);
                }}
              />
            </PopoverContent>
          </Popover>
          {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
        </div>
      );
    }

    if (field.widget === "textarea" || field.widget === "attachments") {
      return (
        <div key={field.key} className="space-y-1.5">
          <Label className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            {label}
            {field.required && <span className="text-destructive">*</span>}
          </Label>
          <Textarea
            rows={field.widget === "attachments" ? 4 : 3}
            value={value}
            placeholder={placeholder}
            required={field.required}
            onChange={(event) => handleFieldChange(field.key, event.target.value)}
          />
          {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
        </div>
      );
    }

    return (
      <div key={field.key} className="space-y-1.5">
        <Label className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
          {label}
          {field.required && <span className="text-destructive">*</span>}
        </Label>
        <Input
          type={field.widget === "number" ? "number" : "text"}
          value={value}
          placeholder={placeholder}
          required={field.required}
          onChange={(event) => handleFieldChange(field.key, event.target.value)}
        />
        {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
      </div>
    );
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border bg-muted/40 p-4"
    >
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">
          {isChinese ? "操作类型" : "Operation Type"}
        </Label>
        <Select
          value={formState.type}
          onValueChange={(value) =>
            setFormState((prev) => ({
              ...prev,
              type: value as AssetOperationType,
            }))
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OPERATION_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {isChinese ? type.label.zh : type.label.en}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {isChinese
            ? `当前：${getOperationTypeLabel(formState.type, "zh")}`
            : `Selected: ${getOperationTypeLabel(formState.type, "en")}`}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">
          {isChinese ? "经办人" : "Actor"}
        </Label>
        <Input
          required
          value={formState.actor}
          onChange={(event) =>
            setFormState((prev) => ({ ...prev, actor: event.target.value }))
          }
        />
      </div>

      {templateFields.length > 0 && (
        <div className="space-y-3 rounded-2xl border border-dashed bg-background/70 p-3">
          <div className="space-y-0.5">
            <p className="text-sm font-semibold">
              {isChinese ? "模板字段" : "Template Fields"}
            </p>
            <p className="text-xs text-muted-foreground">
              {currentTemplate
                ? isChinese
                  ? currentTemplate.descriptionZh ?? currentTemplate.descriptionEn
                  : currentTemplate.descriptionEn ?? currentTemplate.descriptionZh
                : isChinese
                  ? "管理员尚未配置说明，可根据需要填写。"
                  : "No template description yet. Fill in the details as needed."}
            </p>
            {currentTemplate?.requireAttachment && (
              <p className="text-xs font-medium text-amber-600">
                {isChinese
                  ? "该类型需至少包含一个附件链接或凭证。"
                  : "At least one attachment entry is required."}
              </p>
            )}
          </div>
          <div className="grid gap-3">
            {templateFields.map((field) => renderField(field))}
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">
          {isChinese ? "说明" : "Description"}
        </Label>
        <Textarea
          rows={3}
          value={formState.description}
          onChange={(event) =>
            setFormState((prev) => ({ ...prev, description: event.target.value }))
          }
        />
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <Button
        type="submit"
        disabled={submitting}
        className="w-full rounded-2xl px-4 py-2 text-sm"
      >
        {submitting
          ? isChinese
            ? "提交中..."
            : "Submitting..."
          : isChinese
            ? "记录操作"
            : "Log Operation"}
      </Button>
    </form>
  );
}

