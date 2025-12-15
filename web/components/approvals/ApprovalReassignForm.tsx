"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
import { useAppFeedback } from "@/components/providers/feedback-provider";
import { usePermissions } from "@/components/providers/PermissionProvider";
import { getApiClient } from "@/lib/http/client";
import { extractApiErrorMessage } from "@/lib/utils/api-error";
import type { ActionConfig } from "@/lib/types/action-config";
import type { ApprovalType } from "@/lib/types/approval";
import type { Role } from "@/lib/types/system";
import { approvalTypeToActionConfigId } from "@/lib/utils/action-config";
import { appReady, fetchUserBasic, isMicroApp, selectUsers } from "@dootask/tools";

type Props = {
  approvalId: string;
  approvalType: ApprovalType;
  locale?: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  applicantId: string;
  approverId?: string | null;
  approverName?: string | null;
  variant?: "embedded" | "standalone";
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

function normalizeSelectedUser(result: SelectUsersReturn | null) {
  if (!result) return null;
  if (Array.isArray(result)) {
    return result[0] ?? null;
  }
  if (Array.isArray(result.users)) {
    return result.users[0] ?? null;
  }
  return null;
}

export default function ApprovalReassignForm(props: Props) {
  const router = useRouter();
  const isChinese = props.locale === "zh";
  const feedback = useAppFeedback();
  const { user, userReady, isAdmin, isApprover } = usePermissions();
  const isEmbedded = props.variant !== "standalone";

  const [loadingConfig, setLoadingConfig] = useState(true);
  const [config, setConfig] = useState<ActionConfig | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  const [roleMembers, setRoleMembers] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [loadingRole, setLoadingRole] = useState(false);

  const [canUseSelector, setCanUseSelector] = useState(false);
  const [selectingApprover, setSelectingApprover] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [nextApprover, setNextApprover] = useState<{
    id: string;
    name?: string;
  }>({
    id: props.approverId ?? "",
    name: props.approverName ?? undefined,
  });

  const fieldIds = {
    approverId: useId(),
    approverName: useId(),
    roleApprover: useId(),
  };

  const actorId = user ? String(user.id) : null;
  const canEdit =
    props.status === "pending" &&
    userReady &&
    actorId !== null &&
    (actorId === props.applicantId ||
      actorId === props.approverId ||
      isAdmin ||
      isApprover);

  useEffect(() => {
    async function initEnv() {
      try {
        const micro = await isMicroApp();
        if (micro) {
          await appReady();
          setCanUseSelector(true);
        }
      } catch {}
    }
    initEnv();
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadConfig() {
      setLoadingConfig(true);
      setConfigError(null);
      try {
        const client = await getApiClient();
        const { data } = await client.get<{ data: ActionConfig[] }>(
          "/apps/asset-hub/api/config/approvals",
        );
        const configId = approvalTypeToActionConfigId(props.approvalType);
        const found = data.data.find((entry) => entry.id === configId) ?? null;
        if (!cancelled) {
          setConfig(found);
        }
      } catch (err) {
        if (!cancelled) {
          setConfigError(
            extractApiErrorMessage(
              err,
              isChinese ? "无法加载审批配置" : "Failed to load approval config.",
            ),
          );
        }
      } finally {
        if (!cancelled) setLoadingConfig(false);
      }
    }
    loadConfig();
    return () => {
      cancelled = true;
    };
  }, [props.approvalType, isChinese]);

  const defaultRoleApproverId =
    config?.defaultApproverType === "role" && config.defaultApproverRefs.length
      ? config.defaultApproverRefs[0]
      : null;

  useEffect(() => {
    if (!defaultRoleApproverId) {
      setRoleMembers([]);
      return;
    }

    let active = true;
    async function resolveRoleMembers() {
      setLoadingRole(true);
      try {
        const client = await getApiClient();
        const roleRes = await client.get<{ data: Role }>(
          `/apps/asset-hub/api/system/roles/${defaultRoleApproverId}`,
        );
        const role = roleRes.data.data;
        const memberIds = role.members ?? [];

        if (!active) return;

        if (memberIds.length === 0) {
          setRoleMembers([]);
          return;
        }

        const details: Array<{ id: string; name: string }> = [];
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
                  details.push({
                    id: String(uid),
                    name: u.nickname || u.name || String(uid),
                  });
                }
              });
            }
          } catch {}
        }

        memberIds.forEach((mid) => {
          if (!details.find((entry) => entry.id === mid)) {
            details.push({ id: mid, name: mid });
          }
        });

        if (!active) return;
        setRoleMembers(details);
      } catch {
        if (!active) return;
        setRoleMembers([]);
      } finally {
        if (active) setLoadingRole(false);
      }
    }

    resolveRoleMembers();
    return () => {
      active = false;
    };
  }, [defaultRoleApproverId]);

  const allowOverride = config?.allowOverride ?? true;
  const needsRolePick = roleMembers.length > 1;

  const lockedByConfig = useMemo(() => {
    if (!config) return false;
    if (!allowOverride && config.defaultApproverType !== "none") {
      return true;
    }
    return false;
  }, [config, allowOverride]);

  const missingSelection = useMemo(() => {
    if (!canEdit) return false;
    if (lockedByConfig) return false;
    if (needsRolePick) return nextApprover.id.trim().length === 0;
    return nextApprover.id.trim().length === 0;
  }, [canEdit, lockedByConfig, needsRolePick, nextApprover.id]);

  if (!canEdit) return null;

  const currentLabel =
    props.approverName ??
    props.approverId ??
    (isChinese ? "未指派" : "Unassigned");

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
    if (lockedByConfig) {
      feedback.error(
        isChinese
          ? "当前审批配置不允许修改审批人。"
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
      }).catch(() => null)) as SelectUsersReturn | null;
      const entry = normalizeSelectedUser(result);
      const pick = await resolveSelectedApprover(entry);
      if (!pick) {
        feedback.error(isChinese ? "未选择任何审批人。" : "No approver selected.");
        return;
      }
      setNextApprover({ id: `${pick.id}`.trim(), name: pick.name ?? "" });
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || !actorId) return;
    if (lockedByConfig) return;
    if (missingSelection) return;

    setSubmitting(true);
    try {
      const searchSuffix = (() => {
        if (typeof window === "undefined") return "";
        if (window.location.search) {
          return window.location.search;
        }
        return props.locale ? `?lang=${props.locale}` : "";
      })();
      const endpoint = `/apps/asset-hub/api/approvals/${props.approvalId}/approver${searchSuffix}`;
      const client = await getApiClient();
      await client.patch(endpoint, {
        approver: {
          id: nextApprover.id.trim(),
          name: nextApprover.name?.trim() || undefined,
        },
        actor: {
          id: String(user.id),
          name: user.nickname,
        },
      });

      router.refresh();
      feedback.success(isChinese ? "审批人已更新" : "Approver updated");
    } catch (err) {
      const message = extractApiErrorMessage(
        err,
        isChinese ? "更换审批人失败" : "Failed to reassign approver.",
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

  return (
    <form
      onSubmit={handleSubmit}
      className={
        isEmbedded
          ? "space-y-3 rounded-2xl border border-dashed bg-card/50 p-3"
          : "space-y-3 rounded-2xl border bg-muted/20 p-4"
      }
    >
      <div>
        <h3 className="text-sm font-semibold">
          {isChinese ? "更换审批人" : "Reassign Approver"}
        </h3>
        <p className="text-xs text-muted-foreground">
          {isChinese
            ? `当前审批人：${currentLabel}`
            : `Current approver: ${currentLabel}`}
        </p>
      </div>

      {configError && (
        <p className="rounded-2xl border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
          {configError}
        </p>
      )}
      {loadingConfig && !configError && (
        <p className="rounded-2xl border border-dashed border-muted-foreground/20 bg-muted/20 p-3 text-xs text-muted-foreground">
          {isChinese ? "正在加载审批配置..." : "Loading approval configuration..."}
        </p>
      )}

      {lockedByConfig && (
        <p className="rounded-2xl border border-dashed border-muted-foreground/40 bg-muted/20 p-3 text-xs text-muted-foreground">
          {isChinese
            ? "当前审批配置不允许修改审批人。"
            : "Approver is locked by system configuration."}
        </p>
      )}

      {!lockedByConfig && needsRolePick && (
        <div className="space-y-1.5">
          <Label
            htmlFor={fieldIds.roleApprover}
            className="text-xs font-medium text-muted-foreground"
          >
            {isChinese ? "从角色成员选择" : "Pick from role members"}
          </Label>
          <Select
            value={nextApprover.id}
            onValueChange={(value) => {
              const match = roleMembers.find((m) => m.id === value);
              setNextApprover({ id: value, name: match?.name });
            }}
            disabled={loadingRole}
          >
            <SelectTrigger id={fieldIds.roleApprover} className="w-full">
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
          {roleMembers.length > 1 && (
            <p className="text-xs text-muted-foreground">
              {isChinese
                ? "只能在该角色成员范围内选择。"
                : "You can only choose from role members."}
            </p>
          )}
        </div>
      )}

      {!lockedByConfig && !needsRolePick && allowOverride && (
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
            {nextApprover.id && (
              <div className="ml-2 flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-sm">
                <span className="font-medium">
                  {nextApprover.name || nextApprover.id}
                </span>
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
                value={nextApprover.id}
                onChange={(event) =>
                  setNextApprover((prev) => ({
                    ...prev,
                    id: event.target.value,
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
                value={nextApprover.name ?? ""}
                onChange={(event) =>
                  setNextApprover((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
              />
            </div>
          </div>
        )
      )}

      {!lockedByConfig && !allowOverride && roleMembers.length <= 1 && (
        <p className="text-xs text-muted-foreground">
          {isChinese
            ? "此类型审批人由系统自动指派，无法修改。"
            : "Approver is assigned automatically and cannot be changed."}
        </p>
      )}

      <Button
        type="submit"
        disabled={submitting || lockedByConfig || missingSelection}
        className="w-full rounded-2xl"
      >
        {submitting
          ? isChinese
            ? "提交中..."
            : "Submitting..."
          : isChinese
            ? "确认更换"
            : "Confirm"}
      </Button>
    </form>
  );
}
