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

interface Props {
  assetId: string;
  locale?: string;
}

export default function DisposeAssetButton({ assetId, locale }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string; name?: string } | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("asset-hub:dootask-user");
      if (raw) {
        const parsed = JSON.parse(raw) as { id?: string; nickname?: string };
        if (parsed.id) {
          setCurrentUser({ id: parsed.id, name: parsed.nickname });
        }
      }
    } catch {
      // ignore
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
    setError(null);
    try {
      const response = await fetch(
        `/apps/asset-hub/api/assets/${assetId}/dispose${searchSuffix}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reason,
            actor: currentUser ?? undefined,
          }),
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message ?? "报废失败，请稍后再试。");
      }

      setOpen(false);
      setReason("");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : locale === "zh"
            ? "报废失败，请稍后再试。"
            : "Failed to dispose asset.",
      );
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
          {error && <p className="text-sm text-destructive">{error}</p>}
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


