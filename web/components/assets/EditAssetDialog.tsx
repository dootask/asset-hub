"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Calendar as CalendarIcon, Pencil } from "lucide-react";
import {
  ASSET_STATUSES,
  DEFAULT_ASSET_CATEGORIES,
  type Asset,
  type AssetStatus,
  getAssetCategoryLabel,
  getAssetStatusLabel,
} from "@/lib/types/asset";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { CreateAssetPayload } from "@/lib/types/asset";

type Props = {
  asset: Asset;
  locale?: string;
};

export default function EditAssetDialog({ asset, locale = "en" }: Props) {
  const isChinese = locale === "zh";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [purchaseDateOpen, setPurchaseDateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formState, setFormState] = useState<CreateAssetPayload>({
    name: asset.name,
    category: asset.category,
    status: asset.status,
    owner: asset.owner,
    location: asset.location,
    purchaseDate: asset.purchaseDate,
  });

  const handleChange = <K extends keyof CreateAssetPayload>(
    field: K,
    value: CreateAssetPayload[K],
  ) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const purchaseDateValue = (() => {
    if (!formState.purchaseDate) return undefined;
    const parsed = new Date(formState.purchaseDate);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  })();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/apps/asset-hub/api/assets/${asset.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formState),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload?.message ?? "更新失败");
      }

      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isChinese
            ? "更新失败，请稍后重试。"
            : "Failed to update asset.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => setOpen(next)}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-full">
          <Pencil className="mr-2 h-3.5 w-3.5" />
          {isChinese ? "编辑信息" : "Edit Info"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isChinese ? "编辑资产信息" : "Edit Asset"}</DialogTitle>
          <DialogDescription>
            {isChinese
              ? "更新资产的基础资料，保存后立即生效。"
              : "Update the asset details. Changes take effect immediately."}
          </DialogDescription>
        </DialogHeader>

        <form id="edit-asset-form" className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-asset-name">
                {isChinese ? "资产名称" : "Asset Name"}
              </Label>
              <Input
                id="edit-asset-name"
                required
                value={formState.name}
                onChange={(event) => handleChange("name", event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-asset-category">
                {isChinese ? "资产类别" : "Category"}
              </Label>
              <Select
                value={formState.category}
                onValueChange={(value) => handleChange("category", value)}
              >
                <SelectTrigger id="edit-asset-category" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEFAULT_ASSET_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {getAssetCategoryLabel(category, locale)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-asset-status">
                {isChinese ? "资产状态" : "Status"}
              </Label>
              <Select
                value={formState.status}
                onValueChange={(value) => handleChange("status", value as AssetStatus)}
              >
                <SelectTrigger id="edit-asset-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSET_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {getAssetStatusLabel(status, locale)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-asset-owner">
                {isChinese ? "使用人 / 部门" : "Owner / Dept"}
              </Label>
              <Input
                id="edit-asset-owner"
                required
                value={formState.owner}
                onChange={(event) => handleChange("owner", event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-asset-location">
                {isChinese ? "存放位置" : "Location"}
              </Label>
              <Input
                id="edit-asset-location"
                required
                value={formState.location}
                onChange={(event) => handleChange("location", event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-asset-purchase-date">
                {isChinese ? "购入日期" : "Purchase Date"}
              </Label>
              <Popover
                open={purchaseDateOpen}
                onOpenChange={setPurchaseDateOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    id="edit-asset-purchase-date"
                    variant="outline"
                    type="button"
                    data-empty={!purchaseDateValue}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !purchaseDateValue && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {purchaseDateValue
                      ? purchaseDateValue.toLocaleDateString(
                          isChinese ? "zh-CN" : "en-US",
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          },
                        )
                      : isChinese
                        ? "选择日期"
                        : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={purchaseDateValue}
                    initialFocus
                    onSelect={(date: Date | undefined) => {
                      if (!date) return;
                      handleChange("purchaseDate", date.toISOString().slice(0, 10));
                      setPurchaseDateOpen(false);
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
        </form>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={submitting}
          >
            {isChinese ? "取消" : "Cancel"}
          </Button>
          <Button
            type="submit"
            form="edit-asset-form"
            disabled={submitting}
            className="rounded-2xl"
          >
            {submitting
              ? isChinese
                ? "保存中..."
                : "Saving..."
              : isChinese
                ? "保存变更"
                : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

