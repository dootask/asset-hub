import type { ApprovalRequest } from "@/lib/types/approval";
import { createDooTaskClientFromRequest } from "@/lib/integrations/dootask-server-client";
import { sendApprovalBotMessage } from "@/lib/integrations/dootask-notifications-server";

function resolveLocale(locale?: string) {
  const normalized = locale?.toLowerCase() ?? "";
  if (normalized.startsWith("zh")) {
    return "zh";
  }
  return "en";
}

function buildApprovalCreatedText(approval: ApprovalRequest, locale?: string) {
  const lang = resolveLocale(locale);
  const lines = [
    lang === "zh" ? "**资产审批提醒**" : "**Asset Approval Reminder**",
    `- ${lang === "zh" ? "类型" : "Type"}：${approval.type}`,
    `- ${lang === "zh" ? "标题" : "Title"}：${approval.title}`,
    `- ${lang === "zh" ? "申请人" : "Applicant"}：${
      approval.applicantName ?? approval.applicantId ?? "-"
    }`,
    lang === "zh"
      ? "> 查看详情：请在应用中心查看"
      : "> Details: Please open Asset Hub inside DooTask.",
  ];
  return lines.join("\n");
}

function buildApprovalUpdatedText(
  approval: ApprovalRequest,
  locale?: string,
  actorName?: string,
) {
  const lang = resolveLocale(locale);
  const lines = [
    lang === "zh" ? "**审批状态更新**" : "**Approval Status Update**",
    `- ${lang === "zh" ? "标题" : "Title"}：${approval.title}`,
    `- ${lang === "zh" ? "状态" : "Status"}：${approval.status}`,
    actorName
      ? `- ${lang === "zh" ? "处理人" : "Actor"}：${actorName}`
      : undefined,
    lang === "zh"
      ? "> 查看详情：请在应用中心查看"
      : "> Details: Please open Asset Hub inside DooTask.",
  ].filter(Boolean);
  return lines.join("\n");
}

export async function notifyApprovalCreated(params: {
  request: Request;
  approval: ApprovalRequest;
  locale?: string;
}) {
  const client = createDooTaskClientFromRequest(params.request);
  if (!client) return;
  await sendApprovalBotMessage({
    client,
    userId: params.approval.approverId,
    text: buildApprovalCreatedText(params.approval, params.locale),
  });
}

export async function notifyApprovalUpdated(params: {
  request: Request;
  approval: ApprovalRequest;
  actorName?: string;
  locale?: string;
}) {
  const client = createDooTaskClientFromRequest(params.request);
  if (!client) return;
  // 通知申请人
  await sendApprovalBotMessage({
    client,
    userId: params.approval.applicantId,
    text: buildApprovalUpdatedText(
      params.approval,
      params.locale,
      params.actorName,
    ),
  });
}
