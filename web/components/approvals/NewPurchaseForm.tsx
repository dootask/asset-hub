"use client";

import { useRouter } from "next/navigation";
import { useState, FormEvent, useId, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppFeedback } from "@/components/providers/feedback-provider";
import { getApiClient } from "@/lib/http/client";
import type { AssetCategory } from "@/lib/types/asset-category";
import type { Company } from "@/lib/types/system";
import type { Role } from "@/lib/types/system";
import {
  selectUsers,
  isMicroApp,
  appReady,
  fetchUserBasic,
} from "@dootask/tools";
import type { ActionConfig } from "@/lib/types/action-config";
import { approvalTypeToActionConfigId } from "@/lib/utils/action-config";
import { X as XICon } from "lucide-react";

type Props = {
  locale?: string;
  categories: AssetCategory[];
  companies: Company[];
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

  // Applicant info
  const [applicant, setApplicant] = useState({ id: "", name: "" });

  // Config loading
  const [config, setConfig] = useState<ActionConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Role resolution
  const [loadingRole, setLoadingRole] = useState(false);
  const [roleMembers, setRoleMembers] = useState<
    Array<{ id: string; name: string }>
  >([]);

  const [formState, setFormState] = useState({
    title: "",
    reason: "",
    assetName: "",
    assetCategory: categories[0]?.code ?? "",
    assetCompany: companies[0]?.code ?? "",
    estimatedCost: "",
    approverId: "",
    approverName: "",
  });

  const [isTitleModified, setIsTitleModified] = useState(false);

  const fieldIds = {
    title: useId(),
    reason: useId(),
    assetName: useId(),
    assetCategory: useId(),
    assetCompany: useId(),
    estimatedCost: useId(),
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
        const raw = sessionStorage.getItem("asset-hub:dootask-user");
        if (raw) {
          const parsed = JSON.parse(raw);
          setApplicant({
            id: String(parsed.id ?? ""),
            name: parsed.nickname ?? "",
          });
        }
      } catch {
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

  const defaultApproverId =
    config?.defaultApproverType === "user" &&
    config.defaultApproverRefs.length > 0
      ? config.defaultApproverRefs[0]
      : null;

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
            const users = await fetchUserBasic(numericIds);
            if (Array.isArray(users)) {
              users.forEach((u) => {
                const uid = u.id || u.userid;
                if (uid) {
                  memberDetails.push({
                    id: String(uid),
                    name: u.nickname || u.name || String(uid),
                  });
                }
              });
            }
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

  // Auto-fill title if not modified manually
  useEffect(() => {
    if (!isTitleModified && formState.assetName) {
      setFormState((prev) => ({
        ...prev,
        title: isChinese
          ? `采购申请 - ${formState.assetName}`
          : `Purchase Request - ${formState.assetName}`,
      }));
    }
  }, [formState.assetName, isTitleModified, isChinese]);

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

  const handleSelectApprover = async () => {
    if (!config?.allowOverride && config?.defaultApproverType !== "none") {
      feedback.error(
        isChinese ? "当前配置不允许修改审批人" : "Approver override not allowed",
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      if (!applicant.id) {
        throw new Error(isChinese ? "缺少申请人信息" : "Missing applicant info");
      }

      const client = await getApiClient();
      await client.post("/apps/asset-hub/api/approvals", {
        type: "purchase",
        title: formState.title,
        reason: formState.reason,
        applicant: { id: applicant.id, name: applicant.name },
        approver: formState.approverId
          ? { id: formState.approverId, name: formState.approverName }
          : undefined,
        metadata: {
          newAsset: {
            name: formState.assetName,
            category: formState.assetCategory,
            companyCode: formState.assetCompany,
            estimatedCost: formState.estimatedCost,
          },
        },
      });

      feedback.success(
        isChinese ? "采购申请已提交" : "Purchase request submitted",
      );
      router.push(`/${locale}/approvals?role=my-requests`);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed";
      // Extract API error message if possible
      if (typeof msg === 'string' && msg.includes("Request failed with status code 400")) {
         // General fallback for 400 if no details
         feedback.error(isChinese ? "请求参数有误，请检查表单。" : "Invalid request parameters.");
      } else {
         feedback.error(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const allowOverride = config?.allowOverride ?? true;
  const requiresApproval = config?.requiresApproval ?? true;
  const approvalsDisabled = !requiresApproval;

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

        <div className="space-y-1.5">
          <Label
            htmlFor={fieldIds.estimatedCost}
            className="text-xs font-medium text-muted-foreground"
          >
            {isChinese ? "预估单价 (元)" : "Estimated Cost"}
          </Label>
          <Input
            id={fieldIds.estimatedCost}
            type="number"
            value={formState.estimatedCost}
            onChange={(e) =>
              setFormState({ ...formState, estimatedCost: e.target.value })
            }
            placeholder="0.00"
          />
        </div>
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

          {roleMembers.length > 1 ? (
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
          ) : roleMembers.length <= 1 && allowOverride ? (
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
                  readOnly={!allowOverride}
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
                  readOnly={!allowOverride}
                />
              </div>
            )
          ) : (
            <div className="rounded-2xl border border-dashed border-muted-foreground/40 bg-muted/20 px-3 py-2 text-sm font-medium text-foreground">
              {formState.approverId || defaultApproverId ? (
                <span>
                  {formState.approverName ||
                    formState.approverId ||
                    defaultApproverId}
                </span>
              ) : (
                <span className="text-destructive">
                  {isChinese
                    ? "尚未配置默认审批人，请联系管理员。"
                    : "No default approver configured. Please contact an admin."}
                </span>
              )}
            </div>
          )}

          {!allowOverride && roleMembers.length <= 1 && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              {isChinese
                ? "此操作由系统自动指派审批人，无法手动修改。"
                : "Approver is assigned automatically and cannot be changed."}
            </p>
          )}
          {allowOverride &&
            !formState.approverId &&
            !approvalsDisabled &&
            roleMembers.length === 0 && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                {isChinese
                  ? "请选择审批人后再提交。"
                  : "Please pick an approver before submitting."}
              </p>
            )}
          {roleMembers.length > 1 && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              {isChinese
                ? "请从该角色成员中选择一位审批人。"
                : "Please select one approver from the role members."}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          type="submit"
          disabled={
            submitting ||
            loadingConfig ||
            loadingUser ||
            !formState.approverId ||
            !formState.assetName ||
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
