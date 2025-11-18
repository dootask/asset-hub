"use client";

import { useRouter } from "next/navigation";
import { useState, FormEvent } from "react";
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
import { ASSET_STATUSES, DEFAULT_ASSET_CATEGORIES } from "@/lib/types/asset";

type Props = {
  locale?: string;
};

export default function NewAssetForm({ locale = "en" }: Props) {
  const router = useRouter();
  const isChinese = locale === "zh";

  const [formState, setFormState] = useState({
    name: "",
    category: DEFAULT_ASSET_CATEGORIES[0],
    status: ASSET_STATUSES[0],
    owner: "",
    location: "",
    purchaseDate: new Date().toISOString().slice(0, 10),
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    field: keyof typeof formState,
    value: string,
  ) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/apps/asset-hub/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formState),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(
          payload?.message ??
            (isChinese ? "提交失败" : "Submission failed"),
        );
      }

      const payload = await response.json();
      router.push(`/${locale}/assets/${payload.data.id}`);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "提交失败，请稍后再试。",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="asset-name" className="text-sm font-medium text-muted-foreground">
            {isChinese ? "资产名称" : "Asset Name"}
          </Label>
          <Input
            id="asset-name"
            required
            value={formState.name}
            onChange={(event) => handleChange("name", event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="asset-category" className="text-sm font-medium text-muted-foreground">
            {isChinese ? "资产类别" : "Category"}
          </Label>
          <Select
            value={formState.category}
            onValueChange={(value) => handleChange("category", value)}
          >
            <SelectTrigger id="asset-category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DEFAULT_ASSET_CATEGORIES.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="asset-status" className="text-sm font-medium text-muted-foreground">
            {isChinese ? "资产状态" : "Status"}
          </Label>
          <Select
            value={formState.status}
            onValueChange={(value) => handleChange("status", value)}
          >
            <SelectTrigger id="asset-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ASSET_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="asset-owner" className="text-sm font-medium text-muted-foreground">
            {isChinese ? "使用人 / 部门" : "Owner / Dept"}
          </Label>
          <Input
            id="asset-owner"
            required
            value={formState.owner}
            onChange={(event) => handleChange("owner", event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="asset-location" className="text-sm font-medium text-muted-foreground">
            {isChinese ? "存放位置" : "Location"}
          </Label>
          <Input
            id="asset-location"
            required
            value={formState.location}
            onChange={(event) => handleChange("location", event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="asset-purchase-date" className="text-sm font-medium text-muted-foreground">
            {isChinese ? "购入日期" : "Purchase Date"}
          </Label>
          <Input
            id="asset-purchase-date"
            type="date"
            required
            value={formState.purchaseDate}
            onChange={(event) =>
              handleChange("purchaseDate", event.target.value)
            }
          />
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button
          type="submit"
          disabled={submitting}
          className="rounded-2xl px-5 py-2 text-sm shadow disabled:opacity-60"
        >
          {submitting
            ? isChinese
              ? "提交中..."
              : "Submitting..."
            : isChinese
              ? "创建资产"
              : "Create Asset"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={submitting}
          onClick={() => router.back()}
          className="rounded-2xl px-4 py-2 text-sm"
        >
          {isChinese ? "取消" : "Cancel"}
        </Button>
      </div>
    </form>
  );
}

