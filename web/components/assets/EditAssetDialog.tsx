"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Calendar as CalendarIcon, Pencil } from "lucide-react";
import {
  ASSET_STATUSES,
  type Asset,
  type AssetStatus,
  getAssetStatusLabel,
} from "@/lib/types/asset";
import type { AssetCategory } from "@/lib/types/asset-category";
import type { Company } from "@/lib/types/system";
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
  DialogBody,
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
import { useAppFeedback } from "@/components/providers/feedback-provider";
import { getApiClient } from "@/lib/http/client";
import { extractApiErrorMessage } from "@/lib/utils/api-error";
import { enUS, zhCN } from "react-day-picker/locale";

type Props = {
  asset: Asset;
  locale?: string;
  categories: AssetCategory[];
  companies: Company[];
};

export default function EditAssetDialog({ asset, locale = "en", categories, companies }: Props) {
  const isChinese = locale === "zh";
  const categoryOptions = categories.map((category) => ({
    id: category.id,
    code: category.code,
    label: isChinese ? category.labelZh : category.labelEn,
    fallbackLabel: isChinese ? category.labelEn : category.labelZh,
  }));

  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [purchaseDateOpen, setPurchaseDateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formState, setFormState] = useState<CreateAssetPayload>({
    name: asset.name,
    category: asset.category,
    status: asset.status,
    companyCode: asset.companyCode ?? companies[0]?.code ?? "",
    owner: asset.owner,
    location: asset.location,
    purchaseDate: asset.purchaseDate,
  });
  const feedback = useAppFeedback();

  const currentCategory = categoryOptions.find(
    (entry) => entry.code === formState.category,
  );
  const companyOptions = companies.map((company) => ({
    id: company.id,
    code: company.code,
    label: company.name,
  }));
  const currentCompany =
    companyOptions.find((entry) => entry.code === formState.companyCode) ??
    (formState.companyCode
      ? [
          {
            id: "unknown-company",
            code: formState.companyCode,
            label: formState.companyCode,
          },
        ]
      : [])[0];
  const selectCompanyOptions =
    currentCompany && !companyOptions.some((entry) => entry.code === currentCompany.code)
      ? [...companyOptions, currentCompany]
      : companyOptions;
  const selectOptions =
    currentCategory || !formState.category
      ? categoryOptions
      : [
          ...categoryOptions,
          {
            id: "unknown",
            code: formState.category,
            label: formState.category,
            fallbackLabel: "",
          },
        ];

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

    try {
      const client = await getApiClient();
      await client.put(`/apps/asset-hub/api/assets/${asset.id}`, formState);

      setOpen(false);
      router.refresh();
      feedback.success(isChinese ? "资产已更新" : "Asset updated");
    } catch (err) {
      const message = extractApiErrorMessage(
        err,
        isChinese ? "更新失败，请稍后重试。" : "Failed to update asset.",
      );
      feedback.error(message, {
        blocking: true,
        title: isChinese ? "更新失败" : "Update failed",
        acknowledgeLabel: isChinese ? "知道了" : "Got it",
      });
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isChinese ? "编辑资产信息" : "Edit Asset"}</DialogTitle>
          <DialogDescription>
            {isChinese
              ? "更新资产的基础资料，保存后立即生效。"
              : "Update the asset details. Changes take effect immediately."}
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
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
                  disabled={selectOptions.length === 0}
                >
                  <SelectTrigger id="edit-asset-category" className="w-full">
                    <SelectValue
                      placeholder={
                        selectOptions.length === 0
                          ? isChinese
                            ? "暂无类别"
                            : "No categories"
                          : undefined
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {selectOptions.length === 0 ? (
                      <SelectItem value="" disabled>
                        {isChinese ? "无可用类别" : "No categories available"}
                      </SelectItem>
                    ) : (
                      selectOptions.map((category) => (
                        <SelectItem key={category.id} value={category.code}>
                          <span className="font-medium">{category.label}</span>
                          {category.fallbackLabel && (
                            <span className="ml-1 text-xs text-muted-foreground">
                              {category.fallbackLabel}
                            </span>
                          )}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-asset-company">
                  {isChinese ? "所属公司" : "Company"}
                </Label>
                <Select
                  value={formState.companyCode}
                  onValueChange={(value) => handleChange("companyCode", value)}
                  disabled={selectCompanyOptions.length === 0}
                >
                  <SelectTrigger id="edit-asset-company" className="w-full">
                    <SelectValue
                      placeholder={
                        selectCompanyOptions.length === 0
                          ? isChinese
                            ? "暂无公司"
                            : "No companies"
                          : undefined
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {selectCompanyOptions.length === 0 ? (
                      <SelectItem value="" disabled>
                        {isChinese ? "无可用公司" : "No companies available"}
                      </SelectItem>
                    ) : (
                      selectCompanyOptions.map((company) => (
                        <SelectItem key={company.id} value={company.code}>
                          {company.label}
                        </SelectItem>
                      ))
                    )}
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
                      <CalendarIcon className="mr-1 h-4 w-4" />
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
                      locale={isChinese ? zhCN : enUS}
                      captionLayout="dropdown"
                      weekStartsOn={0}
                      startMonth={new Date(new Date().getFullYear() - 5, 0)}
                      endMonth={new Date(new Date().getFullYear() + 5, 11)}
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

          </form>
        </DialogBody>

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
