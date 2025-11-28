"use client";

import { useRouter } from "next/navigation";
import { useState, FormEvent } from "react";
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
import { cn } from "@/lib/utils";
import {
  ASSET_STATUSES,
  getAssetStatusLabel,
} from "@/lib/types/asset";
import type { AssetCategory } from "@/lib/types/asset-category";
import type { Company } from "@/lib/types/system";
import { useAppFeedback } from "@/components/providers/feedback-provider";
import { getApiClient } from "@/lib/http/client";
import { extractApiErrorMessage } from "@/lib/utils/api-error";
import { enUS, zhCN } from "react-day-picker/locale";

type Props = {
  locale?: string;
  categories: AssetCategory[];
  companies: Company[];
};

export default function NewAssetForm({ locale = "en", categories, companies }: Props) {
  const router = useRouter();
  const isChinese = locale === "zh";
  const [purchaseDateOpen, setPurchaseDateOpen] = useState(false);
  const firstCategory = categories[0]?.code ?? "";
  const firstCompany = companies[0]?.code ?? "";
  const [formState, setFormState] = useState({
    name: "",
    category: firstCategory,
    status: ASSET_STATUSES[0],
    companyCode: firstCompany,
    owner: "",
    location: "",
    purchaseDate: new Date().toISOString().slice(0, 10),
  });
  const [submitting, setSubmitting] = useState(false);
  const feedback = useAppFeedback();

  const handleChange = (
    field: keyof typeof formState,
    value: string,
  ) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      const client = await getApiClient();
      const response = await client.post<{ data: { id: string } }>(
        "/apps/asset-hub/api/assets",
        formState,
      );

      router.push(`/${locale}/assets/${response.data.data.id}`);
      router.refresh();
      feedback.success(isChinese ? "资产已创建" : "Asset created");
    } catch (err) {
      const message = extractApiErrorMessage(
        err,
        isChinese ? "提交失败，请稍后再试。" : "Submission failed, please try again later.",
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

  const purchaseDateValue = (() => {
    if (!formState.purchaseDate) return undefined;
    const parsed = new Date(formState.purchaseDate);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  })();

  const categoryReady = formState.category.trim().length > 0;
  const companyReady = formState.companyCode.trim().length > 0;
  const canSubmit = categoryReady && companyReady && companies.length > 0;

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
          <Label htmlFor="asset-company" className="text-sm font-medium text-muted-foreground">
            {isChinese ? "所属公司" : "Company"}
          </Label>
          <Select
            value={formState.companyCode || "none"}
            onValueChange={(value) =>
              handleChange("companyCode", value === "none" ? "" : value)
            }
            disabled={companies.length === 0}
          >
            <SelectTrigger id="asset-company" className="w-full">
              <SelectValue
                placeholder={
                  companies.length === 0
                    ? isChinese
                      ? "请先创建公司"
                      : "Create a company first"
                    : undefined
                }
              />
            </SelectTrigger>
            <SelectContent>
              {companies.length === 0 ? (
                <SelectItem value="none" disabled>
                  {isChinese ? "无可用公司" : "No companies available"}
                </SelectItem>
              ) : (
                companies.map((company) => (
                  <SelectItem key={company.id} value={company.code}>
                    {company.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="asset-category" className="text-sm font-medium text-muted-foreground">
            {isChinese ? "资产类别" : "Category"}
          </Label>
          <Select
            value={formState.category || "none"}
            onValueChange={(value) => handleChange("category", value === "none" ? "" : value)}
            disabled={categories.length === 0}
          >
            <SelectTrigger id="asset-category" className="w-full">
              <SelectValue
                placeholder={
                  categories.length === 0
                    ? isChinese
                      ? "请先创建资产类别"
                      : "Create a category first"
                    : undefined
                }
              />
            </SelectTrigger>
            <SelectContent>
              {categories.length === 0 ? (
                <SelectItem value="none" disabled>
                  {isChinese ? "无可用类别" : "No categories available"}
                </SelectItem>
              ) : (
                categories.map((category) => (
                  <SelectItem key={category.id} value={category.code}>
                    {isChinese ? category.labelZh : category.labelEn}
                  </SelectItem>
                ))
              )}
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
            <SelectTrigger id="asset-status" className="w-full">
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
          <Popover open={purchaseDateOpen} onOpenChange={setPurchaseDateOpen}>
            <PopoverTrigger asChild>
              <Button
                id="asset-purchase-date"
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

      {categories.length === 0 && (
        <p className="rounded-2xl border border-dashed border-amber-400/60 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">
          {isChinese
            ? "当前没有可用的资产类别，请先在“分类管理”页面创建。"
            : "No categories available. Please create one in the category management page first."}
        </p>
      )}
      {companies.length === 0 && (
        <p className="rounded-2xl border border-dashed border-amber-400/60 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">
          {isChinese
            ? "当前没有可用的公司，请先在系统管理中创建公司。"
            : "No companies available. Please create one under System Management first."}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button
          type="submit"
          disabled={submitting || !canSubmit}
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
