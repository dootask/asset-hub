import type { Metadata } from "next";
import PageBreadcrumb from "@/components/layout/PageBreadcrumb";

export const metadata: Metadata = {
  title: "耗材设置 - Asset Hub",
};

export default async function ConsumableSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isChinese = locale === "zh";

  return (
    <div className="space-y-6">
      <header>
        <PageBreadcrumb
          locale={locale}
          items={[
            {
              href: `/${locale}/consumables`,
              labelZh: "耗材管理",
              labelEn: "Consumables",
            },
            {
              labelZh: "耗材设置",
              labelEn: "Settings",
            },
          ]}
        />
        <h1 className="mt-2 text-2xl font-semibold">
          {isChinese ? "耗材字段与类别（预留）" : "Consumable Settings (Preview)"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isChinese
            ? "将在后续版本中支持定义耗材类别和自定义字段。"
            : "Future releases will allow defining consumable categories and custom fields."}
        </p>
      </header>
      <div className="rounded-2xl border border-dashed bg-muted/30 p-10 text-center text-sm text-muted-foreground">
        {isChinese
          ? "耗材设置正在规划中，敬请期待。"
          : "Consumable settings are under construction."}
      </div>
    </div>
  );
}

