import axios from "axios";
import { appConfig } from "@/lib/config";
import type { ApprovalRequest } from "@/lib/types/approval";
import type { ConsumableAlert } from "@/lib/types/consumable-alert";

const todoConfig = appConfig.dootaskTodo;

async function sendRequest({
  path,
  body,
  method,
}: {
  path: string;
  method: "POST" | "PATCH";
  body: Record<string, unknown>;
}) {
  if (!todoConfig.baseUrl || !todoConfig.token) {
    return null;
  }

  try {
    const response = await axios.request({
      url: `${todoConfig.baseUrl}${path}`,
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${todoConfig.token}`,
      },
      data: body,
    });
    const payload = (response.data ?? null) as { id?: string } | null;
    return payload ?? null;
  } catch (error) {
    console.warn("[asset-hub] dootask todo sync failed", error);
    return null;
  }
}

export async function createExternalApprovalTodo(approval: ApprovalRequest) {
  const payload = await sendRequest({
    path: `/todos`,
    method: "POST",
    body: {
      title: approval.title,
      type: approval.type,
      approvalId: approval.id,
      approverId: approval.approverId,
      status: approval.status,
    },
  });
  return payload?.id ?? null;
}

export async function updateExternalApprovalTodo(
  approval: ApprovalRequest,
  externalId: string | null | undefined,
) {
  if (!externalId) return;
  await sendRequest({
    path: `/todos/${externalId}`,
    method: "PATCH",
    body: {
      status: approval.status,
      result: approval.result,
    },
  });
}

export async function createConsumableAlertTodo(alert: ConsumableAlert) {
  const payload = await sendRequest({
    path: `/todos`,
    method: "POST",
    body: {
      type: "consumable-alert",
      alertId: alert.id,
      consumableId: alert.consumableId,
      level: alert.level,
      title: `[Consumable] ${alert.consumableName}`,
      message: alert.message,
      keeper: alert.keeper,
      link: todoConfig.linkBase
        ? `${todoConfig.linkBase}/consumables/${alert.consumableId}`
        : undefined,
    },
  });
  return payload?.id ?? null;
}

export async function resolveConsumableAlertTodo(alert: ConsumableAlert) {
  if (!alert.externalTodoId) return;
  await sendRequest({
    path: `/todos/${alert.externalTodoId}`,
    method: "PATCH",
    body: {
      status: "resolved",
      result: alert.message,
    },
  });
}
