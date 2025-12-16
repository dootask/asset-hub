"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { appReady, fetchUserBasic, isMicroApp, selectUsers } from "@dootask/tools";
import { fetchUserBasicBatched } from "@/lib/utils/dootask-users";
import {
  CONSUMABLE_ACTION_CONFIGS,
  type ConsumableActionConfig,
} from "@/lib/config/consumable-action-configs";
import {
  CONSUMABLE_OPERATION_TYPES,
  type ConsumableOperationType,
} from "@/lib/types/consumable-operation";
import { approvalTypeToActionConfigId } from "@/lib/utils/action-config";
import type { ApprovalType } from "@/lib/types/approval";
import type { ActionConfig } from "@/lib/types/action-config";
import type { Role } from "@/lib/types/system";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useAppFeedback } from "@/components/providers/feedback-provider";
import { getApiClient } from "@/lib/http/client";
import { extractApiErrorMessage } from "@/lib/utils/api-error";
import { getStoredAuth } from "@/lib/utils/auth-storage";

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

const EMPTY_STRING_ARRAY: string[] = [];

const CONFIG_MAP: Record<ConsumableOperationType, ConsumableActionConfig> =
  CONSUMABLE_ACTION_CONFIGS.reduce(
    (acc, config) => {
      acc[config.id] = config;
      return acc;
    },
    {} as Record<ConsumableOperationType, ConsumableActionConfig>,
  );

const TYPES_USING_QUANTITY: ConsumableOperationType[] = [
  "purchase",
  "inbound",
  "outbound",
  "adjust",
  "dispose",
];
const TYPES_USING_RESERVED: ConsumableOperationType[] = ["reserve", "release"];

const DEFAULT_DELTAS: Record<
  ConsumableOperationType,
  { quantityDelta: number; reservedDelta: number }
> = {
  purchase: { quantityDelta: 1, reservedDelta: 0 },
  inbound: { quantityDelta: 1, reservedDelta: 0 },
  outbound: { quantityDelta: -1, reservedDelta: 0 },
  reserve: { quantityDelta: 0, reservedDelta: 1 },
  release: { quantityDelta: 0, reservedDelta: -1 },
  adjust: { quantityDelta: 0, reservedDelta: 0 },
  dispose: { quantityDelta: -1, reservedDelta: 0 },
};

type Props = {
  consumableId: string;
  consumableName?: string;
  locale?: string;
  unit?: string;
};

