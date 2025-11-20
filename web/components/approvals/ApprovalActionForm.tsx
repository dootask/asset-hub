"use client";

import { useEffect, useMemo, useState, useId } from "react";
import { useRouter } from "next/navigation";
import type { ApprovalAction, ApprovalRequest } from "@/lib/types/approval";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendApprovalUpdatedNotification } from "@/lib/client/dootask-notifications";

const ACTIONS: { value: ApprovalAction; labelZh: string; labelEn: string }[] = [
  { value: "approve", labelZh: "通过", labelEn: "Approve" },
  { value: "reject", labelZh: "驳回", labelEn: "Reject" },
  { value: "cancel", labelZh: "撤销", labelEn: "Cancel" },
];

interface Props {
  approvalId: string;
  locale?: string;
}

export default function ApprovalActionForm({ approvalId, locale }: Props) {
  const router = useRouter();
  const isChinese = locale === "zh";
  const [applicant, setApplicant] = useState({ id: "", name: "" });
  const [loadingUser, setLoadingUser] = useState(true);
  const [action, setAction] = useState<ApprovalAction>("approve");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fieldIds = {
    action: useId(),
    comment: useId(),
    actorId: useId(),
    actorName: useId(),
  };

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("asset-hub:dootask-user");
      if (raw) {
        const parsed = JSON.parse(raw) as {
          id?: string;
          nickname?: string;
        };
        setApplicant({
          id: parsed.id ?? "",
          name: parsed.nickname ?? "",
        });
      }
    } catch {
      // ignore
    } finally {
      setLoadingUser(false);
    }
  }, []);

  const canSubmit = useMemo(() => `${applicant.id}`.trim().length > 0, [applicant.id]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    try {
      const searchSuffix = (() => {
        if (typeof window === "undefined") return "";
        if (window.location.search) {
          return window.location.search;
        }
        return locale ? `?lang=${locale}` : "";
      })();
      const endpoint = `/apps/asset-hub/api/approvals/${approvalId}/actions${searchSuffix}`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          comment: comment.trim() ? comment.trim() : undefined,
          actor: {
            id: `${applicant.id}`.trim(),
            name: `${applicant.name}`.trim(),
          },
        }),
      });

      const payload = (await response.json()) as {
        data?: ApprovalRequest;
        message?: string;
      };

      if (!response.ok) {
        throw new Error(payload?.message ?? "提交失败");
      }

      if (payload?.data) {
        const actorName = applicant.name || applicant.id;
        void sendApprovalUpdatedNotification({
          approval: payload.data,
          locale,
          actorName,
        });
      }

      setComment("");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isChinese
            ? "操作失败，请稍后重试。"
            : "Failed to apply action, please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-2xl border bg-muted/20 p-4"
    >
      <div>
        <h3 className="text-sm font-semibold">
          {isChinese ? "审批操作" : "Approval Action"}
        </h3>
        <p className="text-xs text-muted-foreground">
          {isChinese
            ? "选择审批结果并填写说明。"
            : "Choose an action and add an optional note."}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label
          htmlFor={fieldIds.action}
          className="text-xs text-muted-foreground"
        >
          {isChinese ? "操作类型" : "Action"}
        </Label>
        <Select value={action} onValueChange={(value) => setAction(value as ApprovalAction)}>
          <SelectTrigger id={fieldIds.action} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACTIONS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {isChinese ? item.labelZh : item.labelEn}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label
          htmlFor={fieldIds.comment}
          className="text-xs text-muted-foreground"
        >
          {isChinese ? "审批意见" : "Comment"}
        </Label>
        <Textarea
          id={fieldIds.comment}
          rows={3}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder={
            isChinese ? "可选，填写审批意见..." : "Optional comment..."
          }
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label
            htmlFor={fieldIds.actorId}
            className="text-xs text-muted-foreground"
          >
            {isChinese ? "操作人 ID" : "Actor ID"}
          </Label>
          <Input
            id={fieldIds.actorId}
            required
            readOnly
            disabled={loadingUser}
            value={applicant.id}
          />
        </div>
        <div className="space-y-1.5">
          <Label
            htmlFor={fieldIds.actorName}
            className="text-xs text-muted-foreground"
          >
            {isChinese ? "操作人姓名" : "Actor Name"}
          </Label>
          <Input
            id={fieldIds.actorName}
            readOnly
            disabled={loadingUser}
            value={applicant.name}
          />
        </div>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <Button type="submit" disabled={!canSubmit || submitting} className="w-full rounded-2xl">
        {submitting
          ? isChinese
            ? "提交中..."
            : "Submitting..."
          : isChinese
            ? "提交操作"
            : "Submit"}
      </Button>
    </form>
  );
}
