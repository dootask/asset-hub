"use client";

import { useRouter } from "next/navigation";
import { useState, FormEvent, useId, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppFeedback } from "@/components/providers/feedback-provider";
import { getApiClient } from "@/lib/http/client";
import { extractApiErrorMessage } from "@/lib/utils/api-error";
import type { AssetCategory } from "@/lib/types/asset-category";
import type { Asset } from "@/lib/types/asset";
import type { Company } from "@/lib/types/system";
import type { Role } from "@/lib/types/system";
import { Switch } from "@/components/ui/switch";
import {
  selectUsers,
  isMicroApp,
  appReady,
  fetchUserBasic,
} from "@dootask/tools";
import type { ActionConfig } from "@/lib/types/action-config";
import { approvalTypeToActionConfigId } from "@/lib/utils/action-config";
import { deriveOperationTemplateFields } from "@/lib/config/operation-template-fields";
import type {
  OperationTemplate,
  OperationTemplateField,
  OperationTemplateFieldValue,
  OperationTemplateMetadata,
  OperationTemplateSnapshot,
} from "@/lib/types/operation-template";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  Calendar as CalendarIcon,
  Check,
  ChevronsUpDown,
  X as XICon,
} from "lucide-react";
import { AttachmentUploadField } from "@/components/attachments/AttachmentUploadField";
import { getStoredAuth } from "@/lib/utils/auth-storage";
import { enUS, zhCN } from "react-day-picker/locale";
import { fetchUserBasicBatched } from "@/lib/utils/dootask-users";

type Props = {
  locale?: string;
  categories: AssetCategory[];
  companies: Company[];
};

type FieldValue = string | string[];

type CcRecipient = { id: string; name?: string };

const EMPTY_STRING_ARRAY: string[] = [];

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

