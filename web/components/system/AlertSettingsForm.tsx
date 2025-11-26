"use client";

import { useState, useTransition } from "react";
import { AlertSettings } from "@/lib/repositories/system-settings";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAppFeedback } from "@/components/providers/feedback-provider";
import { getApiClient } from "@/lib/http/client";
import { extractApiErrorMessage } from "@/lib/utils/api-error";

interface Props {
  locale: string;
  initialSettings: AlertSettings;
}

export default function AlertSettingsForm({ locale, initialSettings }: Props) {
  const isChinese = locale === "zh";
  const [settings, setSettings] = useState(initialSettings);
  const [pending, startTransition] = useTransition();
  const feedback = useAppFeedback();

  const handleSubmit = () => {
    startTransition(async () => {
      try {
        const client = await getApiClient();
        await client.put("/apps/asset-hub/api/system/settings/alerts", settings);
        feedback.success(isChinese ? "已保存告警设置。" : "Alert settings saved.");
      } catch (err) {
        const message = extractApiErrorMessage(
          err,
          isChinese
            ? "保存失败，请稍后再试。"
            : "Failed to save settings. Please try again.",
        );
        feedback.error(message, {
          blocking: true,
          title: isChinese ? "保存失败" : "Save failed",
          acknowledgeLabel: isChinese ? "知道了" : "Got it",
        });
      }
    });
  };

  const rows = [
    {
      key: "alertsEnabled" as const,
      label: isChinese ? "启用低库存告警" : "Enable low-stock alerts",
      description: isChinese
        ? "关闭后，系统将不再创建新的低库存/缺货告警。"
        : "When disabled, the system will stop creating new low/out-of-stock alerts.",
    },
    {
      key: "pushEnabled" as const,
      label: isChinese ? "推送到 DooTask 待办" : "Push to DooTask todos",
      description: isChinese
        ? "若关闭，仍会在 Asset Hub 内创建告警，但不会调用 DooTask API。"
        : "When disabled, alerts stay inside Asset Hub without calling DooTask APIs.",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-2xl border bg-card p-5">
        {rows.map((row) => (
          <div
            key={row.key}
            className="flex flex-col gap-2 rounded-xl border border-dashed border-muted-foreground/30 bg-muted/20 p-4 md:flex-row md:items-center md:justify-between"
          >
            <div>
              <Label className="text-base font-semibold">{row.label}</Label>
              <p className="text-sm text-muted-foreground">{row.description}</p>
            </div>
            <Switch
              disabled={pending}
              checked={settings[row.key]}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({ ...prev, [row.key]: checked }))
              }
            />
          </div>
        ))}
    </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button onClick={handleSubmit} disabled={pending}>
          {pending
            ? isChinese
              ? "保存中"
              : "Saving"
            : isChinese
              ? "保存配置"
              : "Save settings"}
        </Button>
      </div>
    </div>
  );
}
