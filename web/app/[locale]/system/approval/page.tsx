import type { Metadata } from "next";
import ActionConfigTable from "@/components/system/ActionConfigTable";
import PageHeader from "@/components/layout/PageHeader";

export const metadata: Metadata = {
  title: "审批配置 - Asset Hub",
};

export default async function ApprovalConfigPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isChinese = locale === "zh";

  return (
    <div className="space-y-6">
      <PageHeader
        locale={locale}
        items={[
          {
            href: `/${locale}/system`,
            labelZh: "系统管理",
            labelEn: "System",
          },
          {
            labelZh: "审批配置",
            labelEn: "Approval Config",
          },
        ]}
        title={isChinese ? "审批配置" : "Approval Configuration"}
        description={
          isChinese
            ? "为不同操作类型设置是否需要审批、默认审批人以及是否允许发起人更改。"
            : "Configure which actions require approval, default approvers, and override permissions."
        }
      />
      <ActionConfigTable initialConfigs={[]} locale={locale} />
    </div>
  );
}
