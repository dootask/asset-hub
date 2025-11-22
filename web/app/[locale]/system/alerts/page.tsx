import PageHeader from "@/components/layout/PageHeader";
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
      <PageHeader
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
        title={isChinese ? "告警配置" : "Alert Settings"}
        description={
          isChinese
            ? "控制是否启用低库存告警以及是否推送到 DooTask 待办。"
            : "Control whether low stock alerts are enabled and whether they push into DooTask todos."
        }
      />
      <AlertSettingsForm locale={locale} initialSettings={settings} />
    </div>
  );
}


