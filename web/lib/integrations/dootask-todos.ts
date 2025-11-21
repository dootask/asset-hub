import { appConfig } from "@/lib/config";
import type { ApprovalRequest } from "@/lib/types/approval";

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
    const response = await fetch(`${todoConfig.baseUrl}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${todoConfig.token}`,
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`DooTask API ${response.status}`);
    }
    const payload = (await response.json().catch(() => null)) as
      | { id?: string }
      | null;
    return payload;
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

