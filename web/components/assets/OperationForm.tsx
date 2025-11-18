"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { OPERATION_TYPES } from "@/lib/types/operation";

type Props = {
  assetId: string;
  locale?: string;
};

export default function OperationForm({ assetId, locale = "en" }: Props) {
  const router = useRouter();
  const isChinese = locale === "zh";

  const [formState, setFormState] = useState({
    type: OPERATION_TYPES[0].value,
    actor: "",
    description: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(
        `/apps/asset-hub/api/assets/${assetId}/operations`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formState),
        },
      );

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload?.message ?? "提交失败");
      }

      setFormState({
        type: OPERATION_TYPES[0].value,
        actor: "",
        description: "",
      });
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isChinese
            ? "无法创建操作记录，请稍后重试。"
            : "Failed to create operation, please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border bg-muted/40 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="operation-type" className="text-xs font-medium text-muted-foreground">
            {isChinese ? "操作类型" : "Operation Type"}
          </Label>
          <Select
            value={formState.type}
            onValueChange={(value) =>
              setFormState((prev) => ({ ...prev, type: value }))
            }
          >
            <SelectTrigger id="operation-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OPERATION_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="operation-actor" className="text-xs font-medium text-muted-foreground">
            {isChinese ? "经办人" : "Actor"}
          </Label>
          <Input
            id="operation-actor"
            required
            value={formState.actor}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, actor: event.target.value }))
            }
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label
          htmlFor="operation-description"
          className="text-xs font-medium text-muted-foreground"
        >
          {isChinese ? "说明" : "Description"}
        </Label>
        <Textarea
          id="operation-description"
          rows={3}
          value={formState.description}
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              description: event.target.value,
            }))
          }
        />
      </div>
      {error && (
        <p className="text-xs text-destructive">
          {error}
        </p>
      )}
      <Button
        type="submit"
        disabled={submitting}
        className="rounded-2xl px-4 py-2 text-sm"
      >
        {submitting
          ? isChinese
            ? "提交中..."
            : "Submitting..."
          : isChinese
            ? "记录操作"
            : "Log Operation"}
      </Button>
    </form>
  );
}

