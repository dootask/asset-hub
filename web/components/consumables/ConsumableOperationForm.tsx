"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CONSUMABLE_ACTION_CONFIGS,
  type ConsumableActionConfig,
} from "@/lib/config/consumable-action-configs";
import {
  CONSUMABLE_OPERATION_TYPES,
  type ConsumableOperationType,
} from "@/lib/types/consumable-operation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useAppFeedback } from "@/components/providers/feedback-provider";
import { getApiClient } from "@/lib/http/client";
import { extractApiErrorMessage } from "@/lib/utils/api-error";

const CONFIG_MAP: Record<ConsumableOperationType, ConsumableActionConfig> =
  CONSUMABLE_ACTION_CONFIGS.reduce(
    (acc, config) => {
      acc[config.id] = config;
      return acc;
    },
    {} as Record<ConsumableOperationType, ConsumableActionConfig>,
  );

const TYPES_USING_QUANTITY: ConsumableOperationType[] = [
  "purchase",
  "inbound",
  "outbound",
  "adjust",
  "dispose",
];
const TYPES_USING_RESERVED: ConsumableOperationType[] = ["reserve", "release"];

const DEFAULT_DELTAS: Record<
  ConsumableOperationType,
  { quantityDelta: number; reservedDelta: number }
> = {
  purchase: { quantityDelta: 1, reservedDelta: 0 },
  inbound: { quantityDelta: 1, reservedDelta: 0 },
  outbound: { quantityDelta: -1, reservedDelta: 0 },
  reserve: { quantityDelta: 0, reservedDelta: 1 },
  release: { quantityDelta: 0, reservedDelta: -1 },
  adjust: { quantityDelta: 0, reservedDelta: 0 },
  dispose: { quantityDelta: -1, reservedDelta: 0 },
};

type Props = {
  consumableId: string;
  locale?: string;
  unit?: string;
};

