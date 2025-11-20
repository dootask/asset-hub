"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { AssetOperationType, OPERATION_TYPES } from "@/lib/types/operation";

type OperationMode = "simple" | "receive" | "borrow" | "return" | "maintenance";

const MODE_FORM_MAP: Record<OperationMode, { type: AssetOperationType }> = {
  simple: { type: "other" },
  receive: { type: "receive" },
  borrow: { type: "borrow" },
  return: { type: "return" },
  maintenance: { type: "maintenance" },
};

type Props = {
  assetId: string;
  locale?: string;
};

export default function OperationForm({ assetId, locale = "en" }: Props) {
  const router = useRouter();
  const isChinese = locale === "zh";
  const [mode, setMode] = useState<OperationMode>("simple");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [borrowStartOpen, setBorrowStartOpen] = useState(false);
  const [borrowEndOpen, setBorrowEndOpen] = useState(false);

  const [formState, setFormState] = useState({
    type: MODE_FORM_MAP.simple.type,
    actor: "",
    description: "",
    receiver: "",
    borrower: "",
    returner: "",
    vendor: "",
    cost: "",
    startDate: "",
    endDate: "",
    expectedReturnDate: "",
  });

  const currentTypeOptions = useMemo(() => {
    if (mode === "simple") {
      return OPERATION_TYPES;
    }
    return OPERATION_TYPES.filter((item) => item.value === MODE_FORM_MAP[mode].type);
  }, [mode]);

  const formatDateLabel = (value?: Date) => {
    if (!value) {
      return isChinese ? "选择日期" : "Pick a date";
    }
    return value.toLocaleDateString(isChinese ? "zh-CN" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const computedActor =
        formState.actor.trim() ||
        formState.receiver.trim() ||
        formState.borrower.trim() ||
        formState.returner.trim();

      if (!computedActor) {
        throw new Error(
          isChinese
            ? "请填写经办人或相关责任人。"
            : "Please provide an actor for the operation.",
        );
      }

      const metadataSource = {
        receiver: formState.receiver.trim() || undefined,
        borrower: formState.borrower.trim() || undefined,
        returner: formState.returner.trim() || undefined,
        vendor: formState.vendor.trim() || undefined,
        cost: formState.cost ? Number(formState.cost) : undefined,
        startDate: formState.startDate || undefined,
        endDate: formState.endDate || undefined,
        expectedReturnDate: formState.expectedReturnDate || undefined,
        mode,
      };

      const metadataEntries = Object.entries(metadataSource).filter(
        ([, value]) => value !== undefined && value !== "" && value !== null,
      );

      const metadata =
        metadataEntries.length > 0 ? Object.fromEntries(metadataEntries) : undefined;

      const payload = {
        type:
          mode === "simple" ? (formState.type as AssetOperationType) : MODE_FORM_MAP[mode].type,
        actor: computedActor,
        description: formState.description,
        metadata,
      };

      const response = await fetch(`/apps/asset-hub/api/assets/${assetId}/operations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload?.message ?? "提交失败");
      }

      setFormState({
        type: MODE_FORM_MAP[mode].type,
        actor: "",
        description: "",
        receiver: "",
        borrower: "",
        returner: "",
        vendor: "",
        cost: "",
        startDate: "",
        endDate: "",
        expectedReturnDate: "",
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

  const renderModeFields = () => {
    switch (mode) {
      case "receive":
        return (
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              {isChinese ? "领用人" : "Receiver"}
            </Label>
            <Input
              value={formState.receiver}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, receiver: event.target.value }))
              }
              required
            />
          </div>
        );
      case "borrow": {
        const borrowStartValue = formState.startDate ? new Date(formState.startDate) : undefined;
        const borrowEndValue = formState.endDate ? new Date(formState.endDate) : undefined;

        return (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">
                {isChinese ? "借用人" : "Borrower"}
              </Label>
              <Input
                value={formState.borrower}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, borrower: event.target.value }))
                }
                required
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  {isChinese ? "开始日期" : "Start Date"}
                </Label>
                <Popover open={borrowStartOpen} onOpenChange={setBorrowStartOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      type="button"
                      data-empty={!borrowStartValue}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !borrowStartValue && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-1 h-4 w-4" />
                      <div className="truncate">
                        {formatDateLabel(borrowStartValue)}
                      </div>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={borrowStartValue}
                      initialFocus
                      onSelect={(date) => {
                        if (!date) return;
                        setFormState((prev) => ({
                          ...prev,
                          startDate: date.toISOString().slice(0, 10),
                        }));
                        setBorrowStartOpen(false);
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  {isChinese ? "归还日期" : "Due Date"}
                </Label>
                <Popover open={borrowEndOpen} onOpenChange={setBorrowEndOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      type="button"
                      data-empty={!borrowEndValue}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !borrowEndValue && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-1 h-4 w-4" />
                      <div className="truncate">
                        {formatDateLabel(borrowEndValue)}
                      </div>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={borrowEndValue}
                      initialFocus
                      onSelect={(date) => {
                        if (!date) return;
                        setFormState((prev) => ({
                          ...prev,
                          endDate: date.toISOString().slice(0, 10),
                        }));
                        setBorrowEndOpen(false);
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </>
        );
      }
      case "return":
        return (
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              {isChinese ? "归还人" : "Returner"}
            </Label>
            <Input
              value={formState.returner}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, returner: event.target.value }))
              }
              required
            />
          </div>
        );
      case "maintenance":
        return (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">
                {isChinese ? "供应商/执行人" : "Vendor"}
              </Label>
              <Input
                value={formState.vendor}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, vendor: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">
                {isChinese ? "费用（可选）" : "Cost"}
              </Label>
              <Input
                type="number"
                value={formState.cost}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, cost: event.target.value }))
                }
              />
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border bg-muted/40 p-4">

      <div className="flex items-center gap-3">
        <div className="flex-1 space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">
            {isChinese ? "操作模式" : "Operation Mode"}
          </Label>
          <Select value={mode} onValueChange={(value) => setMode(value as OperationMode)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="simple">
                {isChinese ? "自定义" : "Custom"}
              </SelectItem>
              <SelectItem value="receive">
                {isChinese ? "领用" : "Receive"}
              </SelectItem>
              <SelectItem value="borrow">
                {isChinese ? "借用" : "Borrow"}
              </SelectItem>
              <SelectItem value="return">
                {isChinese ? "归还" : "Return"}
              </SelectItem>
              <SelectItem value="maintenance">
                {isChinese ? "维护" : "Maintenance"}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {mode === "simple" && (
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              {isChinese ? "操作类型" : "Operation Type"}
            </Label>
            <Select
              value={formState.type}
              onValueChange={(value) =>
                setFormState((prev) => ({ ...prev, type: value as AssetOperationType }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currentTypeOptions.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {isChinese ? type.label.zh : type.label.en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">
          {isChinese ? "经办人" : "Actor"}
        </Label>
        <Input
          required
          value={formState.actor}
          onChange={(event) =>
            setFormState((prev) => ({ ...prev, actor: event.target.value }))
          }
        />
      </div>

      {renderModeFields()}

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">
          {isChinese ? "说明" : "Description"}
        </Label>
        <Textarea
          rows={3}
          value={formState.description}
          onChange={(event) =>
            setFormState((prev) => ({ ...prev, description: event.target.value }))
          }
        />
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <Button type="submit" disabled={submitting} className="rounded-2xl px-4 py-2 text-sm">
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

