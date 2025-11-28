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
import { getApiClient } from "@/lib/http/client";
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
import type { ActionConfig } from "@/lib/types/action-config";
import { operationTypeToActionConfigId } from "@/lib/utils/action-config";
import {
  getOperationTypeLabel,
  OPERATION_TYPES,
  type AssetOperationType,
} from "@/lib/types/operation";
import { useAppFeedback } from "@/components/providers/feedback-provider";
import { extractApiErrorMessage } from "@/lib/utils/api-error";
import { AttachmentUploadField } from "@/components/attachments/AttachmentUploadField";
import { enUS, zhCN } from "react-day-picker/locale";

interface Props {
  assetId: string;
  locale?: string;
  templates?: OperationTemplate[];
  onSuccess?: () => void;
  formId?: string;
  onSubmitStateChange?: (state: {
    submitting: boolean;
    operationLocked: boolean;
  }) => void;
}

type FieldValue = string | string[];

const MIN_INBOUND_ATTACHMENTS = 3;

export default function OperationForm({
  assetId,
  locale = "en",
  templates = [],
  onSuccess,
  formId,
  onSubmitStateChange,
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
  const [fieldValues, setFieldValues] = useState<Record<string, FieldValue>>({});
  const [openDateField, setOpenDateField] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionConfigs, setActionConfigs] = useState<ActionConfig[]>([]);
  const [loadingConfigs, setLoadingConfigs] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);
  const feedback = useAppFeedback();

  const toAttachmentArray = (value: FieldValue | undefined) => {
    if (Array.isArray(value)) {
      return value.map((entry) => entry.trim()).filter(Boolean);
    }
    if (typeof value === "string") {
      return value
        .split(/\r?\n|,/)
        .map((entry) => entry.trim())
        .filter(Boolean);
    }
    return [];
  };

  const handleAttachmentChange = (key: string, urls: string[]) => {
    setFieldValues((prev) => ({ ...prev, [key]: urls }));
  };

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

  const currentActionConfig = useMemo(() => {
    if (!actionConfigs.length) {
      return null;
    }
    const configId = operationTypeToActionConfigId(
      formState.type as AssetOperationType,
    );
    return actionConfigs.find((config) => config.id === configId) ?? null;
  }, [actionConfigs, formState.type]);

  const isInboundType = formState.type === "inbound";
  const inboundUnlocked =
    isInboundType &&
    !loadingConfigs &&
    currentActionConfig?.requiresApproval === false;
  const operationLocked = isInboundType && !inboundUnlocked;

  useEffect(() => {
    onSubmitStateChange?.({ submitting, operationLocked });
  }, [submitting, operationLocked, onSubmitStateChange]);

  useEffect(() => {
    setFieldValues((prev) => {
      const next: Record<string, FieldValue> = {};
      templateFields.forEach((field) => {
        if (field.widget === "attachments") {
          next[field.key] = toAttachmentArray(prev[field.key]);
        } else {
          const prevValue = prev[field.key];
          next[field.key] =
            typeof prevValue === "string" ? prevValue : "";
        }
      });
      return next;
    });
  }, [templateFields]);

  useEffect(() => {
    let cancelled = false;
    async function fetchConfigs() {
      setLoadingConfigs(true);
      try {
        const client = await getApiClient();
        const response = await client.get<{ data: ActionConfig[] }>(
          "/apps/asset-hub/api/config/approvals",
          { headers: { "Cache-Control": "no-cache" } },
        );
        if (!cancelled) {
          setActionConfigs(response.data.data);
          setConfigError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setActionConfigs([]);
          const message = extractApiErrorMessage(
            err,
            isChinese
              ? "无法加载操作配置，请稍后重试。"
              : "Failed to load operation configuration.",
          );
          setConfigError(message);
          feedback.error(message, {
            blocking: true,
            title: isChinese ? "加载失败" : "Load failed",
            acknowledgeLabel: isChinese ? "知道了" : "Got it",
          });
        }
      } finally {
        if (!cancelled) {
          setLoadingConfigs(false);
        }
      }
    }
    fetchConfigs();
    return () => {
      cancelled = true;
    };
  }, [feedback, isChinese]);

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
    raw: FieldValue,
  ): OperationTemplateFieldValue | undefined => {
    if (field.widget === "attachments") {
      const attachments = toAttachmentArray(raw);
      return attachments.length ? attachments : undefined;
    }

    if (typeof raw !== "string") return undefined;

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

    return value;
  };

  const countAttachmentEntries = () =>
    templateFields
      .filter((field) => field.widget === "attachments")
      .reduce((total, field) => {
        const raw = fieldValues[field.key];
        const attachments = toAttachmentArray(raw);
        return total + attachments.length;
      }, 0);

  const resetFieldValues = () => {
    setFieldValues(
      templateFields.reduce<Record<string, FieldValue>>((acc, field) => {
        acc[field.key] = field.widget === "attachments" ? [] : "";
        return acc;
      }, {}),
    );
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      if (isInboundType && !inboundUnlocked) {
        throw new Error(
          loadingConfigs
            ? isChinese
              ? "正在加载入库配置，请稍候。"
              : "Loading inbound configuration, please wait."
            : isChinese
              ? "入库操作已配置为必须走审批，请在审批表单中提交。"
              : "Inbound operations require approval. Please submit a request via the approval form.",
        );
      }

      if (!formState.actor.trim()) {
        throw new Error(
          isChinese ? "请填写经办人。" : "Please provide an actor.",
        );
      }

      for (const field of templateFields) {
        if (field.widget === "attachments") {
          const attachments = toAttachmentArray(fieldValues[field.key]);
          if (field.required && attachments.length === 0) {
            throw new Error(
              isChinese
                ? `${field.labelZh} 为必填项`
                : `${field.labelEn} is required`,
            );
          }
        } else if (field.required) {
          const rawValue = fieldValues[field.key];
          if (typeof rawValue !== "string" || !rawValue.trim()) {
            throw new Error(
              isChinese
                ? `${field.labelZh} 为必填项`
                : `${field.labelEn} is required`,
            );
          }
        }
      }

      if (currentTemplate?.requireAttachment) {
        const attachmentCount = countAttachmentEntries();
        if (attachmentCount === 0) {
          throw new Error(
            isChinese
              ? "该操作需要至少上传或填写一个附件。"
              : "This operation requires at least one attachment.",
          );
        }
        if (
          templateType === "inbound" &&
          attachmentCount < MIN_INBOUND_ATTACHMENTS
        ) {
          throw new Error(
            isChinese
              ? `入库操作需至少上传 ${MIN_INBOUND_ATTACHMENTS} 张照片或附件链接。`
              : `Inbound operations require at least ${MIN_INBOUND_ATTACHMENTS} photo attachments.`,
          );
        }
      }

      const metadataEntries: [string, OperationTemplateFieldValue][] = [];
      templateFields.forEach((field) => {
        const raw = fieldValues[field.key];
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

      const client = await getApiClient();
      await client.post(`/apps/asset-hub/api/assets/${assetId}/operations`, payload);

      setFormState((prev) => ({
        ...prev,
        actor: "",
        description: "",
      }));
      resetFieldValues();
      router.refresh();
      onSuccess?.();
      feedback.success(isChinese ? "操作记录已创建" : "Operation created");
    } catch (err) {
      const message = extractApiErrorMessage(
        err,
        isChinese
          ? "无法创建操作记录，请稍后重试。"
          : "Failed to create operation, please try again.",
      );
      feedback.error(message, {
        blocking: true,
        title: isChinese ? "提交失败" : "Submit failed",
        acknowledgeLabel: isChinese ? "知道了" : "Got it",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field: OperationTemplateField) => {
    const rawValue = fieldValues[field.key];
    const value = typeof rawValue === "string" ? rawValue : "";
    const label = isChinese ? field.labelZh : field.labelEn;
    const placeholder = isChinese
      ? field.placeholderZh ?? field.placeholderEn
      : field.placeholderEn ?? field.placeholderZh;
    const helper = isChinese
      ? field.helperZh ?? field.helperEn
      : field.helperEn ?? field.helperZh;

    if (field.widget === "attachments") {
      const showInboundAttachmentHint =
        currentTemplate?.requireAttachment && templateType === "inbound";
      return (
        <div key={field.key} className="space-y-1.5">
          <Label className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            {label}
            {field.required && <span className="text-destructive">*</span>}
          </Label>
          <AttachmentUploadField
            locale={locale}
            value={toAttachmentArray(rawValue)}
            onChange={(urls) => handleAttachmentChange(field.key, urls)}
            helperText={
              helper ??
              (showInboundAttachmentHint
                ? isChinese
                  ? `请至少上传 ${MIN_INBOUND_ATTACHMENTS} 张不同角度的入库照片。`
                  : `Upload at least ${MIN_INBOUND_ATTACHMENTS} inbound photos from different angles.`
                : undefined)
            }
          />
        </div>
      );
    }

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
                locale={isChinese ? zhCN : enUS}
                captionLayout="dropdown"
                weekStartsOn={0}
                startMonth={new Date(new Date().getFullYear() - 5, 0)}
                endMonth={new Date(new Date().getFullYear() + 5, 11)}
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

    if (field.widget === "textarea") {
      return (
        <div key={field.key} className="space-y-1.5">
          <Label className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            {label}
            {field.required && <span className="text-destructive">*</span>}
          </Label>
          <Textarea
            rows={3}
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
      id={formId}
      onSubmit={handleSubmit}
      className="space-y-4"
    >
      {configError && (
        <p className="rounded-2xl border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
          {configError}
        </p>
      )}
      {isInboundType && (
        <div className="rounded-2xl border border-dashed border-muted-foreground/40 bg-muted/20 p-3 text-xs text-muted-foreground">
          {loadingConfigs
            ? isChinese
              ? "正在加载入库操作配置..."
              : "Loading inbound operation configuration..."
            : inboundUnlocked
              ? isChinese
                ? "当前入库流程无需审批，可直接在此记录结果。"
                : "Inbound operations currently do not require approval and can be logged directly."
              : isChinese
                ? "入库流程已配置为必须走审批，请在审批表单中提交请求。"
                : "Inbound operations require approval. Please submit the request via the approval form."}
        </div>
      )}
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
                {templateType === "inbound"
                  ? isChinese
                    ? `该类型需至少包含 ${MIN_INBOUND_ATTACHMENTS} 张入库照片（不同角度）。`
                    : `Provide at least ${MIN_INBOUND_ATTACHMENTS} inbound photos (different angles).`
                  : isChinese
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

    </form>
  );
}
