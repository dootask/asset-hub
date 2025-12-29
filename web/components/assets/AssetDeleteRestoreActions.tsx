"use client";

import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { useAppFeedback } from "@/components/providers/feedback-provider";
import { getApiClient } from "@/lib/http/client";
import { extractApiErrorMessage } from "@/lib/utils/api-error";

interface Props {
  assetId: string;
  locale?: string;
  isDeleted: boolean;
  onActionComplete?: () => void;
  redirectOnDelete?: boolean;
}

export default function AssetDeleteRestoreActions({
  assetId,
  locale,
  isDeleted,
  onActionComplete,
  redirectOnDelete = true,
}: Props) {
  const router = useRouter();
  const feedback = useAppFeedback();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [permanentOpen, setPermanentOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [permanentConfirm, setPermanentConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isChinese = locale === "zh";
  const resolvedLocale = locale ?? "en";

  const handleDelete = async () => {
    if (!reason.trim()) {
      feedback.error(isChinese ? "请填写删除原因。" : "Please provide a reason.");
      return;
    }
    setSubmitting(true);
    try {
      const client = await getApiClient();
      await client.delete(`/apps/asset-hub/api/assets/${assetId}`, {
        data: { reason: reason.trim() },
      });
      setDeleteOpen(false);
      setReason("");
      onActionComplete?.();
      if (redirectOnDelete) {
        router.push(`/${resolvedLocale}/assets/list`);
      }
      router.refresh();
      feedback.success(isChinese ? "资产已删除。" : "Asset deleted.");
    } catch (error) {
      const message = extractApiErrorMessage(
        error,
        isChinese ? "删除失败，请稍后重试。" : "Failed to delete asset.",
      );
      feedback.error(message, {
        blocking: true,
        title: isChinese ? "删除失败" : "Delete failed",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRestore = async () => {
    setSubmitting(true);
    try {
      const client = await getApiClient();
      await client.post(`/apps/asset-hub/api/assets/${assetId}/restore`);
      setRestoreOpen(false);
      onActionComplete?.();
      router.refresh();
      feedback.success(isChinese ? "资产已恢复。" : "Asset restored.");
    } catch (error) {
      const message = extractApiErrorMessage(
        error,
        isChinese ? "恢复失败，请稍后重试。" : "Failed to restore asset.",
      );
      feedback.error(message, {
        blocking: true,
        title: isChinese ? "恢复失败" : "Restore failed",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (isDeleted) {
    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        <AlertDialog open={restoreOpen} onOpenChange={setRestoreOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="rounded-full">
              {isChinese ? "恢复资产" : "Restore"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {isChinese ? "确认恢复资产" : "Restore asset?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {isChinese
                  ? "恢复后该资产将重新出现在列表中。"
                  : "The asset will be visible again after restoring."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={submitting}>
                {isChinese ? "取消" : "Cancel"}
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleRestore} disabled={submitting}>
                {submitting
                  ? isChinese
                    ? "处理中..."
                    : "Restoring..."
                  : isChinese
                    ? "确认恢复"
                    : "Restore"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={permanentOpen} onOpenChange={setPermanentOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="rounded-full">
              {isChinese ? "永久删除" : "Delete Forever"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {isChinese ? "永久删除资产" : "Delete asset forever?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {isChinese
                  ? "该操作不可恢复，请输入 DELETE 进行二次确认。"
                  : "This cannot be undone. Type DELETE to confirm."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">
                {isChinese ? "确认输入" : "Confirmation"}
              </Label>
              <Input
                value={permanentConfirm}
                onChange={(event) => setPermanentConfirm(event.target.value)}
                placeholder="DELETE"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={submitting}>
                {isChinese ? "取消" : "Cancel"}
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={submitting || permanentConfirm.trim() !== "DELETE"}
                onClick={async () => {
                  setSubmitting(true);
                  try {
                    const client = await getApiClient();
                    await client.delete(
                      `/apps/asset-hub/api/assets/${assetId}/permanent`,
                    );
                    setPermanentOpen(false);
                    setPermanentConfirm("");
                    onActionComplete?.();
                    router.refresh();
                    feedback.success(isChinese ? "已永久删除。" : "Permanently deleted.");
                  } catch (error) {
                    const message = extractApiErrorMessage(
                      error,
                      isChinese ? "永久删除失败。" : "Failed to delete permanently.",
                    );
                    feedback.error(message, {
                      blocking: true,
                      title: isChinese ? "删除失败" : "Delete failed",
                    });
                  } finally {
                    setSubmitting(false);
                  }
                }}
              >
                {submitting
                  ? isChinese
                    ? "删除中..."
                    : "Deleting..."
                  : isChinese
                    ? "确认永久删除"
                    : "Delete forever"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" className="rounded-full">
          {isChinese ? "删除资产" : "Delete"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isChinese ? "确认删除资产" : "Delete asset?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isChinese
              ? "删除后可在后台恢复，请填写删除原因。"
              : "Provide a reason for deletion. You can restore it later."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label className="text-sm font-medium text-muted-foreground">
            {isChinese ? "删除原因" : "Reason"}
          </Label>
          <Textarea
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={500}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>
            {isChinese ? "取消" : "Cancel"}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={submitting || !reason.trim()}
          >
            {submitting
              ? isChinese
                ? "删除中..."
                : "Deleting..."
              : isChinese
                ? "确认删除"
                : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
