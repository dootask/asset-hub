"use client";

import { useState, useTransition } from "react";
import type { OperationTemplate } from "@/lib/types/operation-template";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface Props {
  templates: OperationTemplate[];
  locale?: string;
}

export default function OperationTemplateList({ templates, locale = "en" }: Props) {
  const isChinese = locale === "zh";
  const [items, setItems] = useState(() => templates);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [metadataDrafts, setMetadataDrafts] = useState<Record<string, string>>(() =>
    templates.reduce<Record<string, string>>((acc, template) => {
      acc[template.type] = template.metadata
        ? JSON.stringify(template.metadata, null, 2)
        : "";
      return acc;
    }, {}),
  );

  const handleChange = (type: OperationTemplate["type"], partial: Partial<OperationTemplate>) => {
    setItems((prev) =>
      prev.map((item) => (item.type === type ? { ...item, ...partial } : item)),
    );
  };

  const handleSave = (template: OperationTemplate) => {
    const rawMetadata = metadataDrafts[template.type] ?? "";
    let parsedMetadata: Record<string, unknown> | null = null;
    if (rawMetadata.trim()) {
      try {
        parsedMetadata = JSON.parse(rawMetadata);
      } catch {
        setError(
          isChinese ? "字段配置必须是合法的 JSON。" : "Metadata must be valid JSON.",
        );
        return;
      }
    }
    setPendingId(template.type);
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch(`/apps/asset-hub/api/config/operations/${template.type}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            descriptionZh: template.descriptionZh,
            descriptionEn: template.descriptionEn,
            requireAttachment: template.requireAttachment,
            metadata: parsedMetadata,
          }),
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.message ?? "保存失败，请稍后重试。");
        }
        const { data } = (await response.json()) as { data: OperationTemplate };
        setItems((prev) => prev.map((item) => (item.type === data.type ? data : item)));
        setMetadataDrafts((prev) => ({
          ...prev,
          [data.type]: data.metadata ? JSON.stringify(data.metadata, null, 2) : "",
        }));
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : isChinese
              ? "保存失败，请稍后重试。"
              : "Failed to save template.",
        );
      } finally {
        setPendingId(null);
      }
    });
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      {items.map((template) => (
        <div key={template.id} className="rounded-3xl border bg-card/70 p-5 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {template.type}
              </p>
              <h2 className="text-lg font-semibold">
                {isChinese ? template.labelZh : template.labelEn}
              </h2>
            </div>
            <Button
              type="button"
              className="rounded-2xl px-4 py-2 text-sm"
              disabled={isPending && pendingId === template.type}
              onClick={() => handleSave(template)}
            >
              {isPending && pendingId === template.type
                ? isChinese
                  ? "保存中..."
                  : "Saving..."
                : isChinese
                  ? "保存配置"
                  : "Save"}
            </Button>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                {isChinese ? "说明（中文）" : "Description (ZH)"}
              </Label>
              <Textarea
                rows={3}
                value={template.descriptionZh ?? ""}
                onChange={(event) =>
                  handleChange(template.type, { descriptionZh: event.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                {isChinese ? "说明（英文）" : "Description (EN)"}
              </Label>
              <Textarea
                rows={3}
                value={template.descriptionEn ?? ""}
                onChange={(event) =>
                  handleChange(template.type, { descriptionEn: event.target.value })
                }
              />
            </div>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr,2fr]">
            <div className="flex items-center justify-between rounded-2xl border bg-muted/30 px-4 py-3">
              <div>
                <p className="text-sm font-medium">
                  {isChinese ? "需要附件" : "Require attachment"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isChinese
                    ? "启用后在提交操作或审批时需要上传附件。"
                    : "If enabled, attachments become mandatory when submitting operations or approvals."}
                </p>
              </div>
              <Switch
                checked={template.requireAttachment}
                onCheckedChange={(checked) =>
                  handleChange(template.type, { requireAttachment: checked })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                {isChinese ? "字段配置（JSON）" : "Field config (JSON)"}
              </Label>
              <Textarea
                rows={4}
                value={metadataDrafts[template.type] ?? ""}
                onChange={(event) => {
                  const value = event.target.value;
                  setMetadataDrafts((prev) => ({ ...prev, [template.type]: value }));
                }}
                placeholder='例如：{"fields":["receiver","purpose"]}'
              />
              <p className="text-xs text-muted-foreground">
                {isChinese
                  ? "用于定义 OperationForm 的字段，如 [\"receiver\",\"purpose\"]。"
                  : "Define the OperationForm fields, e.g. [\"receiver\",\"purpose\"]."}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}


