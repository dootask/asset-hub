import { appConfig } from "@/lib/config";
import type { ApprovalRequest } from "@/lib/types/approval";

const API_BASE = (appConfig.dootask.apiBaseUrl ?? "").replace(/\/$/, "");
const API_TOKEN = appConfig.dootask.apiToken?.trim();
const NOTIFICATION_ENABLED = Boolean(API_BASE && API_TOKEN);

async function postNotification(
  path: string,
  payload: Record<string, unknown>,
) {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_TOKEN}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`DooTask notification failed (${response.status})`);
  }
}

interface NotificationContext {
  approval: ApprovalRequest;
  detailLink: string;
}

export async function notifyApprovalCreated(context: NotificationContext) {
  if (!NOTIFICATION_ENABLED) {
    console.info("[dootask] notifyApprovalCreated skipped", context.approval.id);
    return;
  }

  try {
    await postNotification("/notifications", {
      event: "approval.created",
      approvalId: context.approval.id,
      title: context.approval.title,
      status: context.approval.status,
      link: context.detailLink,
      applicant: {
        id: context.approval.applicantId,
        name: context.approval.applicantName,
      },
      approver: context.approval.approverId
        ? {
            id: context.approval.approverId,
            name: context.approval.approverName,
          }
        : undefined,
    });
  } catch (error) {
    console.error("[dootask] notifyApprovalCreated error", error);
  }
}

export async function notifyApprovalUpdated(context: {
  approval: ApprovalRequest;
}) {
  if (!NOTIFICATION_ENABLED) {
    console.info("[dootask] notifyApprovalUpdated skipped", context.approval.id);
    return;
  }

  try {
    await postNotification("/notifications", {
      event: "approval.updated",
      approvalId: context.approval.id,
      status: context.approval.status,
      result: context.approval.result,
      applicantId: context.approval.applicantId,
      approverId: context.approval.approverId,
    });
  } catch (error) {
    console.error("[dootask] notifyApprovalUpdated error", error);
  }
}


