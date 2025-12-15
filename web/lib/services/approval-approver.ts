import { getRoleById } from "@/lib/repositories/roles";
import type { ActionConfig } from "@/lib/types/action-config";

export type ApproverInput = { id?: string; name?: string } | undefined;
export type ResolvedApprover = { id: string; name?: string };

function normalizeApproverInput(input: ApproverInput): ResolvedApprover | null {
  if (!input?.id || typeof input.id !== "string") return null;
  const id = input.id.trim();
  if (!id) return null;
  const name =
    typeof input.name === "string" && input.name.trim().length > 0
      ? input.name.trim()
      : undefined;
  return { id, name };
}

export function resolveApproverFromConfig(
  config: ActionConfig,
  requested?: ApproverInput,
): ResolvedApprover | null {
  const cleanedRequested = normalizeApproverInput(requested);

  if (config.defaultApproverType === "none") {
    if (!cleanedRequested) {
      return null;
    }
    return cleanedRequested;
  }

  if (config.defaultApproverType === "user") {
    const candidates = config.defaultApproverRefs ?? [];
    if (candidates.length === 0) {
      throw new Error("审批配置未设置候选审批用户，请联系管理员配置。");
    }

    if (cleanedRequested) {
      if (!candidates.includes(cleanedRequested.id)) {
        throw new Error("选择的审批人不在配置允许的用户范围内。");
      }
      return cleanedRequested;
    }

    if (candidates.length === 1) {
      return { id: candidates[0] };
    }

    return null;
  }

  if (config.defaultApproverType === "role" && config.defaultApproverRefs.length) {
    const roleId = config.defaultApproverRefs[0];
    const role = getRoleById(roleId);
    const members = role?.members ?? [];

    if (members.length === 0) {
      throw new Error(
        `审批配置的默认角色 (${role?.name ?? roleId}) 暂无成员，无法指派审批人。`,
      );
    }

    if (cleanedRequested) {
      if (!members.includes(cleanedRequested.id)) {
        throw new Error(
          `选择的审批人不在角色 (${role?.name ?? roleId}) 成员列表中。`,
        );
      }
      return cleanedRequested;
    }

    if (members.length === 1) {
      return { id: members[0] };
    }

    return null;
  }

  throw new Error("审批配置不合法，请联系管理员检查默认审批人配置。");
}
