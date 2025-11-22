import PageHeader from "@/components/layout/PageHeader";
import OperationTemplateList from "@/components/system/OperationTemplateList";
import { listOperationTemplates } from "@/lib/repositories/operation-templates";
import { listActionConfigs } from "@/lib/repositories/action-configs";
import { getOperationStats } from "@/lib/repositories/asset-operations";

export default async function OperationManagementPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isChinese = locale === "zh";
  const templates = listOperationTemplates();
  const actionConfigs = listActionConfigs();
  const stats = getOperationStats();

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
            labelZh: "操作管理",
            labelEn: "Operation Management",
          },
        ]}
        title={isChinese ? "操作配置" : "Operation Templates"}
        description={
          isChinese
            ? "为采购、入库、领用等流程定义字段、附件要求和说明，以便前端表单与审批引用。"
            : "Define fields, attachment requirements, and descriptions for purchase, inbound, receive, and other operations."
        }
      />

      <OperationTemplateList
        templates={templates}
        locale={locale}
        actionConfigs={actionConfigs}
        stats={stats}
      />
    </div>
  );
}



