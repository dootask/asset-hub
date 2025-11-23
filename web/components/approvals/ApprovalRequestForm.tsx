"use client";

import { useEffect, useMemo, useState, useId } from "react";
import { useRouter } from "next/navigation";
import {
  APPROVAL_TYPES,
  type ApprovalRequest,
  ApprovalType,
} from "@/lib/types/approval";
import type { ActionConfig } from "@/lib/types/action-config";
import { approvalTypeToActionConfigId } from "@/lib/utils/action-config";
import {
  selectUsers,
  isMicroApp,
  appReady,
  fetchUserBasic,
} from "@dootask/tools";
import { sendApprovalCreatedNotification } from "@/lib/client/dootask-notifications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarIcon, X as XICon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import type {
  OperationTemplate,
  OperationTemplateField,
  OperationTemplateFieldValue,
  OperationTemplateMetadata,
  OperationTemplateSnapshot,
} from "@/lib/types/operation-template";
import {
  deriveOperationTemplateFields,
  mapApprovalTypeToTemplateType,
} from "@/lib/config/operation-template-fields";
import { useAppFeedback } from "@/components/providers/feedback-provider";
import { getApiClient } from "@/lib/http/client";

type Applicant = {
  id: string;
  name?: string;
};

type DootaskUser =
  | string
  | number
  | {
      userid?: string;
      id?: string;
      nickname?: string;
      name?: string;
    };

type SelectUsersReturn = DootaskUser[] | { users?: DootaskUser[] };

interface Props {
  assetId: string;
  assetName: string;
  locale?: string;
  operationTemplates?: OperationTemplate[];
}

