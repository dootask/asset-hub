"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { APPROVAL_TYPES, ApprovalType } from "@/lib/types/approval";
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

type Applicant = {
  id: string;
  name?: string;
};

interface Props {
  assetId: string;
  assetName: string;
  locale?: string;
}

export default function ApprovalRequestForm({
  assetId,
  assetName,
  locale,
}: Props) {
  const router = useRouter();
  const isChinese = locale === "zh";
  const [loadingUser, setLoadingUser] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [applicant, setApplicant] = useState<Applicant>({
    id: "",
    name: "",
  });

  const [formState, setFormState] = useState({
    type: APPROVAL_TYPES[0].value,
    title: "",
    reason: "",
    approverId: "",
    approverName: "",
  });

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

  useEffect(() => {
    if (!formState.title) {
      const typeInfo = APPROVAL_TYPES.find(
        (item) => item.value === formState.type,
      );
      if (typeInfo) {
        const label = isChinese ? typeInfo.labelZh : typeInfo.labelEn;
        setFormState((prev) => ({
          ...prev,
          title: `${label} - ${assetName}`,
        }));
      }
    }
  }, [formState.type, assetName, formState.title, isChinese]);

  const canSubmit = useMemo(() => {
    return (
      `${applicant.id}`.trim().length > 0 &&
      `${formState.title}`.trim().length > 0 &&
      `${formState.reason}`.trim().length > 0
    );
  }, [applicant.id, formState.title, formState.reason]);

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
      const endpoint = `/apps/asset-hub/api/approvals${searchSuffix}`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: formState.type,
          title: formState.title.trim(),
          reason: formState.reason.trim(),
          assetId,
          applicant: {
            id: `${applicant.id}`.trim(),
            name: `${applicant.name}`.trim(),
          },
          approver:
            formState.approverId || formState.approverName
              ? {
                  id: formState.approverId || undefined,
                  name: formState.approverName || undefined,
                }
              : undefined,
          metadata: {
            initiatedFrom: "asset-detail",
          },
        }),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload?.message ?? "无法提交审批请求");
      }

      setFormState({
        type: APPROVAL_TYPES[0].value,
        title: "",
        reason: "",
        approverId: "",
        approverName: "",
      });
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isChinese
            ? "提交失败，请稍后再试。"
            : "Failed to create approval request.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-2xl border bg-muted/30 p-4"
    >
      <div>
        <h3 className="text-sm font-semibold">
          {isChinese ? "发起审批" : "New Approval"}
        </h3>
        <p className="text-xs text-muted-foreground">
          {isChinese
            ? "填写审批信息，提交后将在审批中心查看进度。"
            : "Fill the approval request and track it in the approval center."}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">
          {isChinese ? "审批类型" : "Approval Type"}
        </Label>
        <Select
          value={formState.type}
          onValueChange={(value) =>
            setFormState((prev) => ({ ...prev, type: value as ApprovalType }))
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {APPROVAL_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {isChinese ? type.labelZh : type.labelEn}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">
          {isChinese ? "标题" : "Title"}
        </Label>
        <Input
          required
          value={formState.title}
          onChange={(event) =>
            setFormState((prev) => ({ ...prev, title: event.target.value }))
          }
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">
          {isChinese ? "事由" : "Reason"}
        </Label>
        <Textarea
          required
          rows={3}
          value={formState.reason}
          onChange={(event) =>
            setFormState((prev) => ({ ...prev, reason: event.target.value }))
          }
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">
            {isChinese ? "申请人 ID" : "Applicant ID"}
          </Label>
          <Input
            required
            readOnly
            value={applicant.id}
            disabled={loadingUser}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">
            {isChinese ? "申请人姓名" : "Applicant Name"}
          </Label>
          <Input
            readOnly
            value={applicant.name ?? ""}
            disabled={loadingUser}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">
            {isChinese ? "审批人 ID" : "Approver ID"}
          </Label>
          <Input
            value={formState.approverId}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                approverId: event.target.value,
              }))
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">
            {isChinese ? "审批人姓名" : "Approver Name"}
          </Label>
          <Input
            value={formState.approverName}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                approverName: event.target.value,
              }))
            }
          />
        </div>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <Button
        type="submit"
        disabled={!canSubmit || submitting}
        className="w-full rounded-2xl"
      >
        {submitting
          ? isChinese
            ? "提交中..."
            : "Submitting..."
          : isChinese
            ? "提交审批"
            : "Submit Request"}
      </Button>
    </form>
  );
}


