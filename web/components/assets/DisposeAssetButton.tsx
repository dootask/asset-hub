"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAppFeedback } from "@/components/providers/feedback-provider";
import { getApiClient } from "@/lib/http/client";
import { extractApiErrorMessage } from "@/lib/utils/api-error";
import { readBrowserUserCookie } from "@/lib/utils/user-cookie";

interface Props {
  assetId: string;
  locale?: string;
}

export default function DisposeAssetButton({ assetId, locale }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; name?: string } | null>(null);
  const feedback = useAppFeedback();

  useEffect(() => {
    const stored = readBrowserUserCookie();
    if (stored) {
      setCurrentUser({ id: String(stored.id), name: stored.nickname });
    }
  }, []);

  const dialogTitle = locale === "zh" ? "确认报废资产" : "Confirm Disposal";
  const dialogDesc =
    locale === "zh"
      ? "报废操作将把资产状态标记为已退役，并保留操作记录。"
      : "This will mark the asset as retired and keep an audit trail.";

  const searchSuffix = useMemo(() => {
    if (typeof window === "undefined") return "";
    if (window.location.search) {
      return window.location.search;
    }
    return locale ? `?lang=${locale}` : "";
  }, [locale]);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const client = await getApiClient();
      await client.post(
        `/apps/asset-hub/api/assets/${assetId}/dispose${searchSuffix}`,
        {
          reason,
          actor: currentUser ?? undefined,
        },
      );

      setOpen(false);
      setReason("");
      router.refresh();
      feedback.success(locale === "zh" ? "资产已报废" : "Asset disposed");
    } catch (err) {
      const message = extractApiErrorMessage(
        err,
        locale === "zh" ? "报废失败，请稍后再试。" : "Failed to dispose asset.",
      );
      feedback.error(message, {
        blocking: true,
        title: locale === "zh" ? "操作失败" : "Action failed",
        acknowledgeLabel: locale === "zh" ? "知道了" : "Got it",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="rounded-full">
          {locale === "zh" ? "报废资产" : "Dispose"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{dialogTitle}</AlertDialogTitle>
          <AlertDialogDescription>{dialogDesc}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label className="text-sm font-medium text-muted-foreground">
            {locale === "zh" ? "报废原因（可选）" : "Reason (optional)"}
          </Label>
          <Textarea
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>
            {locale === "zh" ? "取消" : "Cancel"}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={submitting || !currentUser}
            onClick={handleConfirm}
          >
            {submitting
              ? locale === "zh"
                ? "执行中..."
                : "Submitting..."
              : locale === "zh"
                ? "确认报废"
                : "Confirm"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
