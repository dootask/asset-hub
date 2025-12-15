import { normalizeLocale } from "@/lib/i18n";
import type { ApprovalRequest } from "@/lib/types/approval";
import { createDooTaskClientFromRequest } from "@/lib/integrations/dootask-server-client";
import { sendApprovalBotMessage } from "@/lib/integrations/dootask-notifications-server";

function buildOpenMicroAppLine(approval: ApprovalRequest, locale?: string) {
  const lang = normalizeLocale(locale);
  const detailUrl = `/apps/asset-hub/{system_lang}/approvals/${approval.id}?theme={system_theme}`;
  const appConfig = JSON.stringify({
    id: "asset-hub",
    name: "asset-hub-details",
    immersive: true,
    keep_alive: false,
    url_type: "iframe",
    url: detailUrl,
  });
  const label =
    lang === "zh"
      ? "查看详情：点击查看审批详情"
      : "Details: Click to view approval";
  return `> <div class="open-micro-app" data-app-config='${appConfig}'>${label}</div>`;
}

function buildApprovalCreatedText(approval: ApprovalRequest, locale?: string) {
  const lang = normalizeLocale(locale);
  const lines = [
    lang === "zh" ? "**资产审批提醒**" : "**Asset Approval Reminder**",
    `- ${lang === "zh" ? "类型" : "Type"}：${approval.type}`,
    `- ${lang === "zh" ? "标题" : "Title"}：${approval.title}`,
    `- ${lang === "zh" ? "申请人" : "Applicant"}：${
      approval.applicantName ?? approval.applicantId ?? "-"
    }`,
    buildOpenMicroAppLine(approval, locale),
  ];
  return lines.join("\n");
}

function buildApprovalUpdatedText(
  approval: ApprovalRequest,
  locale?: string,
  actorName?: string,
) {
  const lang = normalizeLocale(locale);
  const lines = [
    lang === "zh" ? "**审批状态更新**" : "**Approval Status Update**",
    `- ${lang === "zh" ? "标题" : "Title"}：${approval.title}`,
    `- ${lang === "zh" ? "状态" : "Status"}：${approval.status}`,
    actorName
      ? `- ${lang === "zh" ? "处理人" : "Actor"}：${actorName}`
      : undefined,
    buildOpenMicroAppLine(approval, locale),
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

function buildApprovalReassignedText(params: {
  approval: ApprovalRequest;
  locale?: string;
  actorName?: string;
  previousApproverLabel?: string;
}) {
  const lang = normalizeLocale(params.locale);
  const lines = [
    lang === "zh" ? "**审批转交提醒**" : "**Approval Reassigned**",
    `- ${lang === "zh" ? "标题" : "Title"}：${params.approval.title}`,
    params.previousApproverLabel
      ? `- ${lang === "zh" ? "原审批人" : "Previous approver"}：${params.previousApproverLabel}`
      : undefined,
    params.actorName
      ? `- ${lang === "zh" ? "操作人" : "Actor"}：${params.actorName}`
      : undefined,
    buildOpenMicroAppLine(params.approval, params.locale),
  ].filter(Boolean);
  return lines.join("\n");
}

export async function notifyApprovalReassigned(params: {
  request: Request;
  approval: ApprovalRequest;
  locale?: string;
  actorName?: string;
  previousApproverLabel?: string;
}) {
  const client = createDooTaskClientFromRequest(params.request);
  if (!client) return;
  await sendApprovalBotMessage({
    client,
    userId: params.approval.approverId,
    text: buildApprovalReassignedText(params),
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
