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

  if (config.defaultApproverType === "user" && config.defaultApproverRefs.length) {
    const defaultUserId = config.defaultApproverRefs[0];
    if (!config.allowOverride) {
      if (cleanedRequested && cleanedRequested.id !== defaultUserId) {
        throw new Error("当前审批配置不允许修改审批人。");
      }
      return { id: defaultUserId, name: cleanedRequested?.name };
    }

    return cleanedRequested ?? { id: defaultUserId };
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

    if (!config.allowOverride) {
      if (members.length !== 1) {
        throw new Error(
          `角色 (${role?.name ?? roleId}) 有多位成员，且配置不允许手动选择，系统无法自动指派。`,
        );
      }
      if (cleanedRequested && cleanedRequested.id !== members[0]) {
        throw new Error("当前审批配置不允许修改审批人。");
      }
      return { id: members[0], name: cleanedRequested?.name };
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

  if (!config.allowOverride) {
    throw new Error(
      "审批配置未设置默认审批人且禁止修改，请联系管理员设置默认审批人。",
    );
  }

  return cleanedRequested;
}

