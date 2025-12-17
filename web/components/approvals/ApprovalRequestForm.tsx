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
import { enUS, zhCN } from "react-day-picker/locale";
import { AttachmentUploadField } from "@/components/attachments/AttachmentUploadField";
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
import type { Role } from "@/lib/types/system";
import { useAppFeedback } from "@/components/providers/feedback-provider";
import { getApiClient } from "@/lib/http/client";
import { extractApiErrorMessage } from "@/lib/utils/api-error";
import { getStoredAuth } from "@/lib/utils/auth-storage";
import { fetchUserBasicBatched } from "@/lib/utils/dootask-users";

type Applicant = {
  id: string;
  name?: string;
};

type CcRecipient = { id: string; name?: string };

const MIN_INBOUND_ATTACHMENTS = 3;

type FieldValue = string | string[];

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

const EMPTY_STRING_ARRAY: string[] = [];
const CONSUMABLE_ONLY_TYPES = new Set<ApprovalType>([
  "outbound",
  "reserve",
  "release",
  "adjust",
]);

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
  const [operationFieldValues, setOperationFieldValues] = useState<Record<string, FieldValue>>({});
  const [operationDatePicker, setOperationDatePicker] = useState<string | null>(null);
  const [configs, setConfigs] = useState<ActionConfig[]>([]);
  const [loadingConfigs, setLoadingConfigs] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);
  
  // Role-based approver states
  const [, setLoadingRole] = useState(false);
  const [roleMembers, setRoleMembers] = useState<Array<{id: string, name: string}>>([]);

  // User-candidate approver states (defaultApproverType=user with multiple refs)
  const [loadingUserCandidates, setLoadingUserCandidates] = useState(false);
  const [userCandidates, setUserCandidates] = useState<
    Array<{ id: string; name: string }>
  >([]);

  const [selectingCc, setSelectingCc] = useState(false);
  const [ccRecipients, setCcRecipients] = useState<CcRecipient[]>([]);
  
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

  const selectableTypes = useMemo(
    () => APPROVAL_TYPES.filter((item) => !CONSUMABLE_ONLY_TYPES.has(item.value)),
    [],
  );

  const operationTemplateFields = useMemo(
    () => deriveOperationTemplateFields(operationTemplateType, currentOperationTemplate),
    [operationTemplateType, currentOperationTemplate],
  );

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
    setOperationFieldValues((prev) => ({ ...prev, [key]: urls }));
  };

  useEffect(() => {
    setOperationFieldValues((prev) => {
      const next: Record<string, FieldValue> = {};
      operationTemplateFields.forEach((field) => {
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
  }, [operationTemplateFields]);

  useEffect(() => {
    try {
      const stored = getStoredAuth();
      if (stored) {
        setApplicant({
          id: String(stored.userId),
          name: stored.nickname ?? "",
        });
      }
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
          const message = extractApiErrorMessage(
            err,
            isChinese
              ? "无法加载审批配置，请稍后重试。"
              : "Failed to load approval configurations.",
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
  const allowReassign = currentConfig ? currentConfig.allowOverride : true;

  const defaultRoleApproverId = 
    currentConfig?.defaultApproverType === "role" &&
    currentConfig.defaultApproverRefs.length > 0
      ? currentConfig.defaultApproverRefs[0]
      : null;

  const userApproverCandidates = useMemo(() => {
    if (!currentConfig || currentConfig.defaultApproverType !== "user") {
      return EMPTY_STRING_ARRAY;
    }
    return currentConfig.defaultApproverRefs ?? EMPTY_STRING_ARRAY;
  }, [currentConfig]);

  // Effect to handle Role-based approver resolution
  useEffect(() => {
    if (!defaultRoleApproverId) {
      setRoleMembers([]);
      return;
    }

    let active = true;
    async function resolveRole() {
      setLoadingRole(true);
      try {
        // 1. Fetch role details to get member IDs
        const client = await getApiClient();
        const roleRes = await client.get<{ data: Role }>(
          `/apps/asset-hub/api/system/roles/${defaultRoleApproverId}`
        );
        const role = roleRes.data.data;
        const memberIds = role.members;

        if (!active) return;

        if (memberIds.length === 0) {
           feedback.error(
            isChinese 
              ? `角色 "${role.name}" 暂无成员，请联系管理员配置。`
              : `Role "${role.name}" has no members. Contact admin.`
           );
           setRoleMembers([]);
           return;
        }

        // 2. Fetch member details (names)
        const memberDetails: Array<{id: string, name: string}> = [];
        
        // Try to fetch names in batches or individually
        // Since fetchUserBasic takes number[], we need to filter numeric IDs
        const numericIds = memberIds
          .map(id => Number(id))
          .filter(n => Number.isFinite(n));
          
        // const nonNumericIds = memberIds.filter(id => !Number.isFinite(Number(id)));

        if (numericIds.length > 0) {
          try {
            const users = await fetchUserBasicBatched(numericIds);
            if (!active) return;
            users.forEach((u) => {
              const uid = u.id || u.userid;
              if (uid) {
                memberDetails.push({
                  id: String(uid),
                  name: u.nickname || u.name || String(uid),
                });
              }
            });
          } catch {
             // Ignore fetch errors, fallback to IDs
          }
        }

        // Add missing IDs (non-numeric or failed fetch)
        memberIds.forEach(mid => {
          if (!memberDetails.find(m => m.id === mid)) {
             memberDetails.push({ id: mid, name: mid }); // Fallback name = id
          }
        });
        
        if (!active) return;
        setRoleMembers(memberDetails);

        // Auto-select if single member
        if (memberDetails.length === 1) {
          setFormState(prev => {
            // Only update if not already set to avoid loops
            if (prev.approverId === memberDetails[0].id) return prev;
            return {
              ...prev,
              approverId: memberDetails[0].id,
              approverName: memberDetails[0].name
            };
          });
        }
      } catch (err) {
          if (!active) return;
          console.error("Failed to resolve role members", err);
      } finally {
          if (active) setLoadingRole(false);
      }
    }

    resolveRole();
    return () => { active = false; };
  }, [defaultRoleApproverId, isChinese, feedback]);

  useEffect(() => {
    if (!currentConfig) return;

    if (currentConfig.defaultApproverType === "user") {
      if (userApproverCandidates.length === 1) {
        const onlyId = userApproverCandidates[0];
        setFormState((prev) => {
          if (prev.approverId === onlyId) return prev;
          return {
            ...prev,
            approverId: onlyId,
          };
        });
      }
    }
  }, [currentConfig, userApproverCandidates]);

  useEffect(() => {
    if (!currentConfig || currentConfig.defaultApproverType !== "user") {
      setUserCandidates((prev) => (prev.length ? [] : prev));
      return;
    }
    if (userApproverCandidates.length <= 1) {
      setUserCandidates((prev) => (prev.length ? [] : prev));
      return;
    }

    let active = true;
    async function loadCandidates() {
      setLoadingUserCandidates(true);
      try {
        const memberDetails: Array<{ id: string; name: string }> = [];
        const numericIds = userApproverCandidates
          .map((id) => Number(id))
          .filter((n) => Number.isFinite(n));

        if (numericIds.length > 0) {
          try {
            const users = await fetchUserBasicBatched(numericIds);
            if (!active) return;
            users.forEach((u) => {
              const uid = u.id || u.userid;
              if (uid) {
                memberDetails.push({
                  id: String(uid),
                  name: u.nickname || u.name || String(uid),
                });
              }
            });
          } catch {
            // ignore
          }
        }

        userApproverCandidates.forEach((id) => {
          if (!memberDetails.find((item) => item.id === id)) {
            memberDetails.push({ id, name: id });
          }
        });

        if (!active) return;
        setUserCandidates(memberDetails);
      } finally {
        if (active) setLoadingUserCandidates(false);
      }
    }
    loadCandidates();
    return () => {
      active = false;
    };
  }, [currentConfig, userApproverCandidates]);

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

  const normalizeSelectedUsers = (result: SelectUsersReturn | undefined) => {
    if (!result) return [];
    if (Array.isArray(result)) return result;
    if (Array.isArray(result.users)) return result.users;
    return [];
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
    if (!currentConfig || currentConfig.defaultApproverType !== "none") {
      return;
    }
    if (!canUseSelector) return;
    
    // If role members are loaded and we have > 1, we can let user pick from them
    // But the UI below handles this with a Select if roleMembers > 0.
    // This handler is mainly for the generic user picker.
    
    setSelectingApprover(true);
    try {
      const result = (await selectUsers({
        multipleMax: 1,
        showSelectAll: false,
        showDialog: false,
      }).catch(() => null)) as SelectUsersReturn;
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
      const message = extractApiErrorMessage(
        err,
        isChinese ? "选择审批人失败。" : "Failed to select approver.",
      );
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
    if (!currentConfig || currentConfig.defaultApproverType !== "none") {
      return;
    }
    setFormState((prev) => ({
      ...prev,
      approverId: "",
      approverName: "",
    }));
  };

  const handleSelectCc = async () => {
    if (!canUseSelector) return;
    setSelectingCc(true);
    try {
      const result = (await selectUsers({
        multipleMax: 20,
        showSelectAll: true,
        showDialog: false,
      }).catch(() => null)) as SelectUsersReturn;

      const rawUsers = normalizeSelectedUsers(result);
      const picks: CcRecipient[] = [];
      rawUsers.forEach((entry) => {
        if (entry === null || entry === undefined) return;
        if (typeof entry === "string" || typeof entry === "number") {
          const id = String(entry).trim();
          if (!id) return;
          picks.push({ id });
          return;
        }
        const id = String(entry.userid ?? entry.id ?? "").trim();
        if (!id) return;
        const name = (entry.nickname ?? entry.name ?? "").trim();
        picks.push(name ? { id, name } : { id });
      });

      const unique = new Map<string, CcRecipient>();
      picks.forEach((pick) => {
        if (!unique.has(pick.id)) {
          unique.set(pick.id, pick);
        }
      });

      const selected = Array.from(unique.values());
      const missingNames = selected
        .filter((pick) => !pick.name)
        .map((pick) => pick.id);

      if (missingNames.length > 0) {
        const users = await fetchUserBasicBatched(missingNames);
        const nameMap: Record<string, string> = {};
        users.forEach((user) => {
          const rawId = user.userid ?? user.id;
          const uid =
            rawId !== undefined && rawId !== null ? String(rawId).trim() : "";
          const userName = user.nickname ?? user.name ?? "";
          if (!uid || !userName) return;
          nameMap[uid] = userName;
        });
        selected.forEach((pick) => {
          if (!pick.name && nameMap[pick.id]) {
            pick.name = nameMap[pick.id];
          }
        });
      }

      setCcRecipients(selected);
    } catch (err) {
      const message = extractApiErrorMessage(
        err,
        isChinese ? "选择抄送人失败。" : "Failed to select CC recipients.",
      );
      feedback.error(message, {
        blocking: true,
        title: isChinese ? "选择失败" : "Selection failed",
        acknowledgeLabel: isChinese ? "知道了" : "Got it",
      });
    } finally {
      setSelectingCc(false);
    }
  };

  const handleRemoveCc = (id: string) => {
    setCcRecipients((prev) => prev.filter((entry) => entry.id !== id));
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
    operationTemplateFields
      .filter((field) => field.widget === "attachments")
      .reduce((total, field) => {
        const raw = operationFieldValues[field.key];
        const attachments = toAttachmentArray(raw);
        return total + attachments.length;
      }, 0);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);

    try {
      for (const field of operationTemplateFields) {
        if (field.widget === "attachments") {
          const attachments = toAttachmentArray(operationFieldValues[field.key]);
          if (field.required && attachments.length === 0) {
            throw new Error(
              isChinese
                ? `${field.labelZh} 为必填项`
                : `${field.labelEn} is required`,
            );
          }
        } else if (field.required) {
          const rawValue = operationFieldValues[field.key];
          if (typeof rawValue !== "string" || !rawValue.trim()) {
            throw new Error(
              isChinese
                ? `${field.labelZh} 为必填项`
                : `${field.labelEn} is required`,
            );
          }
        }
      }

      if (currentOperationTemplate?.requireAttachment) {
        const attachmentCount = countAttachmentEntries();
        if (attachmentCount === 0) {
          throw new Error(
            isChinese
              ? "该审批类型需要至少一个附件。"
              : "This approval requires at least one attachment.",
          );
        }
        if (
          operationTemplateType === "inbound" &&
          attachmentCount < MIN_INBOUND_ATTACHMENTS
        ) {
          throw new Error(
            isChinese
              ? `入库审批需至少上传 ${MIN_INBOUND_ATTACHMENTS} 张照片或附件链接。`
              : `Inbound approvals require at least ${MIN_INBOUND_ATTACHMENTS} photo attachments.`,
          );
        }
      }

      const operationFieldEntries: [string, OperationTemplateFieldValue][] =
        [];
      operationTemplateFields.forEach((field) => {
        const raw = operationFieldValues[field.key];
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
      await client.post<{
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
        cc: ccRecipients.map((entry) => ({
          id: entry.id,
          name: entry.name,
        })),
        metadata: metadataPayload,
      });

      setFormState({
        type: selectableTypes[0]?.value ?? APPROVAL_TYPES[0].value,
        title: "",
        reason: "",
        approverId: "",
        approverName: "",
      });
      setOperationFieldValues({});
      setCcRecipients([]);
      router.refresh();
      feedback.success(isChinese ? "审批已提交" : "Approval submitted");
    } catch (err) {
      const message = extractApiErrorMessage(
        err,
        isChinese ? "提交失败，请稍后再试。" : "Failed to create approval request.",
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

  const renderOperationField = (field: OperationTemplateField) => {
    const rawValue = operationFieldValues[field.key];
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
        currentOperationTemplate?.requireAttachment &&
        operationTemplateType === "inbound";
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
                locale={isChinese ? zhCN : enUS}
                captionLayout="dropdown"
                weekStartsOn={0}
                startMonth={new Date(new Date().getFullYear() - 5, 0)}
                endMonth={new Date(new Date().getFullYear() + 5, 11)}
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
            {isChinese ? "允许更换审批人：" : "Reassign allowed:"}{" "}
            {allowReassign
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
            {selectableTypes.map((type) => (
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
          className="gap-1 text-xs font-medium text-muted-foreground"
        >
          {isChinese ? "标题" : "Title"}
          <span className="text-destructive">*</span>
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
          className="gap-1 text-xs font-medium text-muted-foreground"
        >
          {isChinese ? "事由" : "Reason"}
          <span className="text-destructive">*</span>
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
                {operationTemplateType === "inbound"
                  ? isChinese
                    ? `需要至少上传 ${MIN_INBOUND_ATTACHMENTS} 张入库照片（不同角度）。`
                    : `Upload at least ${MIN_INBOUND_ATTACHMENTS} inbound photos (different angles).`
                  : isChinese
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
          className="gap-1 text-xs font-medium text-muted-foreground"
        >
          {isChinese ? "申请人 ID" : "Applicant ID"}
          <span className="text-destructive">*</span>
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
        <Label className="gap-1 text-xs font-medium text-muted-foreground">
          {isChinese ? "审批人" : "Approver"}
          <span className="text-destructive">*</span>
        </Label>
        
        {/* Case 1: Role-based multiple members */}
        {currentConfig?.defaultApproverType === "role" && roleMembers.length > 1 && (
          <Select
            value={formState.approverId}
            onValueChange={(val) => {
              const member = roleMembers.find(m => m.id === val);
              setFormState(prev => ({
                ...prev,
                approverId: val,
                approverName: member?.name ?? ""
              }));
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={isChinese ? "请选择审批人" : "Select an approver"} />
            </SelectTrigger>
            <SelectContent>
              {roleMembers.map(member => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name} ({member.id})
                </SelectItem>
              ))}
          </SelectContent>
          </Select>
        )}

        {/* Case 2: User-based multiple candidates */}
        {currentConfig?.defaultApproverType === "user" && userCandidates.length > 1 && (
          <Select
            value={formState.approverId}
            onValueChange={(val) => {
              const match = userCandidates.find((item) => item.id === val);
              setFormState((prev) => ({
                ...prev,
                approverId: val,
                approverName: match?.name ?? "",
              }));
            }}
            disabled={loadingUserCandidates}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={isChinese ? "请选择审批人" : "Select an approver"} />
            </SelectTrigger>
            <SelectContent>
              {userCandidates.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name} ({member.id})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Case 3: None -> pick any approver (must be approver user) */}
        {currentConfig?.defaultApproverType === "none" ? (
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
                  className="gap-1 text-xs text-muted-foreground"
                >
                  {isChinese ? "审批人 ID" : "Approver ID"}
                  <span className="text-destructive">*</span>
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
                  {isChinese ? "审批人姓名" : "Approver name"}
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
        ) : null}

        {/* Keep UI minimal; backend validates approver selection. */}
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">
          {isChinese ? "抄送给" : "CC"}
        </Label>
        {canUseSelector ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => void handleSelectCc()}
              disabled={selectingCc}
            >
              {selectingCc
                ? isChinese
                  ? "选择中..."
                  : "Selecting..."
                : isChinese
                  ? "选择抄送人"
                  : "Select CC"}
            </Button>
            {ccRecipients.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {ccRecipients.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-sm"
                  >
                    <span className="font-medium">
                      {entry.name || entry.id}
                    </span>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => handleRemoveCc(entry.id)}
                      aria-label={isChinese ? "移除抄送人" : "Remove CC"}
                    >
                      <XICon className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {isChinese
              ? "仅在 DooTask 宿主内可选择抄送人。"
              : "CC selection is available in DooTask host only."}
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
