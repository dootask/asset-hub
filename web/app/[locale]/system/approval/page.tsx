import type { Metadata } from "next";
import { getRequestBaseUrl } from "@/lib/utils/server-url";
import type { ActionConfig } from "@/lib/types/action-config";
import ActionConfigTable from "@/components/system/ActionConfigTable";
import SystemBreadcrumb from "@/components/system/SystemBreadcrumb";

export const metadata: Metadata = {
  title: "审批配置 - Asset Hub",
};

async function fetchConfigs() {
  const baseUrl = await getRequestBaseUrl();
  const response = await fetch(
    `${baseUrl}/apps/asset-hub/api/config/approvals`,
    { cache: "no-store" },
  );
  if (!response.ok) {
    throw new Error("无法加载审批配置");
  }
  const payload = (await response.json()) as { data: ActionConfig[] };
  return payload.data;
}

export default async function ApprovalConfigPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const [configs, { locale }] = await Promise.all([fetchConfigs(), params]);
  const isChinese = locale === "zh";

  return (
    <div className="space-y-6">
      <header>
        <SystemBreadcrumb
          locale={locale}
          currentLabelZh="审批配置"
          currentLabelEn="Approval Config"
        />
        <h1 className="mt-2 text-2xl font-semibold">
          {isChinese ? "审批配置" : "Approval Configuration"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isChinese
            ? "为不同操作类型设置是否需要审批、默认审批人以及是否允许发起人更改。"
            : "Configure which actions require approval, default approvers, and override permissions."}
        </p>
      </header>
      <ActionConfigTable initialConfigs={configs} locale={locale} />
    </div>
  );
}


