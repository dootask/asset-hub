"use client";

import { useMemo, useState, useTransition } from "react";
import type { ActionConfig, ActionConfigId } from "@/lib/types/action-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface Props {
  initialConfigs: ActionConfig[];
  locale?: string;
}

const APPROVER_TYPE_OPTIONS = [
  { value: "none", labelZh: "无需审批人", labelEn: "None" },
  { value: "user", labelZh: "指定用户", labelEn: "User" },
  { value: "role", labelZh: "指定角色", labelEn: "Role" },
];

const LABELS: Record<ActionConfigId, { zh: string; en: string }> = {
  purchase: { zh: "采购", en: "Purchase" },
  inbound: { zh: "入库", en: "Inbound" },
  receive: { zh: "领用", en: "Receive" },
  borrow: { zh: "借用", en: "Borrow" },
  return: { zh: "归还", en: "Return" },
  maintenance: { zh: "维护", en: "Maintenance" },
  dispose: { zh: "报废", en: "Dispose" },
  other: { zh: "其他", en: "Other" },
};

export default function ActionConfigTable({ initialConfigs, locale }: Props) {
  const [configs, setConfigs] = useState(initialConfigs);
  const [savingId, setSavingId] = useState<ActionConfigId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const isChinese = locale === "zh";

  const sortedConfigs = useMemo(
    () =>
      [...configs].sort((a, b) => {
        const order = Object.keys(LABELS) as ActionConfigId[];
        return order.indexOf(a.id) - order.indexOf(b.id);
      }),
    [configs],
  );

  const handleChange = (id: ActionConfigId, partial: Partial<ActionConfig>) => {
    setConfigs((prev) =>
      prev.map((config) => (config.id === id ? { ...config, ...partial } : config)),
    );
  };

  const handleRefsChange = (id: ActionConfigId, value: string) => {
    const refs = value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
    handleChange(id, { defaultApproverRefs: refs });
  };

  const handleSave = (config: ActionConfig) => {
    setSavingId(config.id);
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch(
          `/apps/asset-hub/api/config/approvals/${config.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              requiresApproval: config.requiresApproval,
              defaultApproverType: config.defaultApproverType,
              defaultApproverRefs: config.defaultApproverRefs,
              allowOverride: config.allowOverride,
              metadata: config.metadata,
            }),
          },
        );
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.message ?? "保存失败");
        }
        const payload = (await response.json()) as { data: ActionConfig };
        setConfigs((prev) =>
          prev.map((item) => (item.id === config.id ? payload.data : item)),
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : isChinese
              ? "保存审批配置失败。"
              : "Failed to save configuration.",
        );
      } finally {
        setSavingId(null);
      }
    });
  };

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="space-y-6">
        {sortedConfigs.map((config) => (
          <div
            key={config.id}
            data-testid={`action-config-card-${config.id}`}
            className="rounded-2xl border bg-card/70 p-4 shadow-sm"
          >
            <div className="flex flex-col gap-2 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-muted-foreground uppercase">
                  {config.id}
                </p>
                <h2 className="text-lg font-semibold">
                  {isChinese ? LABELS[config.id].zh : LABELS[config.id].en}
                </h2>
              </div>
              <Button
                variant="default"
                disabled={pending || savingId === config.id}
                onClick={() => handleSave(config)}
              >
                {savingId === config.id
                  ? isChinese
                    ? "保存中..."
                    : "Saving..."
                  : isChinese
                    ? "保存配置"
                    : "Save"}
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  {isChinese ? "需要审批" : "Requires approval"}
                </Label>
                <Switch
                  checked={config.requiresApproval}
                  onCheckedChange={(checked) =>
                    handleChange(config.id, { requiresApproval: checked })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  {isChinese ? "允许申请人修改审批人" : "Allow override"}
                </Label>
                <Switch
                  checked={config.allowOverride}
                  onCheckedChange={(checked) =>
                    handleChange(config.id, { allowOverride: checked })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  {isChinese ? "默认审批人类型" : "Default approver type"}
                </Label>
                <Select
                  value={config.defaultApproverType}
                  onValueChange={(value) =>
                    handleChange(config.id, {
                      defaultApproverType: value as ActionConfig["defaultApproverType"],
                      defaultApproverRefs: [],
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {APPROVER_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {isChinese ? option.labelZh : option.labelEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {config.defaultApproverType !== "none" && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    {config.defaultApproverType === "user"
                      ? isChinese
                        ? "默认审批人 ID（逗号分隔）"
                        : "Default user IDs (comma separated)"
                      : isChinese
                        ? "默认角色 ID（逗号分隔）"
                        : "Default role IDs (comma separated)"}
                  </Label>
                  <Input
                    value={config.defaultApproverRefs.join(", ")}
                    onChange={(event) => handleRefsChange(config.id, event.target.value)}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


