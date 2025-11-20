"use client";

import {
  appReady,
  isMicroApp,
  requestAPI,
} from "@dootask/tools";
import {
  APPROVAL_STATUSES,
  APPROVAL_TYPES,
  type ApprovalRequest,
} from "@/lib/types/approval";

function getApprovalTypeLabel(type: string, locale?: string) {
  const info = APPROVAL_TYPES.find((item) => item.value === type);
  if (!info) {
    return type;
  }
  return locale === "zh" ? info.labelZh : info.labelEn;
}

function getApprovalStatusLabel(status: string, locale?: string) {
  const info = APPROVAL_STATUSES.find((item) => item.value === status);
  if (!info) {
    return status;
  }
  if (locale === "zh") {
    return info.label;
  }
  switch (status) {
    case "pending":
      return "Pending";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

async function sendBotMessage(params: { userId?: string | null; text: string }) {
  try {
    if (typeof window === "undefined") return;
    const userId = `${params.userId ?? ""}`.trim();
    if (!userId) return;

    const micro = await isMicroApp();
    if (!micro) return;

    await appReady();
    await requestAPI({
      url: "dialog/msg/sendbot",
      data: {
        userid: userId,
        text: params.text,
        bot_type: "approval-alert",
      },
    });
  } catch (error) {
    console.warn("[asset-hub] approval notification failed", error);
  }
}

export async function sendApprovalCreatedNotification(params: {
  approval: ApprovalRequest;
  locale?: string;
}) {
  const textLines = [
    params.locale === "zh"
      ? "**资产审批提醒**"
      : "**Asset Approval Reminder**",
    `- ${params.locale === "zh" ? "类型" : "Type"}：${getApprovalTypeLabel(params.approval.type, params.locale)}`,
    `- ${params.locale === "zh" ? "标题" : "Title"}：${params.approval.title}`,
    `- ${params.locale === "zh" ? "申请人" : "Applicant"}：${
      params.approval.applicantName ??
      params.approval.applicantId ??
      "-"
    }`,
    params.locale === "zh"
      ? "> 查看详情：请在应用中心查看"
      : "> Details: Please open Asset Hub inside DooTask.",
  ].filter(Boolean);

  await sendBotMessage({
    userId: params.approval.approverId,
    text: textLines.join("\n"),
  });
}

export async function sendApprovalUpdatedNotification(params: {
  approval: ApprovalRequest;
  locale?: string;
  actorName?: string;
}) {
  const textLines = [
    params.locale === "zh"
      ? "**审批状态更新**"
      : "**Approval Status Update**",
    `- ${params.locale === "zh" ? "标题" : "Title"}：${params.approval.title}`,
    `- ${params.locale === "zh" ? "状态" : "Status"}：${getApprovalStatusLabel(params.approval.status, params.locale)}`,
    params.actorName
      ? `- ${params.locale === "zh" ? "处理人" : "Actor"}：${params.actorName}`
      : undefined,
    params.locale === "zh"
      ? "> 查看详情：请在应用中心查看"
      : "> Details: Please open Asset Hub inside DooTask.",
  ].filter(Boolean);

  await sendBotMessage({
    userId: params.approval.applicantId,
    text: textLines.join("\n"),
  });
}