export default function ConsumableOperationForm({
  consumableId,
  locale = "en",
  unit = "pcs",
}: Props) {
  const router = useRouter();
  const isChinese = locale === "zh";
  const [operationType, setOperationType] =
    useState<ConsumableOperationType>("outbound");
  const [actor, setActor] = useState("");
  const [description, setDescription] = useState("");
  const [quantityDelta, setQuantityDelta] = useState<string>(
    DEFAULT_DELTAS.outbound.quantityDelta.toString(),
  );
  const [reservedDelta, setReservedDelta] = useState<string>(
    DEFAULT_DELTAS.outbound.reservedDelta.toString(),
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const feedback = useAppFeedback();

  const requiresApproval = CONFIG_MAP[operationType]?.requiresApproval ?? false;
  const showQuantity = TYPES_USING_QUANTITY.includes(operationType);
  const showReserved = TYPES_USING_RESERVED.includes(operationType);

  useEffect(() => {
    const defaults = DEFAULT_DELTAS[operationType];
    setQuantityDelta(defaults.quantityDelta.toString());
    setReservedDelta(defaults.reservedDelta.toString());
  }, [operationType]);

  const typeDescription = useMemo(() => {
    if (operationType === "outbound") {
      return isChinese
        ? "记录耗材发放或消耗。"
        : "Track outbound issuance or consumption.";
    }
    if (operationType === "reserve") {
      return isChinese
        ? "为特定项目或人员预留库存。"
        : "Reserve stock for projects or assignees.";
    }
    if (operationType === "release") {
      return isChinese
        ? "释放之前预留的库存。"
        : "Release previously reserved stock.";
    }
    if (operationType === "adjust") {
      return isChinese
        ? "用于盘点差异或纠错调整。"
        : "Adjust stock after inventory or corrections.";
    }
    return undefined;
  }, [isChinese, operationType]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (requiresApproval) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (!actor.trim()) {
        throw new Error(isChinese ? "请填写经办人。" : "Actor is required.");
      }

      const parsedQuantity = showQuantity
        ? Number(quantityDelta || 0)
        : 0;
      const parsedReserved = showReserved ? Number(reservedDelta || 0) : 0;

      if (showQuantity && Number.isNaN(parsedQuantity)) {
        throw new Error(
          isChinese ? "库存变更需输入数字。" : "Quantity delta must be a number.",
        );
      }

      if (showReserved && Number.isNaN(parsedReserved)) {
        throw new Error(
          isChinese
            ? "预留变更需输入数字。"
            : "Reserved delta must be a number.",
        );
      }

      const client = await getApiClient();
      await client.post(`/apps/asset-hub/api/consumables/${consumableId}/operations`, {
        type: operationType,
        actor: actor.trim(),
        description: description.trim(),
        quantityDelta: parsedQuantity,
        reservedDelta: parsedReserved,
      });

      setActor("");
      setDescription("");
      setQuantityDelta(DEFAULT_DELTAS[operationType].quantityDelta.toString());
      setReservedDelta(DEFAULT_DELTAS[operationType].reservedDelta.toString());
      router.refresh();
      feedback.success(isChinese ? "操作已创建" : "Operation created");
    } catch (err) {
      const message = extractApiErrorMessage(
        err,
        isChinese ? "提交失败，请稍后再试。" : "Something went wrong, please retry.",
      );
      setError(message);
      feedback.error(message, {
        blocking: true,
        title: isChinese ? "提交失败" : "Submit failed",
        acknowledgeLabel: isChinese ? "知道了" : "Got it",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const approvalHint = isChinese
    ? "该操作已配置为必须走审批，请在审批中心提交请求。"
    : "This operation requires approval. Please submit a request via the approval center.";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">
          {isChinese ? "操作类型" : "Operation Type"}
        </Label>
        <Select
          value={operationType}
          onValueChange={(value: ConsumableOperationType) =>
            setOperationType(value)
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CONSUMABLE_OPERATION_TYPES.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label[locale === "zh" ? "zh" : "en"]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {typeDescription && (
          <p className="text-xs text-muted-foreground">{typeDescription}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">
          {isChinese ? "经办人" : "Actor"}
        </Label>
        <Input
          value={actor}
          onChange={(event) => setActor(event.target.value)}
          placeholder={isChinese ? "填写经办人姓名" : "Enter actor name"}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">
          {isChinese ? "备注" : "Description"}
        </Label>
        <Textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder={isChinese ? "可选，说明原因" : "Optional notes"}
          rows={3}
        />
      </div>

      {showQuantity && (
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">
            {isChinese ? "库存变更" : "Quantity Delta"}
          </Label>
          <Input
            type="number"
            value={quantityDelta}
            onChange={(event) => setQuantityDelta(event.target.value)}
            placeholder={isChinese ? "例如 -5" : "e.g. -5"}
            step="1"
          />
          <p className="text-xs text-muted-foreground">
            {isChinese
              ? `单位：${unit}，正数表示入库，负数表示出库。`
              : `Unit: ${unit}. Positive adds stock, negative deducts.`}
          </p>
        </div>
      )}

      {showReserved && (
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">
            {isChinese ? "预留变更" : "Reserved Delta"}
          </Label>
          <Input
            type="number"
            value={reservedDelta}
            onChange={(event) => setReservedDelta(event.target.value)}
            placeholder={isChinese ? "例如 5" : "e.g. 5"}
            step="1"
          />
          <p className="text-xs text-muted-foreground">
            {isChinese
              ? "正数表示新增预留，负数表示释放预留。"
              : "Positive values reserve stock, negative values release it."}
          </p>
        </div>
      )}

      {error && (
        <p className="text-xs text-destructive">
          {error}
        </p>
      )}

      {requiresApproval ? (
        <p className="rounded-lg border border-dashed border-amber-300 bg-amber-50/70 p-3 text-xs text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
          {approvalHint}
        </p>
      ) : (
        <Button
          type="submit"
          className="w-full"
          disabled={submitting}
        >
          {submitting
            ? isChinese
              ? "提交中..."
              : "Submitting..."
            : isChinese
              ? "添加操作记录"
              : "Add Operation"}
        </Button>
      )}
    </form>
  );
}