export default function ConsumableOperationForm({
  consumableId,
  consumableName,
  locale = "en",
  unit = "pcs",
}: Props) {
  const router = useRouter();
  const isChinese = locale === "zh";
  const [operationType, setOperationType] =
    useState<ConsumableOperationType>("outbound");
  const [actor, setActor] = useState("");
  const [description, setDescription] = useState("");
  const [quantityDelta, setQuantityDelta] = useState<string>(
    DEFAULT_DELTAS.outbound.quantityDelta.toString(),
  );
  const [reservedDelta, setReservedDelta] = useState<string>(
    DEFAULT_DELTAS.outbound.reservedDelta.toString(),
  );
  const [reason, setReason] = useState("");
  const [applicant, setApplicant] = useState<{ id: string; name?: string }>({
    id: "",
    name: "",
  });
  const [approverId, setApproverId] = useState("");
  const [approverName, setApproverName] = useState("");
  const [configMap, setConfigMap] = useState<Record<string, ActionConfig>>({});
  const [selectorReady, setSelectorReady] = useState(false);
  const [selectingApprover, setSelectingApprover] = useState(false);
  const [roleMembers, setRoleMembers] = useState<Array<{ id: string; name: string }>>([]);
  const [, setLoadingRole] = useState(false);
  const [loadingUserCandidates, setLoadingUserCandidates] = useState(false);
  const [userCandidates, setUserCandidates] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const feedback = useAppFeedback();

  const requiresApproval = CONFIG_MAP[operationType]?.requiresApproval ?? false;
  const showQuantity = TYPES_USING_QUANTITY.includes(operationType);
  const showReserved = TYPES_USING_RESERVED.includes(operationType);

  const activeConfig =
    configMap[approvalTypeToActionConfigId(operationType as ApprovalType)];
  const userApproverCandidates = useMemo(() => {
    if (!activeConfig || activeConfig.defaultApproverType !== "user") {
      return EMPTY_STRING_ARRAY;
    }
    return activeConfig.defaultApproverRefs ?? EMPTY_STRING_ARRAY;
  }, [activeConfig]);
  const defaultApproverId =
    userApproverCandidates.length === 1 ? userApproverCandidates[0] : null;
  const defaultRoleApproverId =
    activeConfig?.defaultApproverType === "role" &&
    activeConfig.defaultApproverRefs.length > 0
      ? activeConfig.defaultApproverRefs[0]
      : null;
  const canUseSelector = selectorReady;

  useEffect(() => {
    const defaults = DEFAULT_DELTAS[operationType];
    setQuantityDelta(defaults.quantityDelta.toString());
    setReservedDelta(defaults.reservedDelta.toString());
    setReason("");
    setError(null);
    setApproverId("");
    setApproverName("");

    const config =
      configMap[approvalTypeToActionConfigId(operationType as ApprovalType)];
    if (config?.defaultApproverType === "user" && config.defaultApproverRefs.length === 1) {
      setApproverId(config.defaultApproverRefs[0]);
    }
  }, [operationType, configMap]);

  useEffect(() => {
    const cookieUser = getStoredAuth();
    if (cookieUser?.userId) {
      setApplicant({
        id: String(cookieUser.userId),
        name: cookieUser.nickname ?? undefined,
      });
      if (!actor) {
        const name = cookieUser.nickname;
        if (name) {
          setActor(name);
        }
      }
    }
  }, [actor]);

  useEffect(() => {
    let active = true;
    async function loadConfig() {
      try {
        const client = await getApiClient();
        const { data } = await client.get<{ data: ActionConfig[] }>(
          "/apps/asset-hub/api/config/approvals",
          { headers: { "Cache-Control": "no-cache" } },
        );
        if (!active) return;
        const next: Record<string, ActionConfig> = {};
        data.data.forEach((item) => {
          next[item.id] = item;
        });
        setConfigMap(next);
      } catch {
        // best-effort; server will still enforce config
      }
    }
    loadConfig();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    async function detectSelector() {
      try {
        const micro = await isMicroApp();
        if (!micro) {
          if (active) setSelectorReady(false);
          return;
        }
        await appReady();
        if (active) setSelectorReady(true);
      } catch {
        if (active) setSelectorReady(false);
      }
    }
    detectSelector();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!approverId || approverName) return;
    let cancelled = false;
    async function hydrateName() {
      const numeric = Number(approverId);
      if (!Number.isFinite(numeric)) return;
      try {
        const users = await fetchUserBasic([numeric]);
        if (cancelled) return;
        const info = Array.isArray(users) ? users[0] : undefined;
        const name = info?.nickname ?? info?.name;
        if (name) {
          setApproverName(name);
        }
      } catch {
        // ignore lookup errors; keep ID
      }
    }
    hydrateName();
    return () => {
      cancelled = true;
    };
  }, [approverId, approverName]);

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
            // ignore lookup errors
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
          const pick = memberDetails[0];
          setApproverId(pick.id);
          setApproverName(pick.name);
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
  }, [defaultRoleApproverId, feedback, isChinese]);

  useEffect(() => {
    if (!activeConfig) return;
    if (defaultApproverId) {
      setApproverId((prev) => prev || defaultApproverId);
    }
  }, [activeConfig, defaultApproverId]);

  useEffect(() => {
    if (!activeConfig || activeConfig.defaultApproverType !== "user") {
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
  }, [activeConfig, userApproverCandidates]);

  const typeDescription = useMemo(() => {
    if (operationType === "outbound") {
      return isChinese
        ? "记录耗材发放或消耗。"
        : "Track outbound issuance or consumption.";
    }
    if (operationType === "reserve") {
      return isChinese
        ? "为特定项目或人员预留库存。"
        : "Reserve stock for projects or assignees.";
    }
    if (operationType === "release") {
      return isChinese
        ? "释放之前预留的库存。"
        : "Release previously reserved stock.";
    }
    if (operationType === "adjust") {
      return isChinese
        ? "用于盘点差异或纠错调整。"
        : "Adjust stock after inventory or corrections.";
    }
    return undefined;
  }, [isChinese, operationType]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (!actor.trim()) {
        throw new Error(isChinese ? "请填写经办人。" : "Actor is required.");
      }

      const parsedQuantity = showQuantity ? Number(quantityDelta || 0) : 0;
      const parsedReserved = showReserved ? Number(reservedDelta || 0) : 0;

      if (showQuantity && Number.isNaN(parsedQuantity)) {
        throw new Error(
          isChinese ? "库存变更需输入数字。" : "Quantity delta must be a number.",
        );
      }

      if (showReserved && Number.isNaN(parsedReserved)) {
        throw new Error(
          isChinese
            ? "预留变更需输入数字。"
            : "Reserved delta must be a number.",
        );
      }

      const client = await getApiClient();

      if (!requiresApproval) {
        await client.post(`/apps/asset-hub/api/consumables/${consumableId}/operations`, {
          type: operationType,
          actor: actor.trim(),
          description: description.trim(),
          quantityDelta: parsedQuantity,
          reservedDelta: parsedReserved,
        });

        setActor("");
        setDescription("");
        setQuantityDelta(DEFAULT_DELTAS[operationType].quantityDelta.toString());
        setReservedDelta(DEFAULT_DELTAS[operationType].reservedDelta.toString());
        router.refresh();
        feedback.success(isChinese ? "操作已创建" : "Operation created");
        return;
      }

      if (!reason.trim()) {
        throw new Error(isChinese ? "请填写申请事由。" : "Reason is required for approval.");
      }

      if (requiresApproval) {
        const type = activeConfig?.defaultApproverType ?? "none";
        if (type === "role" && roleMembers.length > 1 && !approverId) {
          throw new Error(
            isChinese ? "请选择审批人后再提交。" : "Please pick an approver before submitting.",
          );
        }
        if (type === "user" && userApproverCandidates.length > 1 && !approverId) {
          throw new Error(
            isChinese ? "请选择审批人后再提交。" : "Please pick an approver before submitting.",
          );
        }
        if (type === "none" && !approverId) {
          throw new Error(
            isChinese ? "请选择审批人后再提交。" : "Please pick an approver before submitting.",
          );
        }
      }

      if (!applicant.id) {
        throw new Error(
          isChinese
            ? "缺少申请人身份，请重新登录或从宿主应用打开。"
            : "Missing applicant identity. Please re-login or open from host.",
        );
      }

      const operationResponse = await client.post(
        `/apps/asset-hub/api/consumables/${consumableId}/operations`,
        {
          type: operationType,
          actor: actor.trim(),
          description: description.trim(),
          quantityDelta: parsedQuantity,
          reservedDelta: parsedReserved,
        },
      );

      const operationId = operationResponse.data?.data?.id as string | undefined;
      if (!operationId) {
        throw new Error(
          isChinese ? "创建待审批操作失败，请稍后重试。" : "Failed to create pending operation.",
        );
      }

      const typeLabel =
        CONSUMABLE_OPERATION_TYPES.find((item) => item.value === operationType)?.label[
          locale === "zh" ? "zh" : "en"
        ] ?? operationType;

      await client.post("/apps/asset-hub/api/approvals", {
        type: operationType as ApprovalType,
        title: `${typeLabel} - ${consumableName ?? consumableId}`,
        reason: reason.trim(),
        applicant,
        approver: approverId
          ? { id: approverId, name: approverName || undefined }
          : undefined,
        consumableId,
        consumableOperationId: operationId,
        metadata: {
          initiatedFrom: "consumable-detail",
          quantityDelta: parsedQuantity,
          reservedDelta: parsedReserved,
          unit,
        },
      });

      setActor("");
      setDescription("");
      setReason("");
      setApproverId("");
      setApproverName("");
      setQuantityDelta(DEFAULT_DELTAS[operationType].quantityDelta.toString());
      setReservedDelta(DEFAULT_DELTAS[operationType].reservedDelta.toString());
      router.refresh();
      feedback.success(isChinese ? "审批已发起" : "Approval submitted");
    } catch (err) {
      const message = extractApiErrorMessage(
        err,
        isChinese ? "提交失败，请稍后再试。" : "Something went wrong, please retry.",
      );
      setError(message);
      feedback.error(message, {
        blocking: true,
        title: isChinese ? "提交失败" : "Submit failed",
        acknowledgeLabel: isChinese ? "知道了" : "Got it",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const approvalHint = isChinese
    ? "该操作已配置为必须走审批，提交后会生成待审批记录，审批通过后自动更新库存。"
    : "This operation requires approval; a pending request will be created and stock updates after approval.";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">
          {isChinese ? "操作类型" : "Operation Type"}
        </Label>
        <Select
          value={operationType}
          onValueChange={(value: ConsumableOperationType) => {
            setOperationType(value);
            setApproverId("");
            setApproverName("");
            setRoleMembers([]);
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CONSUMABLE_OPERATION_TYPES.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label[locale === "zh" ? "zh" : "en"]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {typeDescription && (
          <p className="text-xs text-muted-foreground">{typeDescription}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">
          {isChinese ? "经办人" : "Actor"}
        </Label>
        <Input
          value={actor}
          onChange={(event) => setActor(event.target.value)}
          placeholder={isChinese ? "填写经办人姓名" : "Enter actor name"}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">
          {isChinese ? "备注" : "Description"}
        </Label>
        <Textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder={isChinese ? "可选，说明原因" : "Optional notes"}
          rows={3}
        />
      </div>

      {showQuantity && (
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">
            {isChinese ? "库存变更" : "Quantity Delta"}
          </Label>
          <Input
            type="number"
            value={quantityDelta}
            onChange={(event) => setQuantityDelta(event.target.value)}
            placeholder={isChinese ? "例如 -5" : "e.g. -5"}
            step="1"
          />
          <p className="text-xs text-muted-foreground">
            {isChinese
              ? `单位：${unit}，正数表示入库，负数表示出库。`
              : `Unit: ${unit}. Positive adds stock, negative deducts.`}
          </p>
        </div>
      )}

      {showReserved && (
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">
            {isChinese ? "预留变更" : "Reserved Delta"}
          </Label>
          <Input
            type="number"
            value={reservedDelta}
            onChange={(event) => setReservedDelta(event.target.value)}
            placeholder={isChinese ? "例如 5" : "e.g. 5"}
            step="1"
          />
          <p className="text-xs text-muted-foreground">
            {isChinese
              ? "正数表示新增预留，负数表示释放预留。"
              : "Positive values reserve stock, negative values release it."}
          </p>
        </div>
      )}

      {requiresApproval && (
        <div className="space-y-3 rounded-2xl border border-dashed border-muted-foreground/40 bg-card/50 p-3 text-xs">
          <p>{approvalHint}</p>
          <div className="space-y-1.5 text-left">
            <Label className="text-xs font-medium text-muted-foreground">
              {isChinese ? "申请事由" : "Reason"}
            </Label>
            <Textarea
              rows={3}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={isChinese ? "说明为什么需要执行本次操作" : "Explain why this operation is needed"}
            />
          </div>
          <div className="space-y-1.5 text-left">
            <Label className="text-xs font-medium text-muted-foreground">
              {isChinese ? "审批人" : "Approver"}
            </Label>
            {activeConfig?.defaultApproverType === "role" && roleMembers.length > 1 && (
              <Select
                value={approverId}
                onValueChange={(value) => {
                  const member = roleMembers.find((item) => item.id === value);
                  setApproverId(value);
                  setApproverName(member?.name ?? "");
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
            )}
            {activeConfig?.defaultApproverType === "user" && userCandidates.length > 1 && (
              <Select
                value={approverId}
                onValueChange={(value) => {
                  const member = userCandidates.find((item) => item.id === value);
                  setApproverId(value);
                  setApproverName(member?.name ?? "");
                }}
                disabled={loadingUserCandidates}
              >
                <SelectTrigger className="w-full max-w-[320px]">
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

            {activeConfig?.defaultApproverType === "none" ? (
              canUseSelector ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={async () => {
                      setSelectingApprover(true);
                      try {
                        const result = (await selectUsers({
                          multipleMax: 1,
                          showSelectAll: false,
                          showDialog: false,
                        }).catch(() => null)) as SelectUsersReturn | null;
                        const entry = Array.isArray(result)
                          ? result[0]
                          : Array.isArray(result?.users)
                            ? result.users[0]
                            : undefined;
                        if (typeof entry === "string" || typeof entry === "number") {
                          setApproverId(String(entry));
                          setApproverName("");
                          return;
                        }
                        const id = entry?.userid ?? entry?.id;
                        const name = entry?.nickname ?? entry?.name;
                        if (id) {
                          setApproverId(String(id));
                          setApproverName(name ?? "");
                        }
                      } catch {
                        feedback.error(
                          isChinese ? "选择审批人失败。" : "Failed to select approver.",
                        );
                      } finally {
                        setSelectingApprover(false);
                      }
                    }}
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
                  {(approverId || approverName) && (
                    <div className="ml-2 flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-sm">
                      <span className="font-medium">{approverName || approverId}</span>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setApproverId("");
                          setApproverName("");
                        }}
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      {isChinese ? "审批人 ID" : "Approver ID"}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={approverId}
                      onChange={(event) => setApproverId(event.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      {isChinese ? "审批人姓名" : "Approver name"}
                    </Label>
                    <Input
                      value={approverName}
                      onChange={(event) => setApproverName(event.target.value)}
                    />
                  </div>
                </div>
              )
            ) : null}

            {/* Keep UI minimal; backend validates approver selection. */}
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-destructive">
          {error}
        </p>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={submitting}
      >
        {submitting
          ? isChinese
            ? "提交中..."
            : "Submitting..."
          : requiresApproval
            ? isChinese
              ? "发起审批"
              : "Submit for Approval"
            : isChinese
              ? "添加操作记录"
              : "Add Operation"}
      </Button>
    </form>
  );
}
