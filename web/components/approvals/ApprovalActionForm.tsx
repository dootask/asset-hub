"use client";

import { useEffect, useMemo, useState, useId } from "react";
import { useRouter } from "next/navigation";
import type { ApprovalAction, ApprovalRequest, ApprovalType } from "@/lib/types/approval";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAppFeedback } from "@/components/providers/feedback-provider";
import { getApiClient } from "@/lib/http/client";
import { extractApiErrorMessage } from "@/lib/utils/api-error";
import { usePermissions } from "@/components/providers/PermissionProvider";
import ApprovalReassignForm from "@/components/approvals/ApprovalReassignForm";
import { coerceMoneyToCents, formatCentsToMoney } from "@/lib/utils/money";

const ACTIONS: { value: ApprovalAction; labelZh: string; labelEn: string }[] = [
  { value: "approve", labelZh: "通过", labelEn: "Approve" },
  { value: "reject", labelZh: "驳回", labelEn: "Reject" },
  { value: "cancel", labelZh: "撤销", labelEn: "Cancel" },
];

interface Props {
  approvalId: string;
  approvalType: ApprovalType;
  locale?: string;
  approverId?: string | null;
  approverName?: string | null;
  applicantId: string;
  onUpdated?: () => void | Promise<void>;
  syncPurchasePriceOption?: {
    target: "asset" | "consumable";
    cost?: string | number | null;
    initialChecked?: boolean;
  };
}

