import PageBreadcrumb from "@/components/layout/PageBreadcrumb";
import AlertSettingsForm from "@/components/system/AlertSettingsForm";
import { getAlertSettings } from "@/lib/repositories/system-settings";

export default async function AlertsSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isChinese = locale === "zh";
  const settings = getAlertSettings();

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
              labelZh: "告警配置",
              labelEn: "Alert Settings",
            },
          ]}
        />
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {isChinese ? "告警配置" : "Alert Settings"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isChinese
            ? "控制是否启用低库存告警以及是否推送到 DooTask 待办。"
            : "Control whether low stock alerts are enabled and whether they push into DooTask todos."}
        </p>
      </header>
      <AlertSettingsForm locale={locale} initialSettings={settings} />
    </div>
  );
}


