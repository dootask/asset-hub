import PageBreadcrumb from "@/components/layout/PageBreadcrumb";
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
      <header>
        <PageBreadcrumb
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
        />
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {isChinese ? "操作配置" : "Operation Templates"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isChinese
            ? "为采购、入库、领用等流程定义字段、附件要求和说明，以便前端表单与审批引用。"
            : "Define fields, attachment requirements, and descriptions for purchase, inbound, receive, and other operations."}
        </p>
      </header>

      <OperationTemplateList
        templates={templates}
        locale={locale}
        actionConfigs={actionConfigs}
        stats={stats}
      />
    </div>
  );
}