export default function ApprovalRequestForm({
  assetId,
  assetName,
  locale,
  operationTemplates = [],
}: Props) {
  const router = useRouter();
  const isChinese = locale === "zh";
  const [loadingUser, setLoadingUser] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectingApprover, setSelectingApprover] = useState(false);
  const [canUseSelector, setCanUseSelector] = useState(false);

  const [applicant, setApplicant] = useState<Applicant>({
    id: "",
    name: "",
  });

  const [formState, setFormState] = useState({
    type: APPROVAL_TYPES[0].value,
    title: "",
    reason: "",
    approverId: "",
    approverName: "",
  });
  const [operationFieldValues, setOperationFieldValues] = useState<Record<string, string>>({});
  const [operationDatePicker, setOperationDatePicker] = useState<string | null>(null);
  const [configs, setConfigs] = useState<ActionConfig[]>([]);
  const [loadingConfigs, setLoadingConfigs] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);
  const feedback = useAppFeedback();
  const fieldIds = {
    type: useId(),
    title: useId(),
    reason: useId(),
    applicantId: useId(),
    applicantName: useId(),
    approverId: useId(),
    approverName: useId(),
  };

  const operationTemplateMap = useMemo(
    () =>
      operationTemplates.reduce((map, template) => {
        map.set(template.type, template);
        return map;
      }, new Map<OperationTemplate["type"], OperationTemplate>()),
    [operationTemplates],
  );

  const operationTemplateType = mapApprovalTypeToTemplateType(formState.type as ApprovalType);
  const currentOperationTemplate =
    operationTemplateMap.get(operationTemplateType) ?? null;

  const operationTemplateFields = useMemo(
    () => deriveOperationTemplateFields(operationTemplateType, currentOperationTemplate),
    [operationTemplateType, currentOperationTemplate],
  );

  useEffect(() => {
    setOperationFieldValues((prev) => {
      const next: Record<string, string> = {};
      operationTemplateFields.forEach((field) => {
        next[field.key] = prev[field.key] ?? "";
      });
      return next;
    });
  }, [operationTemplateFields]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("asset-hub:dootask-user");
      if (raw) {
        const parsed = JSON.parse(raw) as {
          id?: number;
          nickname?: string;
        };
        setApplicant({
          id: parsed.id !== undefined ? String(parsed.id) : "",
          name: parsed.nickname ?? "",
        });
      }
    } catch {
      // ignore
    } finally {
      setLoadingUser(false);
    }
  }, []);

  useEffect(() => {
    async function detect() {
      try {
        const micro = await isMicroApp();
        if (!micro) {
          setCanUseSelector(false);
          return;
        }
        await appReady();
        setCanUseSelector(true);
      } catch {
        setCanUseSelector(false);
      }
    }
    detect();
  }, []);

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
          setConfigs(response.data.data);
          setConfigError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setConfigError(
            err instanceof Error
              ? err.message
              : isChinese
                ? "无法加载审批配置，请稍后重试。"
                : "Failed to load approval configurations.",
          );
          const message =
            err instanceof Error
              ? err.message
              : isChinese
                ? "无法加载审批配置，请稍后重试。"
                : "Failed to load approval configurations.";
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

  useEffect(() => {
    if (!formState.title) {
      const typeInfo = APPROVAL_TYPES.find(
        (item) => item.value === formState.type,
      );
      if (typeInfo) {
        const label = isChinese ? typeInfo.labelZh : typeInfo.labelEn;
        setFormState((prev) => ({
          ...prev,
          title: `${label} - ${assetName}`,
        }));
      }
    }
  }, [formState.type, assetName, formState.title, isChinese]);

  const currentConfig = useMemo(() => {
    if (!configs.length) {
      return null;
    }
    const configId = approvalTypeToActionConfigId(formState.type as ApprovalType);
    return configs.find((item) => item.id === configId) ?? null;
  }, [configs, formState.type]);

  const approvalsDisabled = currentConfig ? !currentConfig.requiresApproval : false;
  const allowOverride = currentConfig ? currentConfig.allowOverride : true;
  const defaultApproverId =
    currentConfig?.defaultApproverType === "user" &&
    currentConfig.defaultApproverRefs.length > 0
      ? currentConfig.defaultApproverRefs[0]
      : null;

  useEffect(() => {
    if (!currentConfig || !defaultApproverId) {
      return;
    }
    setFormState((prev) => {
      if (prev.approverId) {
        return prev;
      }
      return {
        ...prev,
        approverId: defaultApproverId,
      };
    });
  }, [currentConfig, defaultApproverId]);

  const canSubmit = useMemo(() => {
    if (approvalsDisabled) {
      return false;
    }
    return (
      `${applicant.id}`.trim().length > 0 &&
      `${formState.title}`.trim().length > 0 &&
      `${formState.reason}`.trim().length > 0 &&
      `${formState.approverId}`.trim().length > 0
    );
  }, [applicant.id, formState.title, formState.reason, formState.approverId, approvalsDisabled]);

  const normalizeSelectedUser = (result: SelectUsersReturn | undefined) => {
    if (!result) return null;
    if (Array.isArray(result)) {
      return result[0] ?? null;
    }
    if (Array.isArray(result.users)) {
      return result.users[0] ?? null;
    }
    return null;
  };

  const handleTypeChange = (value: ApprovalType) => {
    setFormState((prev) => ({
      ...prev,
      type: value,
      title: "",
      approverId: "",
      approverName: "",
    }));
    setOperationFieldValues({});
  };

  const resolveSelectedApprover = async (entry: DootaskUser | null) => {
    if (entry === null || entry === undefined) return null;

    if (typeof entry === "string" || typeof entry === "number") {
      const id = Number(entry);
      try {
        const list = await fetchUserBasic([id]);
        const info = Array.isArray(list) ? list[0] : undefined;
        return {
          id,
          name: info?.nickname ?? info?.name ?? "",
        };
      } catch {
        return { id, name: "" };
      }
    }

    const id = entry.userid ?? entry.id ?? "";
    if (!id) return null;
    if (entry.nickname || entry.name) {
      return {
        id,
        name: entry.nickname ?? entry.name ?? "",
      };
    }

    try {
      const list = await fetchUserBasic([Number(id)]);
      const info = Array.isArray(list) ? list[0] : undefined;
      return {
        id,
        name: info?.nickname ?? info?.name ?? "",
      };
    } catch {
      return { id, name: "" };
    }
  };

  const handleSelectApprover = async () => {
    if (!canUseSelector) return;
    if (!allowOverride) {
      feedback.error(
        isChinese
          ? "当前操作的审批人由系统自动指派，无法修改。"
          : "Approver is locked by system configuration.",
      );
      return;
    }
    setSelectingApprover(true);
    try {
      const result = (await selectUsers({
        multipleMax: 1,
        showSelectAll: false,
        showDialog: false,
      })) as SelectUsersReturn;
      const entry = normalizeSelectedUser(result);
      const pick = await resolveSelectedApprover(entry);
      if (!pick) {
        feedback.error(isChinese ? "未选择任何审批人。" : "No approver selected.");
      } else {
        setFormState((prev) => ({
          ...prev,
          approverId: `${pick.id}`.trim(),
          approverName: pick.name ?? "",
        }));
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : isChinese
            ? "选择审批人失败。"
            : "Failed to select approver.";
      feedback.error(message, {
        blocking: true,
        title: isChinese ? "选择失败" : "Selection failed",
        acknowledgeLabel: isChinese ? "知道了" : "Got it",
      });
    } finally {
      setSelectingApprover(false);
    }
  };

  const handleClearApprover = () => {
    if (!allowOverride) return;
    setFormState((prev) => ({
      ...prev,
      approverId: "",
      approverName: "",
    }));
  };

  const handleOperationFieldChange = (key: string, value: string) => {
    setOperationFieldValues((prev) => ({ ...prev, [key]: value }));
  };

  const formatOperationDateLabel = (value?: string) => {
    if (!value) {
      return isChinese ? "选择日期" : "Pick a date";
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return parsed.toLocaleDateString(isChinese ? "zh-CN" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const normalizeOperationFieldValue = (
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

  const hasOperationAttachmentValue = () =>
    operationTemplateFields
      .filter((field) => field.widget === "attachments")
      .some((field) => operationFieldValues[field.key]?.trim());

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);

    try {
      for (const field of operationTemplateFields) {
        if (field.required && !operationFieldValues[field.key]?.trim()) {
          throw new Error(
            isChinese
              ? `${field.labelZh} 为必填项`
              : `${field.labelEn} is required`,
          );
        }
      }

      if (currentOperationTemplate?.requireAttachment && !hasOperationAttachmentValue()) {
        throw new Error(
          isChinese
            ? "该审批类型需要至少一个附件。"
            : "This approval requires at least one attachment.",
        );
      }

      const operationFieldEntries: [string, OperationTemplateFieldValue][] =
        [];
      operationTemplateFields.forEach((field) => {
        const raw = operationFieldValues[field.key];
        if (!raw || !raw.trim()) return;
        const normalized = normalizeOperationFieldValue(field, raw);
        if (normalized !== undefined) {
          operationFieldEntries.push([field.key, normalized]);
        }
      });

      const fallbackTemplateLabel = APPROVAL_TYPES.find(
        (item) => item.value === formState.type,
      );
      const shouldAttachTemplateMetadata =
        operationFieldEntries.length > 0 || !!currentOperationTemplate;

      const operationTemplateSnapshot: OperationTemplateSnapshot | undefined =
        shouldAttachTemplateMetadata
          ? {
              ...(currentOperationTemplate
                ? {
                    id: currentOperationTemplate.id,
                    type: currentOperationTemplate.type,
                    labelZh: currentOperationTemplate.labelZh,
                    labelEn: currentOperationTemplate.labelEn,
                    requireAttachment:
                      currentOperationTemplate.requireAttachment,
                  }
                : {
                    type: operationTemplateType,
                    labelZh:
                      fallbackTemplateLabel?.labelZh ?? operationTemplateType,
                    labelEn:
                      fallbackTemplateLabel?.labelEn ?? operationTemplateType,
                    requireAttachment: false,
                  }),
              fields: operationTemplateFields.map((field) => ({
                key: field.key,
                labelZh: field.labelZh,
                labelEn: field.labelEn,
                widget: field.widget,
              })),
            }
          : undefined;

      const operationTemplateMetadata: OperationTemplateMetadata | undefined =
        operationTemplateSnapshot !== undefined
          ? {
              snapshot: operationTemplateSnapshot,
              values:
                operationFieldEntries.length > 0
                  ? (Object.fromEntries(
                      operationFieldEntries,
                    ) as Record<string, OperationTemplateFieldValue>)
                  : undefined,
            }
          : undefined;

      const configSnapshot = currentConfig
        ? {
            id: currentConfig.id,
            requiresApproval: currentConfig.requiresApproval,
            allowOverride: currentConfig.allowOverride,
            defaultApproverType: currentConfig.defaultApproverType,
          }
        : undefined;

      const metadataBase: Record<string, unknown> = {
        initiatedFrom: "asset-detail",
        ...(configSnapshot ? { configSnapshot } : {}),
      };

      const metadataPayload =
        operationTemplateMetadata !== undefined
          ? {
              ...metadataBase,
              operationTemplate: operationTemplateMetadata,
            }
          : metadataBase;
      const searchSuffix = (() => {
        if (typeof window === "undefined") return "";
        if (window.location.search) {
          return window.location.search;
        }
        return locale ? `?lang=${locale}` : "";
      })();
      const endpoint = `/apps/asset-hub/api/approvals${searchSuffix}`;
      const client = await getApiClient();
      const response = await client.post<{
        data?: ApprovalRequest;
        message?: string;
      }>(endpoint, {
        type: formState.type,
        title: formState.title.trim(),
        reason: formState.reason.trim(),
        assetId,
        applicant: {
          id: `${applicant.id}`.trim(),
          name: `${applicant.name}`.trim(),
        },
        approver:
          formState.approverId || formState.approverName
            ? {
                id: formState.approverId || undefined,
                name: formState.approverName || undefined,
              }
            : undefined,
        metadata: metadataPayload,
      });

      const payload = response.data;

      if (payload?.data) {
        void sendApprovalCreatedNotification({
          approval: payload.data,
          locale,
        });
      }

      setFormState({
        type: APPROVAL_TYPES[0].value,
        title: "",
        reason: "",
        approverId: "",
        approverName: "",
      });
      setOperationFieldValues({});
      router.refresh();
      feedback.success(isChinese ? "审批已提交" : "Approval submitted");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : isChinese
            ? "提交失败，请稍后再试。"
            : "Failed to create approval request.";
      feedback.error(message, {
        blocking: true,
        title: isChinese ? "提交失败" : "Submit failed",
        acknowledgeLabel: isChinese ? "知道了" : "Got it",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const renderOperationField = (field: OperationTemplateField) => {
    const value = operationFieldValues[field.key] ?? "";
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
            open={operationDatePicker === field.key}
            onOpenChange={(open) =>
              setOperationDatePicker(open ? field.key : null)
            }
          >
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !value && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-1 h-4 w-4" />
                <div className="truncate">
                  {formatOperationDateLabel(value)}
                </div>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={value ? new Date(value) : undefined}
                initialFocus
                onSelect={(date) => {
                  if (!date) return;
                  handleOperationFieldChange(
                    field.key,
                    date.toISOString().slice(0, 10),
                  );
                  setOperationDatePicker(null);
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
            onChange={(event) =>
              handleOperationFieldChange(field.key, event.target.value)
            }
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
          onChange={(event) =>
            handleOperationFieldChange(field.key, event.target.value)
          }
        />
        {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
      </div>
    );
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-2xl border bg-muted/30 p-4"
    >
      <div>
        <h3 className="text-sm font-semibold">
          {isChinese ? "发起审批" : "New Approval"}
        </h3>
        <p className="text-xs text-muted-foreground">
          {isChinese
            ? "填写审批信息，提交后将在审批中心查看进度。"
            : "Fill the approval request and track it in the approval center."}
        </p>
      </div>

      {configError && (
        <p className="rounded-2xl border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
          {configError}
        </p>
      )}

      {currentConfig && (
        <div className="rounded-2xl border border-muted-foreground/20 bg-muted/20 p-3 text-xs text-muted-foreground">
          <p>
            {isChinese ? "当前配置：" : "Current config:"}{" "}
            {isChinese ? currentConfig.labelZh : currentConfig.labelEn}
          </p>
          <p className="mt-1">
            {isChinese ? "需要审批：" : "Requires approval:"}{" "}
            {currentConfig.requiresApproval
              ? isChinese
                ? "是"
                : "Yes"
              : isChinese
                ? "否"
                : "No"}
            {" · "}
            {isChinese ? "允许修改审批人：" : "Override allowed:"}{" "}
            {currentConfig.allowOverride
              ? isChinese
                ? "是"
                : "Yes"
              : isChinese
                ? "否"
                : "No"}
          </p>
        </div>
      )}
      {loadingConfigs && !configError && (
        <p className="rounded-2xl border border-dashed border-muted-foreground/20 bg-muted/20 p-3 text-xs text-muted-foreground">
          {isChinese ? "正在加载审批配置..." : "Loading approval configuration..."}
        </p>
      )}

      {approvalsDisabled && (
        <p className="rounded-2xl border border-dashed border-muted-foreground/40 bg-muted/20 p-3 text-xs text-muted-foreground">
          {isChinese
            ? "该操作类型当前配置为无需审批，如需提交请联系管理员开启审批。"
            : "This action type does not require approval right now. Contact an admin if you still need to submit."}
        </p>
      )}

      <div className="space-y-1.5">
        <Label
          htmlFor={fieldIds.type}
          className="text-xs font-medium text-muted-foreground"
        >
          {isChinese ? "审批类型" : "Approval Type"}
        </Label>
        <Select
          value={formState.type}
          onValueChange={(value) => handleTypeChange(value as ApprovalType)}
        >
          <SelectTrigger id={fieldIds.type} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {APPROVAL_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {isChinese ? type.labelZh : type.labelEn}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label
          htmlFor={fieldIds.title}
          className="text-xs font-medium text-muted-foreground"
        >
          {isChinese ? "标题" : "Title"}
        </Label>
        <Input
          id={fieldIds.title}
          required
          value={formState.title}
          onChange={(event) =>
            setFormState((prev) => ({ ...prev, title: event.target.value }))
          }
        />
      </div>

      <div className="space-y-1.5">
        <Label
          htmlFor={fieldIds.reason}
          className="text-xs font-medium text-muted-foreground"
        >
          {isChinese ? "事由" : "Reason"}
        </Label>
        <Textarea
          id={fieldIds.reason}
          required
          rows={3}
          value={formState.reason}
          onChange={(event) =>
            setFormState((prev) => ({ ...prev, reason: event.target.value }))
          }
        />
      </div>

      {operationTemplateFields.length > 0 && (
        <div className="space-y-3 rounded-2xl border border-dashed border-muted-foreground/40 bg-card/50 p-3">
          <div className="space-y-0.5">
            <p className="text-sm font-semibold">
              {isChinese ? "操作详情" : "Operation Details"}
            </p>
            <p className="text-xs text-muted-foreground">
              {currentOperationTemplate
                ? isChinese
                  ? currentOperationTemplate.descriptionZh ??
                    currentOperationTemplate.descriptionEn
                  : currentOperationTemplate.descriptionEn ??
                    currentOperationTemplate.descriptionZh
                : isChinese
                  ? "管理员尚未为该类型配置说明，可根据业务需要补充信息。"
                  : "No template description yet. Provide details as needed."}
            </p>
            {currentOperationTemplate?.requireAttachment && (
              <p className="text-xs font-medium text-amber-600">
                {isChinese
                  ? "需要至少上传或填写一个附件凭证。"
                  : "At least one attachment entry is required."}
              </p>
            )}
          </div>

          <div className="grid gap-3">
            {operationTemplateFields.map((field) => renderOperationField(field))}
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label
            htmlFor={fieldIds.applicantId}
            className="text-xs font-medium text-muted-foreground"
          >
            {isChinese ? "申请人 ID" : "Applicant ID"}
          </Label>
          <Input
            required
            readOnly
            id={fieldIds.applicantId}
            value={applicant.id}
            disabled={loadingUser}
          />
        </div>
        <div className="space-y-1.5">
          <Label
            htmlFor={fieldIds.applicantName}
            className="text-xs font-medium text-muted-foreground"
          >
            {isChinese ? "申请人姓名" : "Applicant Name"}
          </Label>
          <Input
            id={fieldIds.applicantName}
            readOnly
            value={applicant.name ?? ""}
            disabled={loadingUser}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">
          {isChinese ? "审批人" : "Approver"}
        </Label>
        {allowOverride ? (
          canUseSelector ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={handleSelectApprover}
                disabled={selectingApprover}
              >
                {selectingApprover
                  ? isChinese
                    ? "选择中..."
                    : "Selecting..."
                  : isChinese
                    ? "选择审批人"
                    : "Select Approver"}
              </Button>
              {(formState.approverId || formState.approverName) && (
                <div className="ml-2 flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-sm">
                  <span className="font-medium">
                    {formState.approverName || formState.approverId}
                  </span>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={handleClearApprover}
                  >
                    <XICon className="size-4" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label
                  htmlFor={fieldIds.approverId}
                  className="text-xs text-muted-foreground"
                >
                  {isChinese ? "审批人 ID" : "Approver ID"}
                </Label>
                <Input
                  id={fieldIds.approverId}
                  value={formState.approverId}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      approverId: event.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor={fieldIds.approverName}
                  className="text-xs text-muted-foreground"
                >
                  {isChinese ? "审批人姓名（可选）" : "Approver name (optional)"}
                </Label>
                <Input
                  id={fieldIds.approverName}
                  value={formState.approverName}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      approverName: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
          )
        ) : (
          <div className="rounded-2xl border border-dashed border-muted-foreground/40 bg-muted/20 px-3 py-2 text-sm font-medium text-foreground">
            {formState.approverId || defaultApproverId ? (
              <span>{formState.approverName || formState.approverId || defaultApproverId}</span>
            ) : (
              <span className="text-destructive">
                {isChinese
                  ? "尚未配置默认审批人，请联系管理员。"
                  : "No default approver configured. Please contact an admin."}
              </span>
            )}
          </div>
        )}
        {!allowOverride && (
          <p className="text-xs text-muted-foreground">
            {isChinese
              ? "此操作由系统自动指派审批人，无法手动修改。"
              : "Approver is assigned automatically and cannot be changed."}
          </p>
        )}
        {allowOverride && !formState.approverId && !approvalsDisabled && (
          <p className="text-xs text-muted-foreground">
            {isChinese ? "请选择审批人后再提交。" : "Please pick an approver before submitting."}
          </p>
        )}
      </div>

      <Button
        type="submit"
        disabled={!canSubmit || submitting}
        className="w-full rounded-2xl"
      >
        {submitting
          ? isChinese
            ? "提交中..."
            : "Submitting..."
          : isChinese
            ? "提交审批"
            : "Submit Request"}
      </Button>
    </form>
  );
}