export default function ApprovalActionForm({ 
  approvalId, 
  approvalType,
  locale,
  approverId,
  approverName,
  applicantId,
  onUpdated,
  syncPurchasePriceOption,
}: Props) {
  const router = useRouter();
  const isChinese = locale === "zh";
  const { user, userReady, isAdmin, isApprover } = usePermissions();
  const [action, setAction] = useState<ApprovalAction | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showReassign, setShowReassign] = useState(false);
  const [syncPurchasePrice, setSyncPurchasePrice] = useState(
    syncPurchasePriceOption?.initialChecked ?? true,
  );
  const feedback = useAppFeedback();
  const fieldIds = {
    action: useId(),
    comment: useId(),
    actorId: useId(),
    actorName: useId(),
    syncPurchasePrice: useId(),
  };

  const availableActions = useMemo(() => {
    if (!userReady || !user) return [];
    const userIdStr = String(user.id);
    const allowed: typeof ACTIONS = [];

    // Admin or Assigned Approver can Approve/Reject
    // Note: logic matches backend canApprove()
    if (isAdmin || (isApprover && approverId && userIdStr === approverId)) {
      allowed.push(ACTIONS[0]); // approve
      allowed.push(ACTIONS[1]); // reject
    }

    // Applicant or Admin can Cancel
    if (isAdmin || userIdStr === applicantId) {
      allowed.push(ACTIONS[2]); // cancel
    }

    // Deduplicate just in case (though indices above are distinct)
    return Array.from(new Set(allowed));
  }, [user, userReady, isAdmin, isApprover, approverId, applicantId]);

  // Set default action when available actions change
  useEffect(() => {
    if (availableActions.length > 0 && !action) {
      setAction(availableActions[0].value);
    }
  }, [availableActions, action]);

  if (!userReady) return null; // or loading spinner

  const canReassign =
    !!user &&
    (isAdmin || isApprover || (approverId && String(user.id) === approverId));
  if (availableActions.length === 0 && !canReassign) return null;

  const showActionForm = availableActions.length > 0;
  const canSubmit = Boolean(user && action && showActionForm);
  const showSyncPurchasePrice = Boolean(syncPurchasePriceOption) && action === "approve";
  const syncPurchasePriceCents = showSyncPurchasePrice
    ? coerceMoneyToCents(syncPurchasePriceOption?.cost ?? null)
    : null;
  const syncPurchasePriceDisabled = syncPurchasePriceCents === null;
  const syncTargetLabel = syncPurchasePriceOption?.target === "consumable"
    ? isChinese
      ? "耗材采购价格"
      : "consumable purchase price"
    : isChinese
      ? "资产采购价格"
      : "asset purchase price";

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit || !user || !action) return;
    if (showSyncPurchasePrice && syncPurchasePrice) {
      if (syncPurchasePriceDisabled) {
        feedback.error(
          isChinese
            ? "操作详情未填写有效的费用(cost)，无法同步采购价格。"
            : "Operation cost is missing/invalid, cannot sync purchase price.",
        );
        return;
      }
      const confirmed = window.confirm(
        isChinese
          ? `已选择同步“费用(cost)”到${syncTargetLabel}（会覆盖当前值）。是否继续提交？`
          : `You chose to sync cost into the ${syncTargetLabel} (will overwrite current value). Continue?`,
      );
      if (!confirmed) {
        return;
      }
    }
    setSubmitting(true);

    try {
      const searchSuffix = (() => {
        if (typeof window === "undefined") return "";
        if (window.location.search) {
          return window.location.search;
        }
        return locale ? `?lang=${locale}` : "";
      })();
      const endpoint = `/apps/asset-hub/api/approvals/${approvalId}/actions${searchSuffix}`;
      const client = await getApiClient();
      await client.post<{
        data?: ApprovalRequest;
        message?: string;
      }>(endpoint, {
        action,
        comment: comment.trim() ? comment.trim() : undefined,
        ...(showSyncPurchasePrice
          ? { syncPurchasePrice: Boolean(syncPurchasePrice) }
          : {}),
        actor: {
          id: String(user.id),
          name: user.nickname,
        },
      });

      setComment("");
      await onUpdated?.();
      router.refresh();
      feedback.success(isChinese ? "审批动作已提交" : "Action submitted");
    } catch (err) {
      const message = extractApiErrorMessage(
        err,
        isChinese ? "操作失败，请稍后重试。" : "Failed to apply action, please try again.",
      );
      feedback.error(message, {
        blocking: true,
        title: isChinese ? "提交失败" : "Submit failed",
        acknowledgeLabel: isChinese ? "知道了" : "Got it",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border bg-muted/20 p-4">
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

      {showActionForm ? (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label
              htmlFor={fieldIds.action}
              className="gap-1 text-xs text-muted-foreground"
            >
              {isChinese ? "操作类型" : "Action"}
              <span className="text-destructive">*</span>
            </Label>
            <Select
              value={action || ""}
              onValueChange={(value) => setAction(value as ApprovalAction)}
            >
              <SelectTrigger id={fieldIds.action} className="w-full">
                <SelectValue placeholder={isChinese ? "请选择" : "Select action"} />
              </SelectTrigger>
              <SelectContent>
                {availableActions.map((item) => (
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

          {syncPurchasePriceOption && action === "approve" && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                {isChinese ? "同步设置" : "Sync Settings"}
              </Label>
              <label
                htmlFor={fieldIds.syncPurchasePrice}
                className="flex items-start gap-3 rounded-xl border bg-muted/30 px-3 py-2"
              >
                <Checkbox
                  id={fieldIds.syncPurchasePrice}
                  checked={syncPurchasePrice}
                  onCheckedChange={(checked) =>
                    setSyncPurchasePrice(Boolean(checked))
                  }
                  disabled={syncPurchasePriceDisabled}
                  className="mt-0.5 border-muted-foreground/40"
                />
                <div className="space-y-1">
                  <div className="text-sm font-medium">
                    {isChinese
                      ? `同步费用(cost)到${syncTargetLabel}`
                      : `Sync cost into ${syncTargetLabel}`}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {syncPurchasePriceDisabled
                      ? isChinese
                        ? "未检测到有效的费用(cost)数值。"
                        : "No valid cost value detected."
                      : isChinese
                        ? `将使用费用(cost)=${formatCentsToMoney(syncPurchasePriceCents)} CNY 覆盖当前采购价格。`
                        : `Will use cost=${formatCentsToMoney(syncPurchasePriceCents)} CNY to overwrite current purchase price.`}
                  </p>
                </div>
              </label>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
            <Label
              htmlFor={fieldIds.actorId}
              className="gap-1 text-xs text-muted-foreground"
            >
              {isChinese ? "操作人 ID" : "Actor ID"}
              <span className="text-destructive">*</span>
            </Label>
              <Input
                id={fieldIds.actorId}
                required
                readOnly
                disabled
                value={user?.id ?? ""}
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
                disabled
                value={user?.nickname ?? ""}
              />
            </div>
          </div>

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
                ? "提交操作"
                : "Submit"}
          </Button>
        </form>
      ) : (
        <p className="text-xs text-muted-foreground">
          {isChinese
            ? "你不是当前审批人，无法直接执行通过/驳回。"
            : "You are not the assigned approver, so you cannot approve/reject."}
        </p>
      )}

      {canReassign && (
        <Button
          type="button"
          variant="secondary"
          className="w-full rounded-2xl"
          onClick={() => setShowReassign((prev) => !prev)}
        >
          {showReassign
            ? isChinese
              ? "收起更换审批人"
              : "Hide reassign form"
            : isChinese
              ? "更换审批人"
              : "Reassign approver"}
        </Button>
      )}

      {canReassign && showReassign && (
        <ApprovalReassignForm
          approvalId={approvalId}
          approvalType={approvalType}
          status="pending"
          locale={locale}
          applicantId={applicantId}
          approverId={approverId}
          approverName={approverName}
          variant="embedded"
          onUpdated={onUpdated}
        />
      )}
    </div>
  );
}