export default function NewPurchaseForm({
  locale = "en",
  categories,
  companies,
}: Props) {
  const router = useRouter();
  const isChinese = locale === "zh";
  const feedback = useAppFeedback();
  const [submitting, setSubmitting] = useState(false);
  const [canUseSelector, setCanUseSelector] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);
  const [selectingApprover, setSelectingApprover] = useState(false);
  const [selectingCc, setSelectingCc] = useState(false);
  const [ccRecipients, setCcRecipients] = useState<CcRecipient[]>([]);

  // Applicant info
  const [applicant, setApplicant] = useState({ id: "", name: "" });

  // Config loading
  const [config, setConfig] = useState<ActionConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Role resolution
  const [, setLoadingRole] = useState(false);
  const [roleMembers, setRoleMembers] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [loadingUserCandidates, setLoadingUserCandidates] = useState(false);
  const [userCandidates, setUserCandidates] = useState<
    Array<{ id: string; name: string }>
  >([]);

  // Operation template state
  const [templates, setTemplates] = useState<OperationTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [operationFieldValues, setOperationFieldValues] = useState<
    Record<string, FieldValue>
  >({});
  const [operationDatePicker, setOperationDatePicker] = useState<string | null>(
    null,
  );
  const [syncPurchasePrice, setSyncPurchasePrice] = useState(true);

  const [formState, setFormState] = useState({
    title: "",
    reason: "",
    assetName: "",
    assetCategory: categories[0]?.code ?? "",
    assetCompany: companies[0]?.code ?? "",
    approverId: "",
    approverName: "",
  });

  const [purchaseAssetMode, setPurchaseAssetMode] = useState<
    "new" | "existing"
  >("new");
  const [existingAssetOpen, setExistingAssetOpen] = useState(false);
  const [existingAssetSearch, setExistingAssetSearch] = useState("");
  const [existingAssetOptions, setExistingAssetOptions] = useState<Asset[]>([]);
  const [loadingExistingAssets, setLoadingExistingAssets] = useState(false);
  const [selectedExistingAsset, setSelectedExistingAsset] =
    useState<Asset | null>(null);

  const [isTitleModified, setIsTitleModified] = useState(false);

  const fieldIds = {
    title: useId(),
    reason: useId(),
    purchaseAssetMode: useId(),
    assetName: useId(),
    assetCategory: useId(),
    assetCompany: useId(),
    existingAssetSearch: useId(),
    existingAssetId: useId(),
    approverId: useId(),
    approverName: useId(),
  };

  // Init user & environment
  useEffect(() => {
    async function init() {
      try {
        const micro = await isMicroApp();
        if (micro) {
          await appReady();
          setCanUseSelector(true);
        }
      } catch {}

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
    }
    init();
  }, []);

  // Load config
  useEffect(() => {
    async function loadConfig() {
      try {
        const client = await getApiClient();
        const { data } = await client.get<{ data: ActionConfig[] }>(
          "/apps/asset-hub/api/config/approvals",
        );
        const purchaseConfigId = approvalTypeToActionConfigId("purchase");
        const found = data.data.find((c) => c.id === purchaseConfigId);
        setConfig(found || null);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingConfig(false);
      }
    }
    loadConfig();
  }, []);

  // Load operation templates (for purchase)
  useEffect(() => {
    let cancelled = false;
    async function loadTemplates() {
      setLoadingTemplates(true);
      try {
        const client = await getApiClient();
        const { data } = await client.get<{ data: OperationTemplate[] }>(
          "/apps/asset-hub/api/config/operations",
          { headers: { "Cache-Control": "no-cache" } },
        );
        if (!cancelled) {
          setTemplates(data.data);
          setTemplateError(null);
        }
      } catch (err) {
        if (!cancelled) {
          const message = extractApiErrorMessage(
            err,
            isChinese
              ? "无法加载操作模板，请稍后再试。"
              : "Failed to load operation templates.",
          );
          setTemplateError(message);
          feedback.error(message);
        }
      } finally {
        if (!cancelled) {
          setLoadingTemplates(false);
        }
      }
    }
    loadTemplates();
    return () => {
      cancelled = true;
    };
  }, [feedback, isChinese]);

  const userApproverCandidates = useMemo(() => {
    if (!config || config.defaultApproverType !== "user") {
      return EMPTY_STRING_ARRAY;
    }
    return config.defaultApproverRefs ?? EMPTY_STRING_ARRAY;
  }, [config]);
  const defaultApproverId =
    userApproverCandidates.length === 1 ? userApproverCandidates[0] : null;

  const defaultRoleApproverId =
    config?.defaultApproverType === "role" &&
    config.defaultApproverRefs.length > 0
      ? config.defaultApproverRefs[0]
      : null;

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
        const client = await getApiClient();
        const roleRes = await client.get<{ data: Role }>(
          `/apps/asset-hub/api/system/roles/${defaultRoleApproverId}`,
        );
        const role = roleRes.data.data;
        const memberIds = role.members;

        if (!active) return;

        if (memberIds.length === 0) {
          feedback.error(
            isChinese
              ? `角色 "${role.name}" 暂无成员，请联系管理员配置。`
              : `Role "${role.name}" has no members. Contact admin.`,
          );
          setRoleMembers([]);
          return;
        }

        const memberDetails: Array<{ id: string; name: string }> = [];
        const numericIds = memberIds
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
            // Ignore fetch errors
          }
        }

        memberIds.forEach((mid) => {
          if (!memberDetails.find((m) => m.id === mid)) {
            memberDetails.push({ id: mid, name: mid });
          }
        });

        if (!active) return;
        setRoleMembers(memberDetails);

        if (memberDetails.length === 1) {
          setFormState((prev) => {
            if (prev.approverId === memberDetails[0].id) return prev;
            return {
              ...prev,
              approverId: memberDetails[0].id,
              approverName: memberDetails[0].name,
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
    return () => {
      active = false;
    };
  }, [defaultRoleApproverId, isChinese, feedback]);

  // Set default user approver
  useEffect(() => {
    if (defaultApproverId) {
      setFormState((prev) => {
        if (prev.approverId) return prev;
        return {
          ...prev,
          approverId: defaultApproverId,
        };
      });
    }
  }, [defaultApproverId]);

  useEffect(() => {
    if (!config || config.defaultApproverType !== "user") {
      setUserCandidates([]);
      return;
    }
    if (userApproverCandidates.length <= 1) {
      setUserCandidates([]);
      return;
    }

    let active = true;
    async function loadCandidates() {
      setLoadingUserCandidates(true);
      try {
        const details: Array<{ id: string; name: string }> = [];
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
                details.push({
                  id: String(uid),
                  name: u.nickname || u.name || String(uid),
                });
              }
            });
          } catch {}
        }

        userApproverCandidates.forEach((id) => {
          if (!details.find((entry) => entry.id === id)) {
            details.push({ id, name: id });
          }
        });

        if (!active) return;
        setUserCandidates(details);
      } finally {
        if (active) setLoadingUserCandidates(false);
      }
    }

    loadCandidates();
    return () => {
      active = false;
    };
  }, [config, userApproverCandidates]);

  // Auto-fill title if not modified manually
  const titleSeed =
    purchaseAssetMode === "existing"
      ? selectedExistingAsset?.name
      : formState.assetName;

  useEffect(() => {
    if (!isTitleModified && titleSeed) {
      setFormState((prev) => ({
        ...prev,
        title: isChinese
          ? `采购申请 - ${titleSeed}`
          : `Purchase Request - ${titleSeed}`,
      }));
    }
  }, [titleSeed, isTitleModified, isChinese]);

  useEffect(() => {
    if (purchaseAssetMode !== "existing") {
      setExistingAssetSearch("");
      setExistingAssetOptions([]);
      setSelectedExistingAsset(null);
      setExistingAssetOpen(false);
      return;
    }

    let active = true;
    const handle = setTimeout(async () => {
      setLoadingExistingAssets(true);
      try {
        const search = existingAssetSearch.trim();
        const params = new URLSearchParams({ pageSize: "20" });
        if (search) params.set("search", search);
        const client = await getApiClient();
        const { data } = await client.get<{
          data: Asset[];
          meta: { total: number; page: number; pageSize: number };
        }>(`/apps/asset-hub/api/assets?${params.toString()}`, {
          headers: { "Cache-Control": "no-cache" },
        });
        if (!active) return;
        setExistingAssetOptions(data.data);
      } catch (err) {
        if (!active) return;
        const message = extractApiErrorMessage(
          err,
          isChinese
            ? "无法加载资产列表，请稍后再试。"
            : "Failed to load assets.",
        );
        feedback.error(message);
      } finally {
        if (active) setLoadingExistingAssets(false);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(handle);
    };
  }, [purchaseAssetMode, existingAssetSearch, feedback, isChinese]);

  // Operation template derived state
  const templateMap = useMemo(() => {
    return templates.reduce((map, tpl) => {
      map.set(tpl.type, tpl);
      return map;
    }, new Map<OperationTemplate["type"], OperationTemplate>());
  }, [templates]);

  const operationTemplateType = "purchase";
  const currentOperationTemplate =
    templateMap.get(operationTemplateType) ?? null;
  const operationTemplateFields = useMemo(
    () =>
      deriveOperationTemplateFields(
        operationTemplateType,
        currentOperationTemplate,
      ),
    [operationTemplateType, currentOperationTemplate],
  );

  const hasCostField = useMemo(
    () =>
      operationTemplateFields.some(
        (field) => field.key === "cost" && field.widget === "number",
      ),
    [operationTemplateFields],
  );

  const rawCostValue =
    typeof operationFieldValues.cost === "string"
      ? operationFieldValues.cost.trim()
      : "";

  useEffect(() => {
    setSyncPurchasePrice(purchaseAssetMode === "new");
  }, [purchaseAssetMode]);

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

  const hasOperationAttachmentValue = () =>
    operationTemplateFields
      .filter((field) => field.widget === "attachments")
      .some((field) => toAttachmentArray(operationFieldValues[field.key]).length > 0);

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
            helperText={helper}
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
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formatOperationDateLabel(value)}
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
                  setOperationFieldValues((prev) => ({
                    ...prev,
                    [field.key]: date.toISOString().slice(0, 10),
                  }));
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
              setOperationFieldValues((prev) => ({
                ...prev,
                [field.key]: event.target.value,
              }))
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
            setOperationFieldValues((prev) => ({
              ...prev,
              [field.key]: event.target.value,
            }))
          }
        />
        {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
      </div>
    );
  };

  const resolveSelectedApprover = async (entry: DootaskUser | null) => {
    if (!entry) return null;
    let id = "";
    let name = "";

    if (typeof entry === "string" || typeof entry === "number") {
      id = String(entry);
    } else {
      id = entry.userid || entry.id || "";
      name = entry.nickname || entry.name || "";
    }

    if (id && !name) {
      try {
        const list = await fetchUserBasic([Number(id)]);
        if (Array.isArray(list) && list[0]) {
          name = list[0].nickname || list[0].name || "";
        }
      } catch {}
    }
    return { id, name };
  };

  const normalizeSelectedUsers = (result: SelectUsersReturn | null | undefined) => {
    if (!result) return [];
    if (Array.isArray(result)) return result;
    if (Array.isArray(result.users)) return result.users;
    return [];
  };

  const handleSelectApprover = async () => {
    if (config?.defaultApproverType !== "none") return;

    setSelectingApprover(true);
    try {
      const result = (await selectUsers({
        multipleMax: 1,
        showSelectAll: false,
        showDialog: false,
      }).catch(() => null)) as SelectUsersReturn;

      let entry: DootaskUser | null = null;
      if (Array.isArray(result)) entry = result[0];
      else if (Array.isArray(result?.users)) entry = result.users?.[0];

      const resolved = await resolveSelectedApprover(entry);
      if (resolved && resolved.id) {
        setFormState((prev) => ({
          ...prev,
          approverId: resolved.id,
          approverName: resolved.name,
        }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSelectingApprover(false);
    }
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
      feedback.error(message);
    } finally {
      setSelectingCc(false);
    }
  };

  const handleRemoveCc = (id: string) => {
    setCcRecipients((prev) => prev.filter((entry) => entry.id !== id));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const submitApproval = async () => {
      setSubmitting(true);
      try {
      if (!applicant.id) {
        throw new Error(isChinese ? "缺少申请人信息" : "Missing applicant info");
      }

      if (purchaseAssetMode === "existing") {
        if (!selectedExistingAsset?.id) {
          throw new Error(
            isChinese ? "请选择要关联的资产" : "Please select an asset",
          );
        }
      } else {
        if (!formState.assetName.trim()) {
          throw new Error(isChinese ? "请填写资产名称" : "Asset name is required");
        }
        if (!formState.assetCategory.trim()) {
          throw new Error(
            isChinese ? "请选择资产类别" : "Asset category is required",
          );
        }
        if (!formState.assetCompany.trim()) {
          throw new Error(
            isChinese ? "请选择所属公司" : "Company is required",
          );
        }
      }

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

      if (
        currentOperationTemplate?.requireAttachment &&
        !hasOperationAttachmentValue()
      ) {
        throw new Error(
          isChinese
            ? "该审批类型需要至少一个附件。"
            : "This approval requires at least one attachment.",
        );
      }

      const operationFieldEntries: [string, OperationTemplateFieldValue][] = [];
      operationTemplateFields.forEach((field) => {
        const raw = operationFieldValues[field.key];
        const normalized = normalizeOperationFieldValue(field, raw);
        if (normalized !== undefined) {
          operationFieldEntries.push([field.key, normalized]);
        }
      });

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
                    labelZh: isChinese ? "采购" : "Purchase",
                    labelEn: "Purchase",
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

      const configSnapshot = config
        ? {
            id: config.id,
            requiresApproval: config.requiresApproval,
            allowOverride: config.allowOverride,
            defaultApproverType: config.defaultApproverType,
          }
        : undefined;

      const syncPurchasePriceToAsset = Boolean(
        syncPurchasePrice && hasCostField && rawCostValue,
      );

      const metadataBase: Record<string, unknown> = {
        purchaseAsset: {
          mode: purchaseAssetMode,
          ...(purchaseAssetMode === "existing" && selectedExistingAsset?.id
            ? { assetId: selectedExistingAsset.id }
            : {}),
        },
        ...(purchaseAssetMode === "new"
          ? {
              newAsset: {
                name: formState.assetName,
                category: formState.assetCategory,
                companyCode: formState.assetCompany,
              },
            }
          : {}),
        initiatedFrom: "approvals-new",
        ...(configSnapshot ? { configSnapshot } : {}),
        ...(syncPurchasePriceToAsset ? { syncPurchasePrice: true } : {}),
      };

      const metadata =
        operationTemplateMetadata !== undefined
          ? {
              ...metadataBase,
              operationTemplate: operationTemplateMetadata,
            }
          : metadataBase;

      const client = await getApiClient();
      await client.post("/apps/asset-hub/api/approvals", {
        type: "purchase",
        title: formState.title,
        reason: formState.reason,
        applicant: { id: applicant.id, name: applicant.name },
        cc: ccRecipients.map((entry) => ({ id: entry.id, name: entry.name })),
        ...(purchaseAssetMode === "existing" && selectedExistingAsset?.id
          ? { assetId: selectedExistingAsset.id }
          : {}),
        approver: formState.approverId
          ? { id: formState.approverId, name: formState.approverName }
          : undefined,
        metadata,
      });

      feedback.success(
        isChinese ? "采购申请已提交" : "Purchase request submitted",
      );
      router.push(`/${locale}/approvals?role=my-requests`);
      router.refresh();
      } catch (err) {
        const message = extractApiErrorMessage(
          err,
          isChinese ? "请求参数有误，请检查表单。" : "Invalid request parameters.",
        );
        feedback.error(message);
      } finally {
        setSubmitting(false);
      }
    };

    if (
      purchaseAssetMode === "existing" &&
      hasCostField &&
      syncPurchasePrice &&
      rawCostValue
    ) {
      feedback.error("", {
        blocking: true,
        variant: "warning",
        title: isChinese ? "确认覆盖采购价格" : "Confirm overwrite purchase price",
        description: isChinese
          ? "已选择同步“费用”到资产采购价格，这会覆盖该资产当前的采购价格。是否继续提交？"
          : "You chose to sync cost into the asset purchase price. This will overwrite the current purchase price. Continue?",
        primaryAction: {
          label: isChinese ? "继续提交" : "Continue",
          onClick: () => void submitApproval(),
        },
        secondaryAction: {
          label: isChinese ? "取消" : "Cancel",
        },
      });
      return;
    }

    await submitApproval();
  };

  const requiresApproval = config?.requiresApproval ?? true;

  if (!loadingConfig && !requiresApproval) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        {isChinese
          ? "当前采购流程无需审批，请直接在资产列表新增资产。"
          : "Purchase approval is disabled. Please create assets directly."}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label
            htmlFor={fieldIds.purchaseAssetMode}
            className="text-xs font-medium text-muted-foreground"
          >
            {isChinese ? "资产处理方式" : "Asset Handling"}{" "}
            <span className="text-destructive">*</span>
          </Label>
          <Select
            value={purchaseAssetMode}
            onValueChange={(val) =>
              setPurchaseAssetMode(val as "new" | "existing")
            }
          >
            <SelectTrigger id={fieldIds.purchaseAssetMode} className="w-full">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">
                {isChinese ? "新增资产（审批通过后自动创建）" : "Create a new asset"}
              </SelectItem>
              <SelectItem value="existing">
                {isChinese ? "关联已有资产（不新增资产）" : "Link an existing asset"}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {purchaseAssetMode === "new" ? (
          <>
            <div className="space-y-1.5 sm:col-span-2">
              <Label
                htmlFor={fieldIds.assetName}
                className="text-xs font-medium text-muted-foreground"
              >
                {isChinese ? "资产名称" : "Asset Name"}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id={fieldIds.assetName}
                required
                value={formState.assetName}
                onChange={(e) =>
                  setFormState({ ...formState, assetName: e.target.value })
                }
                placeholder={
                  isChinese ? "例如：MacBook Pro M3" : "e.g. MacBook Pro M3"
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor={fieldIds.assetCompany}
                className="text-xs font-medium text-muted-foreground"
              >
                {isChinese ? "所属公司" : "Company"}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formState.assetCompany}
                onValueChange={(val) =>
                  setFormState({ ...formState, assetCompany: val })
                }
              >
                <SelectTrigger id={fieldIds.assetCompany} className="w-full">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.code}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor={fieldIds.assetCategory}
                className="text-xs font-medium text-muted-foreground"
              >
                {isChinese ? "资产类别" : "Category"}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formState.assetCategory}
                onValueChange={(val) =>
                  setFormState({ ...formState, assetCategory: val })
                }
              >
                <SelectTrigger id={fieldIds.assetCategory} className="w-full">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.code}>
                      {isChinese ? c.labelZh : c.labelEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        ) : (
          <div className="space-y-4 sm:col-span-2">
            <div className="space-y-1.5">
              <Label
                htmlFor={fieldIds.existingAssetId}
                className="text-xs font-medium text-muted-foreground"
              >
                {isChinese ? "选择要关联的资产" : "Select Asset"}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Popover
                open={existingAssetOpen}
                onOpenChange={setExistingAssetOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    id={fieldIds.existingAssetId}
                    variant="outline"
                    role="combobox"
                    aria-expanded={existingAssetOpen}
                    className="w-full justify-between"
                    type="button"
                  >
                    <span className="truncate">
                      {selectedExistingAsset
                        ? `${selectedExistingAsset.name} · ${selectedExistingAsset.id}`
                        : isChinese
                          ? "请选择资产..."
                          : "Select asset..."}
                    </span>
                    <ChevronsUpDown className="opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command shouldFilter={false}>
                    <CommandInput
                      id={fieldIds.existingAssetSearch}
                      placeholder={
                        isChinese
                          ? "输入资产名称/编号进行搜索..."
                          : "Search by name or ID..."
                      }
                      className="h-9"
                      value={existingAssetSearch}
                      onValueChange={setExistingAssetSearch}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {loadingExistingAssets
                          ? isChinese
                            ? "正在加载..."
                            : "Loading..."
                          : isChinese
                            ? "暂无匹配资产"
                            : "No matching assets."}
                      </CommandEmpty>
                      <CommandGroup>
                        {existingAssetOptions.map((asset) => (
                          <CommandItem
                            key={asset.id}
                            value={asset.id}
                            onSelect={(assetId) => {
                              const next =
                                selectedExistingAsset?.id === assetId
                                  ? null
                                  : existingAssetOptions.find(
                                      (item) => item.id === assetId,
                                    ) ?? null;
                              setSelectedExistingAsset(next);
                              setExistingAssetOpen(false);
                            }}
                          >
                            <span className="truncate">
                              {asset.name} · {asset.assetNo || asset.id}
                            </span>
                            <Check
                              className={cn(
                                "ml-auto",
                                selectedExistingAsset?.id === asset.id
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                            />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2 rounded-2xl border bg-muted/20 p-4">
        <div>
          <p className="text-sm font-semibold">
            {isChinese ? "操作详情" : "Operation Details"}
          </p>
          <p className="text-xs text-muted-foreground">
            {isChinese
              ? "字段来自系统管理的操作模板配置，提交后会随审批一并保存。"
              : "Fields come from the system operation template and will be saved with this approval."}
          </p>
        </div>

        {templateError && (
          <p className="rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
            {templateError}
          </p>
        )}

        {loadingTemplates && !templateError && (
          <p className="text-xs text-muted-foreground">
            {isChinese ? "正在加载操作模板..." : "Loading operation template..."}
          </p>
        )}

        {!loadingTemplates && !templateError && (
          <div className="grid gap-4 sm:grid-cols-2">
            {operationTemplateFields.map((field) => renderOperationField(field))}
          </div>
        )}

        {hasCostField && (
          <div className="mt-4 flex items-start justify-between gap-3 rounded-2xl border bg-card/60 p-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {isChinese ? "同步采购价格" : "Sync purchase price"}
              </p>
              <p className="text-xs text-muted-foreground">
                {purchaseAssetMode === "existing"
                  ? isChinese
                    ? "可将操作详情中的“费用”同步为该资产的采购价格（会覆盖原值）。"
                    : "Sync operation cost into this asset purchase price (will overwrite)."
                  : isChinese
                    ? "可将操作详情中的“费用”同步为新资产的采购价格。"
                    : "Sync operation cost into the new asset purchase price."}
              </p>
              {!rawCostValue && (
                <p className="text-xs text-muted-foreground">
                  {isChinese
                    ? "填写费用后可启用同步。"
                    : "Enter a cost value to enable syncing."}
                </p>
              )}
            </div>
            <Switch
              checked={syncPurchasePrice}
              disabled={!rawCostValue}
              onCheckedChange={(checked) => setSyncPurchasePrice(checked)}
            />
          </div>
        )}

        {currentOperationTemplate?.requireAttachment && (
          <p className="text-xs text-destructive">
            {isChinese
              ? "当前操作需要至少上传一个附件（使用逗号或换行分隔）。"
              : "At least one attachment is required (separate by comma or newline)."}
          </p>
        )}
      </div>

      <div className="space-y-4 border-t pt-4 border-dashed">
        <div className="space-y-1.5">
          <Label
            htmlFor={fieldIds.title}
            className="text-xs font-medium text-muted-foreground"
          >
            {isChinese ? "审批标题" : "Title"}{" "}
            <span className="text-destructive">*</span>
          </Label>
          <Input
            id={fieldIds.title}
            required
            value={formState.title}
            onChange={(e) => {
              setFormState({ ...formState, title: e.target.value });
              setIsTitleModified(true);
            }}
          />
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor={fieldIds.reason}
            className="text-xs font-medium text-muted-foreground"
          >
            {isChinese ? "申请事由" : "Reason"}{" "}
            <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id={fieldIds.reason}
            required
            rows={3}
            value={formState.reason}
            onChange={(e) =>
              setFormState({ ...formState, reason: e.target.value })
            }
          />
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor={fieldIds.approverId}
            className="text-xs font-medium text-muted-foreground"
          >
            {isChinese ? "审批人" : "Approver"}{" "}
            <span className="text-destructive">*</span>
          </Label>

          {config?.defaultApproverType === "role" && roleMembers.length > 1 ? (
            <Select
              value={formState.approverId}
              onValueChange={(val) => {
                const member = roleMembers.find((m) => m.id === val);
                setFormState((prev) => ({
                  ...prev,
                  approverId: val,
                  approverName: member?.name ?? "",
                }));
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={
                    isChinese ? "请选择审批人" : "Select an approver"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {roleMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name} ({member.id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : config?.defaultApproverType === "user" && userCandidates.length > 1 ? (
            <Select
              value={formState.approverId}
              onValueChange={(val) => {
                const member = userCandidates.find((m) => m.id === val);
                setFormState((prev) => ({
                  ...prev,
                  approverId: val,
                  approverName: member?.name ?? "",
                }));
              }}
              disabled={loadingUserCandidates}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={isChinese ? "请选择审批人" : "Select an approver"}
                />
              </SelectTrigger>
              <SelectContent>
                {userCandidates.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name} ({member.id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : config?.defaultApproverType === "none" ? (
            canUseSelector ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
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
                {(formState.approverName || formState.approverId) && (
                  <div className="ml-2 flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-sm">
                    <span className="font-medium">
                      {formState.approverName || formState.approverId}
                    </span>
                    <button
                      type="button"
                      className="ml-1 hover:text-destructive"
                      onClick={() =>
                        setFormState({
                          ...formState,
                          approverId: "",
                          approverName: "",
                        })
                      }
                    >
                      <XICon className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
          ) : (
            <div className="flex gap-2">
              <Input
                id={fieldIds.approverId}
                  value={formState.approverId}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      approverId: e.target.value,
                    })
                  }
                  placeholder="User ID"
                  className="max-w-[120px]"
                />
                <Input
                  id={fieldIds.approverName}
                  value={formState.approverName}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      approverName: e.target.value,
                    })
                  }
                  placeholder="Name (Optional)"
                />
              </div>
            )
          ) : null}

          {/* Keep UI minimal; backend validates approver selection. */}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">
          {isChinese ? "抄送给" : "CC"}
        </Label>
        {canUseSelector ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
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
                      className="ml-1 hover:text-destructive"
                      onClick={() => handleRemoveCc(entry.id)}
                      aria-label={isChinese ? "移除抄送人" : "Remove CC"}
                    >
                      <XICon className="h-3 w-3" />
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

      <div className="flex items-center gap-3">
        <Button
          type="submit"
          disabled={
            submitting ||
            loadingConfig ||
            loadingUser ||
            loadingTemplates ||
            !formState.approverId ||
            (purchaseAssetMode === "existing"
              ? !selectedExistingAsset?.id
              : !formState.assetName) ||
            !formState.title
          }
          className="rounded-2xl px-8"
        >
          {submitting
            ? isChinese
              ? "提交中..."
              : "Submitting..."
            : isChinese
              ? "提交申请"
              : "Submit Request"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          className="rounded-2xl"
        >
          {isChinese ? "取消" : "Cancel"}
        </Button>
      </div>
    </form>
  );
}
