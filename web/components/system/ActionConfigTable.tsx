"use client";

import { useMemo, useState, useTransition } from "react";
import type { ActionConfig, ActionConfigId } from "@/lib/types/action-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAppFeedback } from "@/components/providers/feedback-provider";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

interface Props {
  initialConfigs: ActionConfig[];
  locale?: string;
}

const APPROVER_TYPE_OPTIONS = [
  { value: "none", labelZh: "无需审批人", labelEn: "None" },
  { value: "user", labelZh: "指定用户", labelEn: "User" },
  { value: "role", labelZh: "指定角色", labelEn: "Role" },
];

const CONFIG_ORDER: ActionConfigId[] = [
  "purchase",
  "inbound",
  "receive",
  "borrow",
  "return",
  "maintenance",
  "dispose",
  "outbound",
  "reserve",
  "release",
  "adjust",
  "other",
];

export default function ActionConfigTable({ initialConfigs, locale }: Props) {
  const [configs, setConfigs] = useState(initialConfigs);
  const [savingId, setSavingId] = useState<ActionConfigId | null>(null);
  const [pending, startTransition] = useTransition();
  const isChinese = locale === "zh";
  const feedback = useAppFeedback();

  const sortedConfigs = useMemo(
    () =>
      [...configs].sort(
        (a, b) => CONFIG_ORDER.indexOf(a.id) - CONFIG_ORDER.indexOf(b.id),
      ),
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
        feedback.success(
          isChinese ? "配置已保存" : "Configuration saved",
        );
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : isChinese
              ? "保存审批配置失败。"
              : "Failed to save configuration.";
        feedback.error(message, {
          blocking: true,
          title: isChinese ? "保存失败" : "Save failed",
          acknowledgeLabel: isChinese ? "知道了" : "Got it",
        });
      } finally {
        setSavingId(null);
      }
    });
  };

  return (
    <div className="space-y-6">
      {sortedConfigs.length === 0 && (
        <div className="rounded-3xl border border-dashed border-muted-foreground/40 bg-muted/20 p-6 text-sm text-muted-foreground">
          {isChinese
            ? "暂无可用的审批配置。"
            : "No approval configurations available yet."}
        </div>
      )}
      {sortedConfigs.length > 0 && (
        <Accordion
          type="multiple"
          defaultValue={[]}
          className="divide-y divide-border/60 overflow-hidden rounded-3xl border border-border/60 bg-card/20"
        >
          {sortedConfigs.map((config) => {
            const approverTypeLabel =
              APPROVER_TYPE_OPTIONS.find(
                (option) => option.value === config.defaultApproverType,
              ) ??
              APPROVER_TYPE_OPTIONS[0];
            const approverRefs =
              config.defaultApproverRefs.length > 0
                ? config.defaultApproverRefs.join(", ")
                : isChinese
                  ? "未设置"
                  : "Not set";
            const updatedLabel = config.updatedAt
              ? new Date(config.updatedAt).toLocaleString()
              : isChinese
                ? "尚未保存"
                : "Not saved yet";

            return (
              <AccordionItem key={config.id} value={config.id} className="px-4">
                <AccordionTrigger className="py-4 hover:no-underline">
                  <div className="flex w-full flex-col gap-3 text-left sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1.5">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        {config.id}
                      </p>
                      <p className="text-base font-semibold">
                        {isChinese
                          ? config.labelZh ?? config.id
                          : config.labelEn ?? config.id}
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Badge variant={config.requiresApproval ? "default" : "secondary"}>
                          {config.requiresApproval
                            ? isChinese
                              ? "需要审批"
                              : "Approval required"
                            : isChinese
                              ? "无需审批"
                              : "No approval"}
                        </Badge>
                        <Badge variant={config.allowOverride ? "outline" : "secondary"}>
                          {config.allowOverride
                            ? isChinese
                              ? "允许申请人调整审批人"
                              : "Override allowed"
                            : isChinese
                              ? "审批人不可修改"
                              : "Approver locked"}
                        </Badge>
                        <Badge variant="outline">
                          {isChinese ? "审批人类型" : "Approver type"} ·{" "}
                          {isChinese ? approverTypeLabel.labelZh : approverTypeLabel.labelEn}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 text-xs text-muted-foreground sm:text-right">
                      <span>
                        {isChinese ? "默认审批人：" : "Default approvers:"} {approverRefs}
                      </span>
                      <span>
                        {isChinese ? "最近更新：" : "Last updated:"} {updatedLabel}
                      </span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-2">
                  <div className="space-y-6 py-2" data-testid={`action-config-card-${config.id}`}>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">
                          {isChinese ? "需要审批" : "Requires approval"}
                        </Label>
                        <div className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2">
                          <p className="text-sm text-muted-foreground">
                            {config.requiresApproval
                              ? isChinese
                                ? "启用后该操作会触发审批流程。"
                                : "If enabled, every submission must go through approval."
                              : isChinese
                                ? "关闭后该操作不再需要审批。"
                                : "Disable to allow direct submissions without approval."}
                          </p>
                          <Switch
                            checked={config.requiresApproval}
                            onCheckedChange={(checked) =>
                              handleChange(config.id, { requiresApproval: checked })
                            }
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">
                          {isChinese ? "允许申请人修改审批人" : "Allow applicant override"}
                        </Label>
                        <div className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2">
                          <p className="text-sm text-muted-foreground">
                            {config.allowOverride
                              ? isChinese
                                ? "申请人可以在表单中调换审批人。"
                                : "Applicants may select a different approver."
                              : isChinese
                                ? "审批人固定，由系统配置控制。"
                                : "Approver stays fixed per configuration."}
                          </p>
                          <Switch
                            checked={config.allowOverride}
                            onCheckedChange={(checked) =>
                              handleChange(config.id, { allowOverride: checked })
                            }
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
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
                            <SelectValue placeholder={isChinese ? "选择类型" : "Select type"} />
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
                        <div className="space-y-2">
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
                            onChange={(event) =>
                              handleRefsChange(config.id, event.target.value)
                            }
                            placeholder={
                              config.defaultApproverType === "user"
                                ? isChinese
                                  ? "示例：user-1, user-2"
                                  : "e.g. user-1, user-2"
                                : isChinese
                                  ? "示例：role-asset-admin"
                                  : "e.g. role-asset-admin"
                            }
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-3 border-t pt-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                      <p>
                        {isChinese
                          ? "保存后，新审批请求会立即应用最新策略。"
                          : "After saving, new approval requests inherit the latest policy."}
                      </p>
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
                            : "Save configuration"}
                      </Button>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
}
